"""
Mars Greenhouse Orchestrator Agent
Reads sensor data from DynamoDB, queries the AgentCore KB via MCP,
delegates to sub-agents, tracks mission nutrition, and manages priorities.
"""

import json
import logging
import os
from datetime import datetime, timedelta, timezone
from pathlib import Path
from typing import Optional

import httpx
from mcp.client.streamable_http import streamablehttp_client
from strands import Agent, tool
from strands.models import BedrockModel
from strands.tools.mcp import MCPClient

from agents.appsync_client import execute_graphql, get_runtime_region

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger(__name__)

# ── Configuration ────────────────────────────────────────────────────────────

KB_MCP_URL = os.environ.get("KB_MCP_URL", "https://kb-start-hack-gateway-buyjtibfpg.gateway.bedrock-agentcore.us-east-2.amazonaws.com/mcp")
GATEWAY_CLIENT_ID = os.environ.get("GATEWAY_CLIENT_ID", "")
GATEWAY_CLIENT_SECRET = os.environ.get("GATEWAY_CLIENT_SECRET", "")
GATEWAY_TOKEN_ENDPOINT = os.environ.get("GATEWAY_TOKEN_ENDPOINT", "")
GATEWAY_SCOPE = os.environ.get("GATEWAY_SCOPE", "")

AWS_REGION = get_runtime_region()
MODEL_ID = "us.anthropic.claude-sonnet-4-5-20250929-v1:0"

# ── Mission constants ────────────────────────────────────────────────────────

MISSION_DURATION_SOLS = 450
ASTRONAUT_COUNT = 4
KCAL_PER_ASTRONAUT_PER_SOL = 2300
ACTION_LOG_PATH = Path(__file__).resolve().parent / "action_log.json"

# ── OAuth2 token cache ───────────────────────────────────────────────────────

_token_cache: dict = {"token": None, "expires_at": None}


def get_oauth_token() -> str:
    """Fetch and cache an OAuth2 client-credentials token for the KB gateway."""
    now = datetime.now()
    if _token_cache["token"] and _token_cache["expires_at"] and now < _token_cache["expires_at"]:
        return _token_cache["token"]

    if not all([GATEWAY_CLIENT_ID, GATEWAY_CLIENT_SECRET, GATEWAY_TOKEN_ENDPOINT]):
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
    expires_in = data.get("expires_in", 3600) - 300
    _token_cache["token"] = token
    _token_cache["expires_at"] = now + timedelta(seconds=expires_in)
    logger.info("OAuth token refreshed, expires in %ds", expires_in)
    return token


def build_mcp_client() -> MCPClient:
    """Return an MCPClient pointed at the AgentCore KB gateway."""
    token = get_oauth_token()
    headers = {"Authorization": f"Bearer {token}"} if token else {}
    return MCPClient(lambda: streamablehttp_client(KB_MCP_URL, headers=headers))


# ── Action Memory ────────────────────────────────────────────────────────────

def load_action_log() -> list:
    """Load previous cycle actions from disk."""
    if ACTION_LOG_PATH.exists():
        try:
            with open(ACTION_LOG_PATH, "r") as f:
                return json.load(f)
        except (json.JSONDecodeError, IOError):
            return []
    return []


def save_action_log(actions: list) -> None:
    """Persist actions taken this cycle for next cycle's memory."""
    # Keep only the last 20 actions to avoid unbounded growth
    actions = actions[-20:]
    with open(ACTION_LOG_PATH, "w") as f:
        json.dump(actions, f, indent=2, default=str)


# ── Mission Clock ────────────────────────────────────────────────────────────

