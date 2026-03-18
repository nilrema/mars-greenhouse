"""
Knowledge Base tools for querying the MCP endpoint.
"""

import json
import logging
import os

import httpx
from strands import tool

logger = logging.getLogger(__name__)

# MCP Knowledge Base endpoint
KB_MCP_URL = os.environ.get(
    "KB_MCP_URL",
    "https://kb-start-hack-gateway-buyjtibfpg.gateway.bedrock-agentcore.us-east-2.amazonaws.com/mcp"
)

# OAuth2 credentials (if required)
GATEWAY_CLIENT_ID = os.environ.get("GATEWAY_CLIENT_ID", "")
GATEWAY_CLIENT_SECRET = os.environ.get("GATEWAY_CLIENT_SECRET", "")
GATEWAY_TOKEN_ENDPOINT = os.environ.get("GATEWAY_TOKEN_ENDPOINT", "")
GATEWAY_SCOPE = os.environ.get("GATEWAY_SCOPE", "")

# Token cache
_token_cache = {"token": None, "expires_at": None}


def _get_oauth_token() -> str:
    """Fetch and cache an OAuth2 client-credentials token for the KB gateway."""
    from datetime import datetime, timedelta
    
    now = datetime.now()
    if _token_cache["token"] and _token_cache["expires_at"] and now < _token_cache["expires_at"]:
        return _token_cache["token"]

    if not all([GATEWAY_CLIENT_ID, GATEWAY_CLIENT_SECRET, GATEWAY_TOKEN_ENDPOINT]):
        # No OAuth configured — gateway may allow unauthenticated access (dev mode)
        logger.warning("OAuth credentials not set; attempting unauthenticated MCP connection.")
        return ""

    try:
        resp = httpx.post(
            GATEWAY_TOKEN_ENDPOINT,
            data={
                "grant_type": "client_credentials",
                "client_id": GATEWAY_CLIENT_ID,
                "client_secret": GATEWAY_CLIENT_SECRET,
                "scope": GATEWAY_SCOPE,
            },
            headers={"Content-Type": "application/x-www-form-urlencoded"},
            timeout=10,
        )
        resp.raise_for_status()
        data = resp.json()
        token = data["access_token"]
        expires_in = data.get("expires_in", 3600) - 300  # 5-min buffer
        _token_cache["token"] = token
        _token_cache["expires_at"] = now + timedelta(seconds=expires_in)
        logger.info("OAuth token refreshed, expires in %ds", expires_in)
        return token
    except Exception as e:
        logger.error("Failed to get OAuth token: %s", e)
        return ""


@tool
def query_knowledge_base(query: str) -> str:
    """Query the MCP Knowledge Base for relevant crop/environment data.

    Args:
        query: Natural language query about Mars agriculture, crop profiles,
               environmental constraints, or plant stress responses.

    Returns:
        JSON with relevant knowledge base excerpts and citations.
    """
    try:
        # Get OAuth token if configured
        token = _get_oauth_token()
        headers = {"Authorization": f"Bearer {token}"} if token else {}
        
        # MCP tools call format
        mcp_request = {
            "jsonrpc": "2.0",
            "method": "tools/call",
            "params": {
                "name": "query_knowledge_base",
                "arguments": {
                    "query": query,
                    "max_results": 5,
                    "domains": [
                        "Mars Environmental Constraints",
                        "Controlled Environment Agriculture Principles",
                        "Crop Profiles",
                        "Plant Stress and Response Guide",
                        "Human Nutritional Strategy",
                        "Greenhouse Operational Scenarios",
                        "Innovation Impact (Mars to Earth)"
                    ]
                }
            },
            "id": 1
        }
        
        # Make HTTP request to MCP endpoint
        with httpx.Client(timeout=30.0) as client:
            response = client.post(KB_MCP_URL, json=mcp_request, headers=headers)
            response.raise_for_status()
            result = response.json()
        
        # Extract and format the response
        if "result" in result:
            kb_result = result["result"]
            logger.info("Knowledge base query successful: %s", query[:50])
            return json.dumps(kb_result)
        elif "error" in result:
            logger.error("MCP error: %s", result["error"])
            return json.dumps({"error": result["error"]})
        else:
            logger.error("Unexpected MCP response format")
            return json.dumps({"error": "Unexpected response format from MCP endpoint"})
    
    except httpx.TimeoutException:
        logger.error("MCP query timeout")
        return json.dumps({"error": "MCP endpoint timeout - knowledge base unavailable"})
    except httpx.HTTPStatusError as e:
        logger.error("MCP HTTP error: %s", e)
        return json.dumps({"error": f"MCP HTTP error: {e.response.status_code}"})
    except Exception as e:
        logger.error("Failed to query knowledge base: %s", e)
        return json.dumps({"error": str(e)})


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