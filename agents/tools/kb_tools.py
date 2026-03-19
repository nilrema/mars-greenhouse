"""
Knowledge Base tools for querying the MCP endpoint.
"""

import json

from agents.mcp_support import query_mars_crop_knowledge
from agents.tools._compat import tool


@tool
def query_knowledge_base(query: str) -> str:
    """Query the MCP Knowledge Base for relevant crop/environment data.

    Args:
        query: Natural language query about Mars agriculture, crop profiles,
               environmental constraints, or plant stress responses.

    Returns:
        JSON with relevant knowledge base excerpts and citations.
    """
    result = query_mars_crop_knowledge(query)
    if result["ok"]:
        return json.dumps(result["result"])
    return json.dumps({"error": result["error"], "status": result["status"], "access": result["access"]})


@tool
def get_crop_profile(crop_name: str) -> str:
    """Get detailed profile for a specific crop from the knowledge base.

    Args:
        crop_name: Name of the crop (e.g., "lettuce", "tomato", "potato")

    Returns:
        JSON with crop requirements, growth stages, and stress indicators.
    """
    query = f"Detailed profile for {crop_name} including optimal temperature, humidity, light, nutrient requirements, growth stages, and common stress indicators for Martian greenhouse cultivation"
    return query_knowledge_base(query)


@tool
def get_mars_environmental_constraints() -> str:
    """Get Mars-specific environmental constraints for greenhouse design.

    Returns:
        JSON with atmospheric pressure, radiation levels, temperature extremes,
        and other Mars-specific constraints.
    """
    query = "Mars environmental constraints for greenhouse design including atmospheric pressure, radiation levels, temperature extremes, dust storms, and resource limitations for controlled environment agriculture"
    return query_knowledge_base(query)


@tool
def get_plant_stress_guide(symptom: str = None) -> str:
    """Get guidance for identifying and responding to plant stress.

    Args:
        symptom: Optional specific symptom (e.g., "yellow leaves", "wilting")

    Returns:
        JSON with stress identification and response recommendations.
    """
    if symptom:
        query = f"Plant stress identification and response for symptom: {symptom} in Martian greenhouse conditions"
    else:
        query = "Comprehensive plant stress identification and response guide for Martian greenhouse conditions including nutrient deficiencies, disease, environmental stress, and automated response protocols"
    return query_knowledge_base(query)


@tool
def get_nutrient_strategy() -> str:
    """Get human nutritional strategy for Mars missions.

    Returns:
        JSON with crop selection for balanced nutrition, yield requirements,
        and supplementation strategies.
    """
    query = "Human nutritional strategy for Mars missions including crop selection for balanced nutrition, daily yield requirements per crew member, vitamin supplementation, and long-term sustainability"
    return query_knowledge_base(query)