def get_mission_sol() -> int:
    """
    Calculate current mission Sol from mission start date.
    Falls back to environment variable MISSION_START_DATE or defaults to Sol 1.
    A Mars sol is 24h 37m 22s = 88,642 seconds.
    """
    start_str = os.environ.get("MISSION_START_DATE", "")
    if not start_str:
        # Default: mission started 30 days ago for demo purposes
        start = datetime.now(timezone.utc) - timedelta(days=30)
    else:
        start = datetime.fromisoformat(start_str)

    elapsed_seconds = (datetime.now(timezone.utc) - start).total_seconds()
    mars_sol_seconds = 88642
    return max(1, int(elapsed_seconds / mars_sol_seconds) + 1)


# ── DynamoDB tools ───────────────────────────────────────────────────────────

LIST_SENSOR_READINGS = """
query ListSensorReadings($limit: Int) {
  listSensorReadings(limit: $limit) {
    items {
      id
      greenhouseId
      timestamp
      temperature
      humidity
      co2Ppm
      lightPpfd
      phLevel
      nutrientEc
      waterLitres
      radiationMsv
      createdAt
    }
  }
}
"""

CREATE_AGENT_EVENT = """
mutation CreateAgentEvent($input: CreateAgentEventInput!) {
  createAgentEvent(input: $input) {
    id
  }
}
"""


@tool
def get_latest_sensor_reading() -> str:
    """Fetch the most recent SensorReading record from DynamoDB.

    Returns a JSON string with temperature (°C), humidity (%), co2Ppm,
    lightPpfd (µmol/m²/s), phLevel, nutrientEc (mS/cm), and waterLitres.
    """
    result = execute_graphql(LIST_SENSOR_READINGS, {"limit": 100})
    items = result.get("listSensorReadings", {}).get("items", [])
    if not items:
        return json.dumps({"error": "No sensor readings found"})
    items.sort(key=lambda x: x.get("createdAt", ""), reverse=True)
    latest = items[0]
    return json.dumps(latest)


@tool
def write_agent_event(severity: str, message: str, action_taken: str) -> str:
    """Persist an AgentEvent to DynamoDB so the React dashboard can display it.

    Args:
        severity: One of INFO, WARNING, CRITICAL
        message: Human-readable description of what the agent observed
        action_taken: The adjustment or recommendation the agent made
    """
    import uuid
    now = datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")
    item = {
        "id": str(uuid.uuid4()),
        "agentId": "orchestrator",
        "severity": severity.upper(),
        "message": message,
        "actionTaken": action_taken,
        "timestamp": now,
    }
    execute_graphql(CREATE_AGENT_EVENT, {"input": item})
    logger.info("AgentEvent written: %s", message)
    return json.dumps({"status": "ok", "id": item["id"]})


# ── Sub-agent delegation tools ───────────────────────────────────────────────

@tool
def delegate_environment_check(greenhouse_id: str = "mars-greenhouse-1") -> str:
    """Delegate environmental analysis to the Environment Agent.

    The environment agent checks temperature, humidity, CO₂, and lighting,
    queries the knowledge base for crop-specific guidance, and issues
    actuator commands as needed.

    Args:
        greenhouse_id: ID of the greenhouse to analyze
    """
    try:
        from agents.environment_agent import run_environment_agent
        result = run_environment_agent(greenhouse_id)
        return json.dumps({"status": "completed", "agent": "environment", "result": str(result)[:2000]})
    except Exception as e:
        logger.error("Environment agent delegation failed: %s", e)
        return json.dumps({"status": "error", "agent": "environment", "error": str(e)})


@tool
def delegate_resource_check() -> str:
    """Delegate resource management to the Resource Agent.

    The resource agent tracks water consumption rate, projects days-remaining,
    manages nutrient EC and pH, and throttles irrigation when reserves
    drop below 30%.
    """
    try:
        from agents.resource_agent import run_resource_agent
        result = run_resource_agent()
        return json.dumps({"status": "completed", "agent": "resource", "result": str(result)[:2000]})
    except Exception as e:
        logger.error("Resource agent delegation failed: %s", e)
        return json.dumps({"status": "error", "agent": "resource", "error": str(e)})


