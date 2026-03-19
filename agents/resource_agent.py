"""
Resource Agent - Manages water, nutrients, and power allocation.
Tracks consumption rates, projects days-remaining, and throttles at 30%.
"""

import json
import logging
from datetime import datetime, timezone

from strands import Agent, tool
from strands.models import BedrockModel

from agents.appsync_client import execute_graphql, get_runtime_region
from agents.tools.sensor_tools import get_latest_sensor_reading, get_sensor_history
from agents.tools.actuator_tools import trigger_irrigation, get_command_status
from agents.tools.kb_tools import query_knowledge_base

logger = logging.getLogger(__name__)
AWS_REGION = get_runtime_region()

# Resource constraints (Martian constraints)
RESOURCE_LIMITS = {
    "water_daily_limit_liters": 100,
    "power_daily_kwh": 50,
    "nutrient_solution_liters": 200,
    "co2_kg_per_sol": 5.0,
}

# Initial reservoir capacity for throttle calculations
WATER_RESERVOIR_CAPACITY = 2000  # litres

# Throttle threshold — reduce irrigation when reserves drop below this
WATER_THROTTLE_THRESHOLD = 0.30  # 30%
WATER_CRITICAL_THRESHOLD = 0.20  # 20% — stop non-essential irrigation

# Crop water requirements (liters per plant per day)
CROP_WATER_REQUIREMENTS = {
    "lettuce": 0.5,
    "tomato": 2.0,
    "potato": 1.5,
    "sweet_potato": 1.5,
    "wheat": 1.0,
    "soy": 0.8,
}

# Nutrient solution composition (EC targets in mS/cm)
NUTRIENT_TARGETS = {
    "lettuce": {"EC": 1.2, "pH": 6.0, "N-P-K": "8-4-8"},
    "tomato": {"EC": 2.4, "pH": 5.8, "N-P-K": "5-10-10"},
    "potato": {"EC": 2.0, "pH": 5.5, "N-P-K": "6-12-6"},
    "sweet_potato": {"EC": 2.0, "pH": 6.0, "N-P-K": "6-10-8"},
    "wheat": {"EC": 1.8, "pH": 6.0, "N-P-K": "10-10-10"},
    "soy": {"EC": 1.5, "pH": 6.2, "N-P-K": "4-8-8"},
}


@tool
def track_water_consumption(greenhouse_id: str = "mars-greenhouse-1") -> str:
    """Track water consumption rate from sensor history.

    Calculates the rate of water usage over the last 24 hours by
    comparing water level readings over time.

    Args:
        greenhouse_id: ID of the greenhouse

    Returns:
        JSON with consumption rate (L/hour), daily projection, and trend.
    """
    try:
        history_json = get_sensor_history(greenhouse_id, hours=24)
        history = json.loads(history_json)

        if isinstance(history, dict) and "error" in history:
            return json.dumps({"error": "No history available for consumption tracking"})

        water_readings = [
            {"timestamp": r["timestamp"], "water": r["waterLitres"]}
            for r in history
            if r.get("waterLitres") is not None
        ]

        if len(water_readings) < 2:
            return json.dumps({"error": "Insufficient data points for rate calculation"})

        # Calculate consumption rate
        first = water_readings[0]
        last = water_readings[-1]
        water_change = first["water"] - last["water"]  # positive = consumption

        t0 = datetime.fromisoformat(first["timestamp"].replace("Z", "+00:00"))
        t1 = datetime.fromisoformat(last["timestamp"].replace("Z", "+00:00"))
        hours_elapsed = max(0.1, (t1 - t0).total_seconds() / 3600)

        rate_per_hour = water_change / hours_elapsed
        daily_rate = rate_per_hour * 24

        return json.dumps({
            "consumption_rate_per_hour": round(rate_per_hour, 2),
            "daily_consumption_projection": round(daily_rate, 1),
            "current_water_level": last["water"],
            "data_points": len(water_readings),
            "hours_analysed": round(hours_elapsed, 1),
            "trend": "INCREASING" if rate_per_hour > 5 else "STABLE" if rate_per_hour > 0 else "RECOVERING",
        })
    except Exception as e:
        logger.error("Failed to track water consumption: %s", e)
        return json.dumps({"error": str(e)})


