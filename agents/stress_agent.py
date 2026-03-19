"""
Stress Agent - Monitors plant health, detects issues, and triggers responses.
Includes visual disease detection via Bedrock Nova and CRITICAL severity events.
"""

import json
import logging
import os
from datetime import datetime, timezone

from strands import Agent, tool
from strands.models import BedrockModel

from agents.appsync_client import execute_graphql, get_runtime_region
from agents.tools.sensor_tools import get_latest_sensor_reading, get_sensor_history
from agents.tools.kb_tools import query_knowledge_base, get_plant_stress_guide

logger = logging.getLogger(__name__)
AWS_REGION = get_runtime_region()

# Plant stress indicators
STRESS_INDICATORS = {
    "yellow_leaves": ["nitrogen_deficiency", "over_watering", "light_stress"],
    "wilting": ["water_stress", "root_rot", "temperature_stress"],
    "brown_spots": ["fungal_infection", "nutrient_burn", "salt_buildup"],
    "stunted_growth": ["nutrient_deficiency", "root_bound", "light_deficiency"],
    "leaf_curl": ["heat_stress", "pest_infestation", "virus"],
    "purple_stems": ["phosphorus_deficiency", "cold_stress"],
}

# Stress severity levels
SEVERITY_LEVELS = {
    "mild": {"action": "monitor", "response_time": "24h"},
    "moderate": {"action": "adjust", "response_time": "6h"},
    "severe": {"action": "emergency", "response_time": "1h"},
    "critical": {"action": "isolate", "response_time": "immediate"},
}

# GraphQL for writing agent events
CREATE_AGENT_EVENT = """
mutation CreateAgentEvent($input: CreateAgentEventInput!) {
  createAgentEvent(input: $input) {
    id
  }
}
"""


@tool
def analyze_plant_health(sensor_data: dict) -> str:
    """Analyze sensor data for plant stress indicators.

    Args:
        sensor_data: Dictionary of sensor readings

    Returns:
        JSON with health analysis and stress indicators.
    """
    try:
        analysis = {
            "timestamp": datetime.now(timezone.utc).isoformat().replace("+00:00", "Z"),
            "overall_health": "healthy",
            "stress_indicators": [],
            "recommendations": [],
            "severity": "none",
        }

        stress_factors = []

        # Temperature stress
        temp = sensor_data.get("temperature")
        if temp is not None:
            if temp < 18 or temp > 28:
                stress_factors.append({
                    "type": "temperature_stress",
                    "severity": "critical" if temp < 10 or temp > 35 else "severe" if temp < 15 or temp > 30 else "moderate",
                    "value": temp,
                    "optimal": "18-28°C",
                })

        # Humidity stress
        humidity = sensor_data.get("humidity")
        if humidity is not None:
            if humidity < 50 or humidity > 80:
                stress_factors.append({
                    "type": "humidity_stress",
                    "severity": "critical" if humidity < 30 or humidity > 95 else "severe" if humidity < 40 or humidity > 85 else "moderate",
                    "value": humidity,
                    "optimal": "60-70%",
                })

        # Nutrient stress (EC)
        ec = sensor_data.get("nutrientEc")
        if ec is not None:
            if ec < 1.0 or ec > 3.0:
                stress_factors.append({
                    "type": "nutrient_stress",
                    "severity": "critical" if ec < 0.3 or ec > 4.5 else "severe" if ec < 0.5 or ec > 3.5 else "moderate",
                    "value": ec,
                    "optimal": "1.5-2.5 mS/cm",
                })

        # pH stress
        ph = sensor_data.get("phLevel")
        if ph is not None:
            if ph < 5.5 or ph > 7.0:
                stress_factors.append({
                    "type": "ph_stress",
                    "severity": "critical" if ph < 4.5 or ph > 8.0 else "severe" if ph < 5.0 or ph > 7.5 else "moderate",
                    "value": ph,
                    "optimal": "5.8-6.5",
                })

        # Light stress
        light = sensor_data.get("lightPpfd")
        if light is not None:
            if light < 200 or light > 600:
                stress_factors.append({
                    "type": "light_stress",
                    "severity": "critical" if light < 50 or light > 800 else "severe" if light < 100 or light > 700 else "moderate",
                    "value": light,
                    "optimal": "300-500 µmol/m²/s",
                })

        if stress_factors:
            analysis["stress_indicators"] = stress_factors

            severities = [factor["severity"] for factor in stress_factors]
            if "critical" in severities:
                analysis["overall_health"] = "critical"
                analysis["severity"] = "critical"
            elif "severe" in severities:
                analysis["overall_health"] = "stressed"
                analysis["severity"] = "severe"
            elif "moderate" in severities:
                analysis["overall_health"] = "monitoring"
                analysis["severity"] = "moderate"
            else:
                analysis["overall_health"] = "healthy"
                analysis["severity"] = "mild"

        # Generate recommendations
        for factor in stress_factors:
            if factor["type"] == "temperature_stress":
                analysis["recommendations"].append(
                    f"{'Increase' if factor['value'] < 18 else 'Decrease'} temperature to 22°C"
                )
            elif factor["type"] == "humidity_stress":
                analysis["recommendations"].append(
                    f"{'Increase' if factor['value'] < 50 else 'Decrease'} humidity to 65%"
                )
            elif factor["type"] == "nutrient_stress":
                analysis["recommendations"].append(
                    "Increase nutrient concentration" if factor["value"] < 1.0
                    else "Flush system with fresh water"
                )
            elif factor["type"] == "ph_stress":
                analysis["recommendations"].append(
                    "Add pH up solution" if factor["value"] < 5.5 else "Add pH down solution"
                )
            elif factor["type"] == "light_stress":
                analysis["recommendations"].append(
                    "Increase lighting intensity" if factor["value"] < 200
                    else "Decrease lighting intensity"
                )

        logger.info("Plant health analysis complete")
        return json.dumps(analysis)

    except Exception as e:
        logger.error("Failed to analyze plant health: %s", e)
        return json.dumps({"error": str(e)})


