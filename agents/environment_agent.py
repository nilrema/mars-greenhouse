"""
Environment Agent - Controls temperature, humidity, CO₂, and lighting.
"""

import json
import logging
from datetime import datetime, timezone

from strands import Agent, tool
from strands.models import BedrockModel

from agents.appsync_client import get_runtime_region
from agents.tools.sensor_tools import get_latest_sensor_reading, get_sensor_history
from agents.tools.actuator_tools import (
    adjust_temperature,
    adjust_humidity,
    adjust_lighting,
    adjust_co2,
)
from agents.tools.kb_tools import query_knowledge_base

logger = logging.getLogger(__name__)
AWS_REGION = get_runtime_region()

# Optimal ranges for Martian greenhouse
OPTIMAL_RANGES = {
    "temperature": {"min": 20.0, "max": 25.0, "unit": "°C"},
    "humidity": {"min": 60.0, "max": 70.0, "unit": "%"},
    "co2Ppm": {"min": 1000, "max": 1400, "unit": "ppm"},
    "lightPpfd": {"min": 300, "max": 500, "unit": "µmol/m²/s"},
}

# Greenhouse zones
ZONES = ["main", "nursery", "flowering", "fruiting"]


@tool
def analyze_environmental_conditions(greenhouse_id: str = "mars-greenhouse-1") -> str:
    """Analyze current environmental conditions and identify issues.

    Args:
        greenhouse_id: ID of the greenhouse to analyze

    Returns:
        JSON with analysis results and recommendations.
    """
    try:
        # Get latest sensor data
        sensor_json = get_latest_sensor_reading(greenhouse_id)
        sensor_data = json.loads(sensor_json)
        
        if "error" in sensor_data:
            return sensor_json
        
        analysis = {
            "greenhouse_id": greenhouse_id,
            "timestamp": datetime.now(timezone.utc).isoformat().replace("+00:00", "Z"),
            "metrics": {},
            "issues": [],
            "recommendations": [],
        }
        
        # Check each metric against optimal ranges
        for metric, optimal in OPTIMAL_RANGES.items():
            value = sensor_data.get(metric)
            if value is None:
                continue
            
            analysis["metrics"][metric] = {
                "value": value,
                "optimal_min": optimal["min"],
                "optimal_max": optimal["max"],
                "unit": optimal["unit"],
            }
            
            # Check if value is outside optimal range
            if value < optimal["min"]:
                analysis["issues"].append({
                    "metric": metric,
                    "severity": "WARNING" if value < optimal["min"] * 0.9 else "CRITICAL",
                    "message": f"{metric} is low: {value}{optimal['unit']} (optimal: {optimal['min']}-{optimal['max']}{optimal['unit']})",
                    "recommendation": f"Increase {metric} to at least {optimal['min']}{optimal['unit']}",
                })
            elif value > optimal["max"]:
                analysis["issues"].append({
                    "metric": metric,
                    "severity": "WARNING" if value > optimal["max"] * 1.1 else "CRITICAL",
                    "message": f"{metric} is high: {value}{optimal['unit']} (optimal: {optimal['min']}-{optimal['max']}{optimal['unit']})",
                    "recommendation": f"Decrease {metric} to at most {optimal['max']}{optimal['unit']}",
                })
        
        # Query knowledge base for environmental guidance if issues found
        if analysis["issues"]:
            issues_text = ", ".join([issue["message"] for issue in analysis["issues"][:3]])
            kb_query = f"Martian greenhouse environmental control for: {issues_text}"
            kb_result = query_knowledge_base(kb_query)
            analysis["knowledge_base_guidance"] = json.loads(kb_result)
        
        logger.info("Environmental analysis complete for %s", greenhouse_id)
        return json.dumps(analysis)
    
    except Exception as e:
        logger.error("Failed to analyze environmental conditions: %s", e)
        return json.dumps({"error": str(e)})


def build_system_prompt() -> str:
    """Build the system prompt for the environment agent."""
    ranges_text = "\n".join(
        f"  - {metric}: {rng['min']}–{rng['max']} {rng['unit']}"
        for metric, rng in OPTIMAL_RANGES.items()
    )
    
    return f"""You are the Mars Greenhouse Environment Agent — an expert in controlled environment agriculture.

Your responsibilities:
1. Monitor temperature, humidity, CO₂, and lighting levels
2. Maintain optimal ranges for plant growth:
{ranges_text}
3. Make precise adjustments using actuator tools
4. Conserve energy and resources (Martian constraints!)
5. Document all decisions and actions

Martian Constraints:
- Limited power availability (solar + batteries)
- No atmospheric heat sink (radiative cooling only)
- CO₂ must be recycled from crew respiration
- Water is precious (recycled from humidity)

Decision Priority:
1. Keep plants alive (within survival ranges)
2. Optimize growth (within optimal ranges)
3. Conserve resources
4. Minimize energy use

Always:
- Check current conditions before making adjustments
- Make small, incremental changes
- Document your reasoning
- Consider time of day (Martian sol) for lighting adjustments
"""


def run_environment_agent(greenhouse_id: str = "mars-greenhouse-1") -> str:
    """Run one cycle of the environment agent."""
    model = BedrockModel(
        model_id="us.anthropic.claude-sonnet-4-5-20250929-v1:0",
        region_name=AWS_REGION,
        temperature=0.1,  # Low temperature for precise control
        max_tokens=4096,
    )
    
    tools = [
        get_latest_sensor_reading,
        get_sensor_history,
        adjust_temperature,
        adjust_humidity,
        adjust_lighting,
        adjust_co2,
        query_knowledge_base,
        analyze_environmental_conditions,
    ]
    
    agent = Agent(
        model=model,
        tools=tools,
        system_prompt=build_system_prompt(),
    )
    
    prompt = f"""Analyze the current environmental conditions in greenhouse {greenhouse_id}.

1. Get the latest sensor readings
2. Analyze if any metrics are outside optimal ranges
3. If issues are found, query the knowledge base for Martian-specific guidance
4. Make precise adjustments using actuator tools
5. Document your analysis and actions

Be methodical and precise. Martian resources are limited!"""

    logger.info("Environment agent starting cycle for %s", greenhouse_id)
    response = agent(prompt)
    logger.info("Environment agent cycle complete")
    
    return str(response)


if __name__ == "__main__":
    import sys
    greenhouse_id = sys.argv[1] if len(sys.argv) > 1 else "mars-greenhouse-1"
    print(run_environment_agent(greenhouse_id))