@tool
def delegate_stress_check(greenhouse_id: str = "mars-greenhouse-1") -> str:
    """Delegate plant health monitoring to the Stress Agent.

    The stress agent detects anomalies, performs visual disease detection,
    and writes CRITICAL AgentEvents when stress is detected.

    Args:
        greenhouse_id: ID of the greenhouse to monitor
    """
    try:
        from agents.stress_agent import run_stress_agent
        result = run_stress_agent(greenhouse_id)
        return json.dumps({"status": "completed", "agent": "stress", "result": str(result)[:2000]})
    except Exception as e:
        logger.error("Stress agent delegation failed: %s", e)
        return json.dumps({"status": "error", "agent": "stress", "error": str(e)})


@tool
def get_mission_status() -> str:
    """Get current mission clock, nutritional projections, and action history.

    Returns mission Sol, days remaining, caloric projections, and
    the last 5 actions taken by agents to avoid repeating commands.
    """
    sol = get_mission_sol()
    sols_remaining = max(0, MISSION_DURATION_SOLS - sol)
    kcal_needed = ASTRONAUT_COUNT * KCAL_PER_ASTRONAUT_PER_SOL * sols_remaining
    previous_actions = load_action_log()

    return json.dumps({
        "current_sol": sol,
        "mission_duration": MISSION_DURATION_SOLS,
        "sols_remaining": sols_remaining,
        "astronaut_count": ASTRONAUT_COUNT,
        "kcal_per_astronaut_per_sol": KCAL_PER_ASTRONAUT_PER_SOL,
        "kcal_needed_remaining": kcal_needed,
        "mission_phase": (
            "EARLY" if sol < 100 else
            "MID" if sol < 300 else
            "LATE" if sol < 400 else
            "FINAL"
        ),
        "strategy_note": (
            "Focus on establishing all crop zones and building food reserves."
            if sol < 100 else
            "Steady-state production. Optimize yields and monitor for stress."
            if sol < 300 else
            "Late mission. Prioritize fast-growing calorie-dense crops."
            if sol < 400 else
            "FINAL PHASE. Only plant crops that can harvest before mission end."
        ),
        "previous_actions": previous_actions[-5:],
    })


@tool
def record_action(action_description: str, action_type: str) -> str:
    """Record an action taken by the orchestrator for memory persistence.

    Args:
        action_description: What was done
        action_type: Category (ENVIRONMENTAL, RESOURCE, STRESS, NUTRITIONAL)
    """
    actions = load_action_log()
    actions.append({
        "timestamp": datetime.now(timezone.utc).isoformat().replace("+00:00", "Z"),
        "sol": get_mission_sol(),
        "action": action_description,
        "type": action_type,
    })
    save_action_log(actions)
    return json.dumps({"status": "recorded"})


@tool
def verify_last_action() -> str:
    """Verify the effect of the last action by comparing sensor readings.

    Reads the most recent sensor data and checks whether conditions
    have improved since the last action was taken. This implements
    the feedback loop.
    """
    actions = load_action_log()
    latest_reading_json = get_latest_sensor_reading()
    latest = json.loads(latest_reading_json)

    if "error" in latest:
        return json.dumps({"verification": "UNABLE", "reason": "No sensor data available"})

    if not actions:
        return json.dumps({"verification": "NO_PREVIOUS_ACTIONS", "current_readings": latest})

    last_action = actions[-1]
    return json.dumps({
        "verification": "CHECK_REQUIRED",
        "last_action": last_action,
        "current_readings": {
            "temperature": latest.get("temperature"),
            "humidity": latest.get("humidity"),
            "co2Ppm": latest.get("co2Ppm"),
            "lightPpfd": latest.get("lightPpfd"),
            "phLevel": latest.get("phLevel"),
            "nutrientEc": latest.get("nutrientEc"),
            "waterLitres": latest.get("waterLitres"),
        },
        "instruction": (
            "Compare current readings against the expected effect of the last action. "
            "If the readings confirm the change worked, report SUCCESS. "
            "If not, determine if the action needs to be repeated or adjusted."
        ),
    })


