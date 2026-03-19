"""
Stress Agent - Monitors plant health, detects issues, and triggers responses.
"""

import json
import logging
from datetime import datetime

from strands import Agent, tool
from strands.models import BedrockModel

from agents.appsync_client import get_runtime_region
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
            "timestamp": datetime.utcnow().isoformat() + "Z",
            "overall_health": "healthy",
            "stress_indicators": [],
            "recommendations": [],
            "severity": "none",
        }
        
        # Check environmental stress factors
        stress_factors = []
        
        # Temperature stress
        temp = sensor_data.get("temperature")
        if temp is not None:
            if temp < 18 or temp > 28:
                stress_factors.append({
                    "type": "temperature_stress",
                    "severity": "severe" if temp < 15 or temp > 30 else "moderate",
                    "value": temp,
                    "optimal": "18-28°C",
                })
        
        # Humidity stress
        humidity = sensor_data.get("humidity")
        if humidity is not None:
            if humidity < 50 or humidity > 80:
                stress_factors.append({
                    "type": "humidity_stress",
                    "severity": "severe" if humidity < 40 or humidity > 85 else "moderate",
                    "value": humidity,
                    "optimal": "60-70%",
                })
        
        # Nutrient stress (EC)
        ec = sensor_data.get("nutrientEc")
        if ec is not None:
            if ec < 1.0 or ec > 3.0:
                stress_factors.append({
                    "type": "nutrient_stress",
                    "severity": "severe" if ec < 0.5 or ec > 3.5 else "moderate",
                    "value": ec,
                    "optimal": "1.5-2.5 mS/cm",
                })
        
        # pH stress
        ph = sensor_data.get("phLevel")
        if ph is not None:
            if ph < 5.5 or ph > 7.0:
                stress_factors.append({
                    "type": "ph_stress",
                    "severity": "severe" if ph < 5.0 or ph > 7.5 else "moderate",
                    "value": ph,
                    "optimal": "5.8-6.5",
                })
        
        # Light stress
        light = sensor_data.get("lightPpfd")
        if light is not None:
            if light < 200 or light > 600:
                stress_factors.append({
                    "type": "light_stress",
                    "severity": "severe" if light < 100 or light > 700 else "moderate",
                    "value": light,
                    "optimal": "300-500 µmol/m²/s",
                })
        
        if stress_factors:
            analysis["stress_indicators"] = stress_factors
            
            # Determine overall severity
            severities = [factor["severity"] for factor in stress_factors]
            if "severe" in severities or "critical" in severities:
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
                if factor["value"] < 18:
                    analysis["recommendations"].append("Increase temperature to 22°C")
                else:
                    analysis["recommendations"].append("Decrease temperature to 22°C")
            
            elif factor["type"] == "humidity_stress":
                if factor["value"] < 50:
                    analysis["recommendations"].append("Increase humidity to 65%")
                else:
                    analysis["recommendations"].append("Decrease humidity to 65%")
            
            elif factor["type"] == "nutrient_stress":
                if factor["value"] < 1.0:
                    analysis["recommendations"].append("Increase nutrient concentration")
                else:
                    analysis["recommendations"].append("Flush system with fresh water")
            
            elif factor["type"] == "ph_stress":
                if factor["value"] < 5.5:
                    analysis["recommendations"].append("Add pH up solution")
                else:
                    analysis["recommendations"].append("Add pH down solution")
            
            elif factor["type"] == "light_stress":
                if factor["value"] < 200:
                    analysis["recommendations"].append("Increase lighting intensity")
                else:
                    analysis["recommendations"].append("Decrease lighting intensity")
        
        logger.info("Plant health analysis complete")
        return json.dumps(analysis)
    
    except Exception as e:
        logger.error("Failed to analyze plant health: %s", e)
        return json.dumps({"error": str(e)})


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
            "timestamp": datetime.utcnow().isoformat() + "Z",
            "symptoms": symptoms,
            "possible_causes": [],
            "confidence": 0.0,
            "treatment_plan": [],
        }
        
        # Find possible causes for each symptom
        all_causes = []
        for symptom in symptoms:
            if symptom in STRESS_INDICATORS:
                causes = STRESS_INDICATORS[symptom]
                all_causes.extend(causes)
        
        # Count occurrences to find most likely cause
        cause_counts = {}
        for cause in all_causes:
            cause_counts[cause] = cause_counts.get(cause, 0) + 1
        
        # Sort by frequency
        sorted_causes = sorted(cause_counts.items(), key=lambda x: x[1], reverse=True)
        
        diagnosis["possible_causes"] = [
            {"cause": cause, "frequency": count}
            for cause, count in sorted_causes[:3]
        ]
        
        # Calculate confidence based on symptom-cause matches
        if sorted_causes:
            top_cause_freq = sorted_causes[0][1]
            total_symptoms = len(symptoms)
            diagnosis["confidence"] = min(1.0, top_cause_freq / total_symptoms)
        
        # Query knowledge base for treatment recommendations
        if symptoms:
            symptom_text = ", ".join(symptoms)
            kb_query = f"Treatment for plant stress symptoms: {symptom_text} in Martian greenhouse"
            kb_result = query_knowledge_base(kb_query)
            
            try:
                kb_data = json.loads(kb_result)
                if "error" not in kb_data:
                    diagnosis["knowledge_base_advice"] = kb_data
            except:
                pass
        
        # Generate treatment plan
        if diagnosis["possible_causes"]:
            top_cause = diagnosis["possible_causes"][0]["cause"]
            
            if "deficiency" in top_cause:
                diagnosis["treatment_plan"].append(f"Supplement with appropriate nutrient")
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
    """Trigger appropriate response for plant stress.
    
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
            "timestamp": datetime.utcnow().isoformat() + "Z",
            "severity": severity,
            "cause": cause,
            "zone": zone,
            "response_level": response_level["action"],
            "response_time": response_level["response_time"],
            "actions_taken": [],
            "monitoring_plan": [],
        }
        
        # Determine actions based on severity and cause
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
            response["monitoring_plan"].append("Continuous monitoring")
            response["monitoring_plan"].append("Hourly sensor checks")
            response["monitoring_plan"].append("Daily visual inspection")
        elif severity == "severe":
            response["monitoring_plan"].append("Check every 4 hours")
            response["monitoring_plan"].append("Daily sensor analysis")
        elif severity == "moderate":
            response["monitoring_plan"].append("Check twice daily")
            response["monitoring_plan"].append("Monitor for changes")
        else:  # mild
            response["monitoring_plan"].append("Daily check")
            response["monitoring_plan"].append("Monitor trends")
        
        logger.info("Stress response triggered: %s - %s in zone %s", severity, cause, zone)
        return json.dumps(response)
    
    except Exception as e:
        logger.error("Failed to trigger stress response: %s", e)
        return json.dumps({"error": str(e)})


def build_system_prompt() -> str:
    """Build the system prompt for the stress agent."""
    return """You are the Plant Stress Detection and Response Agent for a Martian greenhouse.

