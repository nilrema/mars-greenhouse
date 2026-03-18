"""
Resource Agent - Manages water, nutrients, and power allocation.
"""

import json
import logging
from datetime import datetime

from strands import Agent, tool
from strands.models import BedrockModel

from agents.tools.sensor_tools import get_latest_sensor_reading, get_sensor_history
from agents.tools.actuator_tools import trigger_irrigation, get_command_status
from agents.tools.kb_tools import query_knowledge_base

logger = logging.getLogger(__name__)

# Resource constraints (Martian constraints)
RESOURCE_LIMITS = {
    "water_daily_limit_liters": 100,  # Liters per sol (Martian day)
    "power_daily_kwh": 50,  # kWh per sol
    "nutrient_solution_liters": 200,  # Liters of nutrient solution
    "co2_kg_per_sol": 5.0,  # CO2 available per sol (kg)
}

# Crop water requirements (liters per plant per day)
CROP_WATER_REQUIREMENTS = {
    "lettuce": 0.5,  # liters per day
    "tomato": 2.0,
    "potato": 1.5,
    "wheat": 1.0,
    "soy": 0.8,
}

# Nutrient solution composition (EC targets in mS/cm)
NUTRIENT_TARGETS = {
    "lettuce": {"EC": 1.2, "pH": 6.0, "N-P-K": "8-4-8"},
    "tomato": {"EC": 2.4, "pH": 5.8, "N-P-K": "5-10-10"},
    "potato": {"EC": 2.0, "pH": 5.5, "N-P-K": "6-12-6"},
    "wheat": {"EC": 1.8, "pH": 6.0, "N-P-K": "10-10-10"},
    "soy": {"EC": 1.5, "pH": 6.2, "N-P-K": "4-8-8"},
}


@tool
def check_water_reserves() -> str:
    """Check current water reserves and usage."""
    # In a real system, this would query a database
    # For now, return simulated data
    return json.dumps({
        "total_water_liters": 500,  # liters
        "water_used_today": 45,  # liters
        "daily_limit": RESOURCE_LIMITS["water_daily_limit_liters"],
        "reservoir_level": 85,  # percent
        "recycled_water_available": 200,  # liters from recycling
    })


@tool
def check_power_usage() -> str:
    """Check current power usage and allocation."""
    return json.dumps({
        "power_used_today_kwh": 28.5,
        "power_limit_kwh": RESOURCE_LIMITS["power_daily_kwh"],
        "lights_power_kw": 12.5,
        "pumps_power_kw": 3.2,
        "heating_cooling_kw": 8.0,
        "remaining_kwh": 21.5,
    })


@tool
def check_nutrient_levels() -> str:
    """Check nutrient solution levels and composition."""
    return json.dumps({
        "nutrient_a_tank": 75,  # percent
        "nutrient_b_tank": 60,
        "ph_adjuster": 45,
        "ec_sensor": 2.1,  # mS/cm
        "ph_sensor": 5.8,
        "reservoir_temperature": 20.5,  # °C
    })


@tool
def allocate_water(crop_type: str, zone: str, duration_minutes: int) -> str:
    """Allocate water to a specific crop zone.
    
    Args:
        crop_type: Type of crop (lettuce, tomato, etc.)
        zone: Irrigation zone identifier
        duration_minutes: Irrigation duration in minutes
    """
    # Calculate water needed based on crop type
    water_per_plant = CROP_WATER_REQUIREMENTS.get(crop_type, 1.0)
    # In a real system, this would control actual irrigation valves
    return json.dumps({
        "status": "scheduled",
        "crop": crop_type,
        "zone": zone,
        "duration_minutes": duration_minutes,
        "estimated_water_liters": water_per_plant * 10,  # 10 plants per zone
        "scheduled_for": datetime.utcnow().isoformat(),
    })


@tool
def adjust_nutrient_mix(crop_type: str, target_ec: float, target_ph: float) -> str:
    """Adjust the nutrient solution for a specific crop type."""
    target = NUTRIENT_TARGETS.get(crop_type, {})
    return json.dumps({
        "crop": crop_type,
        "target_ec": target_ec,
        "target_ph": target_ph,
        "current_ec": 2.1,  # Simulated current EC
        "current_ph": 5.8,   # Simulated current pH
        "recommended_mix": target,
        "adjustment_needed": abs(target_ec - 2.1) > 0.2 or abs(target_ph - 5.8) > 0.2,
    })


@tool
def check_power_allocation(system: str) -> str:
    """Check and allocate power to different systems."""
    power_allocation = {
        "lighting": {"allocated": 8.0, "used": 7.2, "priority": "high"},
        "environmental": {"allocated": 5.0, "used": 4.1, "priority": "high"},
        "irrigation": {"allocated": 2.0, "used": 0.5, "priority": "medium"},
        "sensors": {"allocated": 0.5, "used": 0.3, "priority": "high"},
        "computing": {"allocated": 1.0, "used": 0.8, "priority": "medium"},
    }
    
    if system == "all":
        return json.dumps(power_allocation)
    elif system in power_allocation:
        return json.dumps(power_allocation[system])
    else:
        return json.dumps({"error": f"System {system} not found"})


def build_system_prompt() -> str:
    """Build the system prompt for the resource agent."""
    return f"""You are the Resource Management Agent for a Martian greenhouse.

Your responsibilities:
1. Water Management:
   - Daily limit: {RESOURCE_LIMITS['water_daily_limit_liters']}L per sol
   - Current reservoir: 500L capacity
   - Recycling efficiency: 85% water recovery

2. Power Management:
   - Daily limit: {RESOURCE_LIMITS['power_daily_kwh']} kWh per sol
   - Solar generation: 5kW peak (Martian day)
   - Battery storage: 50kWh

3. Nutrient Management:
   - Monitor EC (1.2-2.4 mS/cm) and pH (5.5-6.5)
   - Maintain nutrient solution levels
   - Adjust for different crop types

4. CO2 Management:
   - Crew respiration: 1kg CO2/person/day
   - Plant consumption: 0.5kg CO2/m²/day
   - Storage: 50kg CO2 tanks

5. Martian Constraints:
   - Water is precious (recycle everything)
   - Power is limited (solar + batteries)
   - CO2 from crew respiration + storage
   - All nutrients must be recycled

Prioritize:
1. Crew oxygen production (plants)
2. Water conservation
3. Power for life support
4. Crop yield optimization

Always check current resource levels before allocating!
"""


def run_resource_agent() -> str:
    """Run one cycle of the resource agent."""
    model = BedrockModel(
        model_id="us.anthropic.claude-sonnet-4-5",
        region_name="us-east-2",
        temperature=0.2,  # Low temperature for precise resource management
        max_tokens=1024,
    )
    
    tools = [
        check_water_reserves,
        check_power_usage,
        check_nutrient_levels,
        allocate_water,
        adjust_nutrient_mix,
        check_power_allocation,
    ]
    
    agent = Agent(
        model=model,
        tools=tools,
        system_prompt=build_system_prompt(),
    )
    
    prompt = """Analyze current resource status and:
1. Check all resource levels (water, power, nutrients)
2. Identify any resource constraints or shortages
3. Allocate water to crops based on their needs
4. Adjust nutrient solutions if needed
5. Optimize power allocation
6. Report any resource emergencies

Be conservative with Martian resources! Every drop of water and watt of power counts."""

    logger.info("Resource agent starting resource allocation cycle")
    response = agent(prompt)
    logger.info("Resource agent cycle complete")
    
    return str(response)


if __name__ == "__main__":
    import sys
    result = run_resource_agent()
    print(result)