# ── Greenhouse thresholds ────────────────────────────────────────────────────

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

    sol = get_mission_sol()
    sols_remaining = max(0, MISSION_DURATION_SOLS - sol)

    return f"""You are the autonomous manager of a Martian greenhouse sustaining {ASTRONAUT_COUNT} astronauts
for a {MISSION_DURATION_SOLS}-sol mission. You make all decisions about crop management, resource
allocation, and environmental control.

MISSION PARAMETERS:
- {ASTRONAUT_COUNT} astronauts requiring {KCAL_PER_ASTRONAUT_PER_SOL} kcal/person/sol
- Total mission caloric need: {ASTRONAUT_COUNT * KCAL_PER_ASTRONAUT_PER_SOL * MISSION_DURATION_SOLS:,} kcal
- Water is non-renewable beyond recycling — treat every litre as critical
- Resupply is impossible — equipment failures must be managed with what exists
- Current Sol: {sol}
- Sols Remaining: {sols_remaining}

DECISION PRIORITY ORDER (never violate this):
1. CREW NUTRITION — if food supply drops below 60 days, emergency replanting overrides everything
2. RESOURCE CONSERVATION — never deplete water below 20% reserve; throttle irrigation at 30%
3. ENVIRONMENTAL STABILITY — keep all metrics within crop-viable ranges
4. YIELD OPTIMIZATION — maximize caloric output within constraints

WHEN MULTIPLE CRISES OCCUR SIMULTANEOUSLY:
- Water critically low AND CO₂ elevated → address water FIRST (crew dies without water before CO₂ kills crops)
- Temperature extreme AND nutrient imbalance → address temperature FIRST (plants die faster from thermal shock)
- Always resolve life-threatening issues before optimisation issues

FEEDBACK LOOP:
- After issuing any command, use verify_last_action to check if the next sensor reading confirms the change worked
- If the change did not work, escalate or adjust the approach

MEMORY:
- Use get_mission_status to see what actions were taken in the previous cycle
- Do NOT repeat the same action if it was already taken recently unless verification shows it failed
- Use record_action to log every action you take

Optimal ranges for this Martian greenhouse:
{threshold_lines}

YOUR WORKFLOW EACH CYCLE:
1. Call get_mission_status to understand current sol, nutrition, and recent actions
2. Call get_latest_sensor_reading for current conditions
3. Verify the last action's effectiveness with verify_last_action
4. Delegate to sub-agents as needed:
   - delegate_environment_check for temperature/humidity/CO₂/light issues
   - delegate_resource_check for water/nutrient/power management
   - delegate_stress_check for plant health anomalies
5. Record all actions taken with record_action
6. Write a final AgentEvent summary with write_agent_event

Be concise and action-oriented. Always log your reasoning.
"""


# ── Main entry point ─────────────────────────────────────────────────────────

def run_orchestrator(prompt: str | None = None) -> str:
    """Run one orchestration cycle and return the agent's response."""
    model = BedrockModel(
        model_id=MODEL_ID,
        region_name=AWS_REGION,
        temperature=0.2,
        max_tokens=2048,
    )

    local_tools = [
        get_latest_sensor_reading,
        write_agent_event,
        get_mission_status,
        record_action,
        verify_last_action,
        delegate_environment_check,
        delegate_resource_check,
        delegate_stress_check,
    ]

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
            "Run a full orchestration cycle: check mission status, read sensors, "
            "verify previous actions, delegate to sub-agents as needed, "
            "and log all decisions. Follow the priority ordering strictly."
        )

        logger.info("Orchestrator starting cycle (Sol %d)...", get_mission_sol())
        response = agent(user_prompt)
        logger.info("Orchestrator cycle complete.")
        return str(response)


if __name__ == "__main__":
    import sys
    prompt = " ".join(sys.argv[1:]) if len(sys.argv) > 1 else None
    print(run_orchestrator(prompt))