@tool
def analyze_crop_image(s3_bucket: str, s3_key: str) -> str:
    """Analyze a crop image from S3 using Bedrock Nova for visual disease detection.

    Reads an image from the specified S3 location and sends it to
    Amazon Bedrock Nova for visual analysis of plant health, disease,
    and stress indicators.

    Args:
        s3_bucket: S3 bucket name containing the crop image
        s3_key: S3 object key (path) to the image file

    Returns:
        JSON with visual analysis results including detected issues.
    """
    try:
        import boto3

        # Read image from S3
        s3_client = boto3.client("s3", region_name=AWS_REGION)
        response = s3_client.get_object(Bucket=s3_bucket, Key=s3_key)
        image_bytes = response["Body"].read()
        content_type = response.get("ContentType", "image/jpeg")

        # Determine media type for Bedrock
        media_type = "image/jpeg"
        if s3_key.lower().endswith(".png"):
            media_type = "image/png"
        elif s3_key.lower().endswith(".webp"):
            media_type = "image/webp"

        # Call Bedrock Nova for visual analysis
        import base64
        bedrock = boto3.client("bedrock-runtime", region_name=AWS_REGION)

        nova_request = {
            "modelId": "us.amazon.nova-lite-v1:0",
            "contentType": "application/json",
            "accept": "application/json",
            "body": json.dumps({
                "messages": [
                    {
                        "role": "user",
                        "content": [
                            {
                                "image": {
                                    "format": media_type.split("/")[1],
                                    "source": {
                                        "bytes": base64.b64encode(image_bytes).decode("utf-8"),
                                    },
                                },
                            },
                            {
                                "text": (
                                    "You are an expert plant pathologist. Analyze this greenhouse crop image and identify:\n"
                                    "1. Plant species if identifiable\n"
                                    "2. Any visible diseases, infections, or stress symptoms\n"
                                    "3. Severity (mild, moderate, severe, critical)\n"
                                    "4. Recommended treatment actions\n"
                                    "5. Whether this is a Mars greenhouse emergency\n\n"
                                    "Return your analysis as structured JSON."
                                ),
                            },
                        ],
                    }
                ],
                "inferenceConfig": {"maxNewTokens": 1024, "temperature": 0.2},
            }),
        }

        bedrock_response = bedrock.invoke_model(**nova_request)
        result_body = json.loads(bedrock_response["body"].read())

        # Extract analysis text
        analysis_text = ""
        if "output" in result_body and "message" in result_body["output"]:
            for content in result_body["output"]["message"].get("content", []):
                if "text" in content:
                    analysis_text += content["text"]

        return json.dumps({
            "source": f"s3://{s3_bucket}/{s3_key}",
            "model": "amazon-nova-lite",
            "analysis": analysis_text,
            "timestamp": datetime.now(timezone.utc).isoformat().replace("+00:00", "Z"),
        })

    except Exception as e:
        logger.error("Failed to analyze crop image: %s", e)
        return json.dumps({
            "error": str(e),
            "source": f"s3://{s3_bucket}/{s3_key}" if s3_bucket and s3_key else "unknown",
        })