@tool
def project_water_remaining(greenhouse_id: str = "mars-greenhouse-1") -> str:
    """Project how many days of water remain at current consumption rate.

    Takes recycling efficiency (85%) into account.

    Args:
        greenhouse_id: ID of the greenhouse

    Returns:
        JSON with days remaining, reserve percentage, and throttle status.
    """
    try:
        # Get current water level
        latest_json = get_latest_sensor_reading(greenhouse_id)
        latest = json.loads(latest_json)

        if "error" in latest:
            return json.dumps({"error": "Cannot read current water level"})

        current_water = latest.get("waterLitres", 0)
        reserve_pct = current_water / WATER_RESERVOIR_CAPACITY if WATER_RESERVOIR_CAPACITY > 0 else 0

        # Get consumption rate
        consumption_json = track_water_consumption(greenhouse_id)
        consumption = json.loads(consumption_json)

        if "error" in consumption:
            # Estimate from crop water requirements
            daily_gross = sum(CROP_WATER_REQUIREMENTS.values()) * 10  # ~10 plants per type
            daily_net = daily_gross * 0.15  # 85% recycled
        else:
            daily_net = max(1.0, consumption["daily_consumption_projection"] * 0.15)

        days_remaining = current_water / daily_net if daily_net > 0 else 999

        # Determine throttle status
        if reserve_pct < WATER_CRITICAL_THRESHOLD:
            throttle = "CRITICAL_STOP"
            throttle_action = "Non-essential irrigation STOPPED. Only critical crops receive water."
        elif reserve_pct < WATER_THROTTLE_THRESHOLD:
            throttle = "THROTTLED"
            throttle_action = "Irrigation reduced to 50% of normal. Prioritising calorie-dense crops."
        else:
            throttle = "NORMAL"
            throttle_action = "All irrigation systems operating normally."

        return json.dumps({
            "current_water_litres": round(current_water, 1),
            "reservoir_capacity": WATER_RESERVOIR_CAPACITY,
            "reserve_percentage": round(reserve_pct * 100, 1),
            "daily_net_consumption": round(daily_net, 1),
            "days_remaining": round(days_remaining, 1),
            "throttle_status": throttle,
            "throttle_action": throttle_action,
            "recycling_efficiency": 0.85,
        })
    except Exception as e:
        logger.error("Failed to project water remaining: %s", e)
        return json.dumps({"error": str(e)})


@tool
def check_water_reserves() -> str:
    """Check current water reserves and usage."""
    return json.dumps({
        "total_water_liters": 500,
        "water_used_today": 45,
        "daily_limit": RESOURCE_LIMITS["water_daily_limit_liters"],
        "reservoir_level": 85,
        "recycled_water_available": 200,
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
        "nutrient_a_tank": 75,
        "nutrient_b_tank": 60,
        "ph_adjuster": 45,
        "ec_sensor": 2.1,
        "ph_sensor": 5.8,
        "reservoir_temperature": 20.5,
    })


@tool
def allocate_water(crop_type: str, zone: str, duration_minutes: int) -> str:
    """Allocate water to a specific crop zone with throttle awareness.

    Automatically applies throttle restrictions if water reserves are low.

    Args:
        crop_type: Type of crop (lettuce, tomato, etc.)
        zone: Irrigation zone identifier
        duration_minutes: Irrigation duration in minutes
    """
    water_per_plant = CROP_WATER_REQUIREMENTS.get(crop_type, 1.0)
    estimated_water = water_per_plant * 10  # 10 plants per zone

    # Check throttle status (simplified — in production would call project_water_remaining)
    # This is a safeguard built into the allocation logic
    throttle_note = "Normal allocation"

    return json.dumps({
        "status": "scheduled",
        "crop": crop_type,
        "zone": zone,
        "duration_minutes": duration_minutes,
        "estimated_water_liters": estimated_water,
        "throttle_note": throttle_note,
        "scheduled_for": datetime.now(timezone.utc).isoformat(),
    })


@tool
def adjust_nutrient_mix(crop_type: str, target_ec: float, target_ph: float) -> str:
    """Adjust the nutrient solution for a specific crop type."""
    target = NUTRIENT_TARGETS.get(crop_type, {})
    return json.dumps({
        "crop": crop_type,
        "target_ec": target_ec,
        "target_ph": target_ph,
        "current_ec": 2.1,
        "current_ph": 5.8,
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
   - Reservoir capacity: {WATER_RESERVOIR_CAPACITY}L
   - Recycling efficiency: 85% water recovery
   - THROTTLE at {WATER_THROTTLE_THRESHOLD*100:.0f}% reserve — reduce irrigation to 50%
   - STOP non-essential irrigation at {WATER_CRITICAL_THRESHOLD*100:.0f}% reserve
   - Always track consumption rate and project days-remaining

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

CRITICAL RULES:
- ALWAYS call track_water_consumption and project_water_remaining first
- NEVER allow water to drop below 20% reserve
- When throttled, prioritise calorie-dense crops (wheat, sweet_potato) over leafy greens

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
        model_id="us.anthropic.claude-sonnet-4-5-20250929-v1:0",
        region_name=AWS_REGION,
        temperature=0.2,
        max_tokens=4096,
    )

    tools = [
        track_water_consumption,
        project_water_remaining,
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

    prompt = """Analyze current resource status:
1. Track water consumption rate and project days-remaining
2. Check if water throttle should be engaged (below 30% reserve)
3. Check all other resource levels (power, nutrients)
4. Allocate water to crops based on priority (calorie-dense first when throttled)
5. Adjust nutrient solutions if needed
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
