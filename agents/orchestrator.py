"""
Mars Greenhouse Orchestrator Agent
Reads sensor data from DynamoDB, queries the AgentCore KB via MCP,
and decides on greenhouse adjustments using Claude Sonnet on Bedrock.
"""

import os
import json
import logging
from datetime import datetime, timedelta

import boto3
import httpx
from mcp.client.streamable_http import streamablehttp_client
from strands import Agent, tool
from strands.models import BedrockModel
from strands.tools.mcp import MCPClient

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger(__name__)

# ── Configuration ────────────────────────────────────────────────────────────

KB_MCP_URL          = os.environ.get("KB_MCP_URL", "https://kb-start-hack-gateway-buyjtibfpg.gateway.bedrock-agentcore.us-east-2.amazonaws.com/mcp")
GATEWAY_CLIENT_ID   = os.environ.get("GATEWAY_CLIENT_ID", "")
GATEWAY_CLIENT_SECRET = os.environ.get("GATEWAY_CLIENT_SECRET", "")
GATEWAY_TOKEN_ENDPOINT = os.environ.get("GATEWAY_TOKEN_ENDPOINT", "")
GATEWAY_SCOPE       = os.environ.get("GATEWAY_SCOPE", "")

SENSOR_TABLE        = os.environ.get("SENSOR_TABLE", "SensorReading")
AGENT_EVENT_TABLE   = os.environ.get("AGENT_EVENT_TABLE", "AgentEvent")
AWS_REGION          = os.environ.get("AWS_REGION", "us-east-2")

MODEL_ID = "us.anthropic.claude-sonnet-4-5"

# ── OAuth2 token cache ────────────────────────────────────────────────────────

_token_cache: dict = {"token": None, "expires_at": None}


def get_oauth_token() -> str:
    """Fetch and cache an OAuth2 client-credentials token for the KB gateway."""
    now = datetime.now()
    if _token_cache["token"] and _token_cache["expires_at"] and now < _token_cache["expires_at"]:
        return _token_cache["token"]

    if not all([GATEWAY_CLIENT_ID, GATEWAY_CLIENT_SECRET, GATEWAY_TOKEN_ENDPOINT]):
        # No OAuth configured — gateway may allow unauthenticated access (dev mode)
        logger.warning("OAuth credentials not set; attempting unauthenticated MCP connection.")
        return ""

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


def build_mcp_client() -> MCPClient:
    """Return an MCPClient pointed at the AgentCore KB gateway."""
    token = get_oauth_token()
    headers = {"Authorization": f"Bearer {token}"} if token else {}
    return MCPClient(lambda: streamablehttp_client(KB_MCP_URL, headers=headers))


# ── DynamoDB tools ────────────────────────────────────────────────────────────

_dynamodb = boto3.resource("dynamodb", region_name=AWS_REGION)


@tool
def get_latest_sensor_reading() -> str:
    """Fetch the most recent SensorReading record from DynamoDB.

    Returns a JSON string with temperature (°C), humidity (%), co2Ppm,
    lightPpfd (µmol/m²/s), phLevel, nutrientEc (mS/cm), and waterLitres.
    """
    table = _dynamodb.Table(SENSOR_TABLE)
    result = table.scan(Limit=10)
    items = result.get("Items", [])
    if not items:
        return json.dumps({"error": "No sensor readings found"})
    # Sort by createdAt descending and return the latest
    items.sort(key=lambda x: x.get("createdAt", ""), reverse=True)
    latest = items[0]
    # Convert Decimal to float for JSON serialisation
    return json.dumps({k: float(v) if hasattr(v, "__float__") else v for k, v in latest.items()})


@tool
def write_agent_event(severity: str, message: str, action_taken: str) -> str:
    """Persist an AgentEvent to DynamoDB so the React dashboard can display it.

    Args:
        severity: One of INFO, WARNING, ERROR
        message: Human-readable description of what the agent observed
        action_taken: The adjustment or recommendation the agent made
    """
    import uuid
    table = _dynamodb.Table(AGENT_EVENT_TABLE)
    now = datetime.utcnow().isoformat() + "Z"
    item = {
        "id": str(uuid.uuid4()),
        "agentId": "orchestrator",
        "severity": severity.upper(),
        "message": message,
        "actionTaken": action_taken,
        "createdAt": now,
        "updatedAt": now,
        "__typename": "AgentEvent",
    }
    table.put_item(Item=item)
    logger.info("AgentEvent written: %s", message)
    return json.dumps({"status": "ok", "id": item["id"]})


# ── Greenhouse thresholds ─────────────────────────────────────────────────────

THRESHOLDS = {
    "temperature":  {"min": 18.0,  "max": 26.0,  "unit": "°C"},
    "humidity":     {"min": 55.0,  "max": 75.0,  "unit": "%"},
    "co2Ppm":       {"min": 800.0, "max": 1500.0, "unit": "ppm"},
    "lightPpfd":    {"min": 200.0, "max": 600.0,  "unit": "µmol/m²/s"},
    "phLevel":      {"min": 5.8,   "max": 6.8,   "unit": "pH"},
    "nutrientEc":   {"min": 1.5,   "max": 2.8,   "unit": "mS/cm"},
    "waterLitres":  {"min": 100.0, "max": 200.0,  "unit": "L"},
}


def build_system_prompt() -> str:
    threshold_lines = "\n".join(
        f"  - {k}: {v['min']}–{v['max']} {v['unit']}"
        for k, v in THRESHOLDS.items()
    )
    return f"""You are the Mars Greenhouse Orchestrator — an expert autonomous agent managing
a hydroponic greenhouse on Mars. Your job is to:

1. Read the latest sensor data using get_latest_sensor_reading.
2. Query the knowledge base (via MCP tools) for relevant agronomic guidance when values
   are outside normal ranges.
3. Decide on concrete adjustments (e.g. "increase CO₂ injection by 10%", "reduce LED
   intensity", "add 5L of nutrient solution").
4. Write a structured AgentEvent using write_agent_event summarising your findings and
   the action taken.

Optimal ranges for this Martian greenhouse:
{threshold_lines}

Be concise and action-oriented. Always call write_agent_event at the end of your analysis,
even if all readings are nominal (use severity=INFO in that case).
"""


# ── Main entry point ──────────────────────────────────────────────────────────

def run_orchestrator(prompt: str | None = None) -> str:
    """Run one orchestration cycle and return the agent's response."""
    model = BedrockModel(
        model_id=MODEL_ID,
        region_name=AWS_REGION,
        temperature=0.2,
        max_tokens=2048,
    )

    local_tools = [get_latest_sensor_reading, write_agent_event]

    mcp_client = build_mcp_client()
    with mcp_client:
        kb_tools = mcp_client.list_tools_sync()
        logger.info("Loaded %d KB tools from MCP gateway", len(kb_tools))

        agent = Agent(
            model=model,
            tools=local_tools + kb_tools,
            system_prompt=build_system_prompt(),
        )

        user_prompt = prompt or (
            "Analyse the current greenhouse sensor readings, consult the knowledge base "
            "if any values are out of range, and recommend adjustments."
        )

        logger.info("Orchestrator starting cycle...")
        response = agent(user_prompt)
        logger.info("Orchestrator cycle complete.")
        return str(response)


if __name__ == "__main__":
    import sys
    prompt = " ".join(sys.argv[1:]) if len(sys.argv) > 1 else None
    print(run_orchestrator(prompt))