@tool
def diagnose_stress_symptoms(symptoms: list) -> str:
    """Diagnose plant stress based on observed symptoms.

    Args:
        symptoms: List of observed symptoms (yellow_leaves, wilting, etc.)

    Returns:
        JSON with diagnosis and treatment recommendations.
    """
    try:
        diagnosis = {
            "timestamp": datetime.now(timezone.utc).isoformat().replace("+00:00", "Z"),
            "symptoms": symptoms,
            "possible_causes": [],
            "confidence": 0.0,
            "treatment_plan": [],
        }

        all_causes = []
        for symptom in symptoms:
            if symptom in STRESS_INDICATORS:
                all_causes.extend(STRESS_INDICATORS[symptom])

        cause_counts = {}
        for cause in all_causes:
            cause_counts[cause] = cause_counts.get(cause, 0) + 1

        sorted_causes = sorted(cause_counts.items(), key=lambda x: x[1], reverse=True)

        diagnosis["possible_causes"] = [
            {"cause": cause, "frequency": count}
            for cause, count in sorted_causes[:3]
        ]

        if sorted_causes:
            top_cause_freq = sorted_causes[0][1]
            total_symptoms = len(symptoms)
            diagnosis["confidence"] = min(1.0, top_cause_freq / total_symptoms)

        # Query knowledge base
        if symptoms:
            symptom_text = ", ".join(symptoms)
            kb_query = f"Treatment for plant stress symptoms: {symptom_text} in Martian greenhouse"
            kb_result = query_knowledge_base(kb_query)
            try:
                kb_data = json.loads(kb_result)
                if "error" not in kb_data:
                    diagnosis["knowledge_base_advice"] = kb_data
            except (json.JSONDecodeError, TypeError):
                pass

        # Generate treatment plan
        if diagnosis["possible_causes"]:
            top_cause = diagnosis["possible_causes"][0]["cause"]

            if "deficiency" in top_cause:
                diagnosis["treatment_plan"].append("Supplement with appropriate nutrient")
                diagnosis["treatment_plan"].append("Adjust nutrient solution EC")
            if "infection" in top_cause or "fungal" in top_cause:
                diagnosis["treatment_plan"].append("Apply appropriate fungicide")
                diagnosis["treatment_plan"].append("Improve air circulation")
                diagnosis["treatment_plan"].append("Reduce humidity")
            if "stress" in top_cause:
                diagnosis["treatment_plan"].append("Adjust environmental conditions")
                diagnosis["treatment_plan"].append("Monitor closely for 24h")
            if "pest" in top_cause:
                diagnosis["treatment_plan"].append("Apply integrated pest management")
                diagnosis["treatment_plan"].append("Introduce beneficial insects if available")
                diagnosis["treatment_plan"].append("Isolate affected plants")

        logger.info("Stress diagnosis complete for symptoms: %s", symptoms)
        return json.dumps(diagnosis)

    except Exception as e:
        logger.error("Failed to diagnose stress symptoms: %s", e)
        return json.dumps({"error": str(e)})