Your responsibilities:
1. Monitor plant health indicators from sensor data
2. Detect early signs of stress (environmental, nutritional, disease)
3. Diagnose stress causes using symptom analysis
4. Trigger appropriate response protocols
5. Consult the knowledge base for Martian-specific treatments

Common Stress Indicators:
- Yellow leaves: nutrient deficiency, over-watering, light stress
- Wilting: water stress, root rot, temperature stress
- Brown spots: fungal infection, nutrient burn, salt buildup
- Stunted growth: nutrient deficiency, root bound, light deficiency
- Leaf curl: heat stress, pest infestation, virus
- Purple stems: phosphorus deficiency, cold stress

Response Protocols:
1. Mild stress: Monitor, adjust environment gradually
2. Moderate stress: Adjust conditions, supplement nutrients
3. Severe stress: Emergency adjustments, isolate affected area
4. Critical stress: Full isolation, alert human operator

Martian Considerations:
- Limited treatment options (no Earth-based chemicals)
- No natural predators for pests
- Limited water for treatments
- High-value crops (crew nutrition depends on them)

Always:
1. Check multiple data sources before diagnosis
2. Start with least invasive treatment
3. Document all observations and actions
4. Monitor response to treatments
5. Update knowledge base with outcomes
"""


def run_stress_agent(greenhouse_id: str = "mars-greenhouse-1") -> str:
    """Run one cycle of the stress agent."""
    model = BedrockModel(
        model_id="us.anthropic.claude-sonnet-4-5",
        region_name=AWS_REGION,
        temperature=0.2,
        max_tokens=1024,
    )
    
    tools = [
        get_latest_sensor_reading,
        get_sensor_history,
        analyze_plant_health,
        diagnose_stress_symptoms,
        trigger_stress_response,
        query_knowledge_base,
        get_plant_stress_guide,
    ]
    
    agent = Agent(
        model=model,
        tools=tools,
        system_prompt=build_system_prompt(),
    )
    
    prompt = f"""Monitor plant health in greenhouse {greenhouse_id}:

1. Get current sensor readings
2. Analyze for plant stress indicators
3. If stress is detected, diagnose the cause
4. Query knowledge base for Martian-specific treatments
5. Trigger appropriate response based on severity
6. Document all findings and actions

Be proactive but conservative. On Mars, we can't afford to lose crops!"""

    logger.info("Stress agent starting health monitoring cycle")
    response = agent(prompt)
    logger.info("Stress agent cycle complete")
    
    return str(response)


if __name__ == "__main__":
    import sys
    greenhouse_id = sys.argv[1] if len(sys.argv) > 1 else "mars-greenhouse-1"
    print(run_stress_agent(greenhouse_id))