@tool
def trigger_stress_response(severity: str, cause: str, zone: str) -> str:
    """Trigger appropriate response for plant stress and write AgentEvent.

    When severity is CRITICAL, writes a CRITICAL AgentEvent to DynamoDB
    so the dashboard displays the emergency immediately.

    Args:
        severity: Stress severity (mild, moderate, severe, critical)
        cause: Identified cause of stress
        zone: Affected greenhouse zone

    Returns:
        JSON with response actions taken.
    """
    try:
        response_level = SEVERITY_LEVELS.get(severity, SEVERITY_LEVELS["moderate"])

        response = {
            "timestamp": datetime.now(timezone.utc).isoformat().replace("+00:00", "Z"),
            "severity": severity,
            "cause": cause,
            "zone": zone,
            "response_level": response_level["action"],
            "response_time": response_level["response_time"],
            "actions_taken": [],
            "monitoring_plan": [],
        }

        if severity in ["severe", "critical"]:
            response["actions_taken"].append(f"Isolate zone {zone}")
            response["actions_taken"].append("Alert human operator")
            response["actions_taken"].append("Initiate emergency protocols")

        if "deficiency" in cause:
            response["actions_taken"].append("Adjust nutrient solution")
            response["actions_taken"].append("Supplement specific nutrient")
        if "stress" in cause:
            response["actions_taken"].append("Adjust environmental conditions")
            response["actions_taken"].append("Reduce plant load if necessary")
        if "infection" in cause or "fungal" in cause:
            response["actions_taken"].append("Apply treatment")
            response["actions_taken"].append("Increase air circulation")
            response["actions_taken"].append("Reduce humidity")

        # Monitoring plan
        if severity == "critical":
            response["monitoring_plan"] = ["Continuous monitoring", "Hourly sensor checks", "Daily visual inspection"]
        elif severity == "severe":
            response["monitoring_plan"] = ["Check every 4 hours", "Daily sensor analysis"]
        elif severity == "moderate":
            response["monitoring_plan"] = ["Check twice daily", "Monitor for changes"]
        else:
            response["monitoring_plan"] = ["Daily check", "Monitor trends"]

        # Write AgentEvent to DynamoDB — CRITICAL and severe get written immediately
        if severity in ["critical", "severe"]:
            import uuid
            event_severity = "CRITICAL" if severity == "critical" else "WARN"
            event_input = {
                "id": str(uuid.uuid4()),
                "agentId": "stress-agent",
                "severity": event_severity,
                "message": f"Plant stress detected in zone {zone}: {cause} (severity: {severity})",
                "actionTaken": "; ".join(response["actions_taken"]),
                "timestamp": datetime.now(timezone.utc).isoformat().replace("+00:00", "Z"),
            }
            try:
                execute_graphql(CREATE_AGENT_EVENT, {"input": event_input})
                response["agent_event_written"] = True
                response["agent_event_id"] = event_input["id"]
                logger.info("CRITICAL AgentEvent written for zone %s: %s", zone, cause)
            except Exception as e:
                logger.error("Failed to write AgentEvent: %s", e)
                response["agent_event_written"] = False
                response["agent_event_error"] = str(e)

        logger.info("Stress response triggered: %s - %s in zone %s", severity, cause, zone)
        return json.dumps(response)

    except Exception as e:
        logger.error("Failed to trigger stress response: %s", e)
        return json.dumps({"error": str(e)})


def build_system_prompt() -> str:
    """Build the system prompt for the stress agent."""
    return """You are the Plant Stress Detection Agent for a Martian greenhouse.

BE CONCISE. Return structured JSON data only. No markdown tables, no lengthy prose.
Maximum response length: 300 words.

Workflow:
1. Read sensor data → call analyze_plant_health
2. If stress detected → call diagnose_stress_symptoms
3. If severity >= severe → call trigger_stress_response (writes CRITICAL AgentEvent)
4. Return a short JSON summary

CRITICAL thresholds: temp <10°C or >35°C, pH <4.5 or >8.0, EC <0.3 or >4.5

Do NOT generate long reports. Just identify issues and trigger responses.
"""


def run_stress_agent(greenhouse_id: str = "mars-greenhouse-1") -> str:
    """Compatibility wrapper for the new Crop Health Agent."""
    from agents.crop_health_agent import run_crop_health_agent

    return run_crop_health_agent(greenhouse_id=greenhouse_id)


if __name__ == "__main__":
    import sys
    greenhouse_id = sys.argv[1] if len(sys.argv) > 1 else "mars-greenhouse-1"
    print(run_stress_agent(greenhouse_id))
