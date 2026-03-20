"""Minimal orchestrator for the frontend chat flow."""

from __future__ import annotations

import os
import re
from contextvars import ContextVar
from typing import Any

from strands import Agent, tool

from .bedrock_config import resolve_bedrock_model
from .greenhouse_data import (
    clear_required_fresh_after_timestamp,
    format_greenhouse_snapshot,
    get_greenhouse_snapshot,
    set_required_fresh_after_timestamp,
)
from .mcp import build_mars_kb_tools
from .response_cleaning import format_action_response
from .specialized_agents import (
    astro_agent,
    crop_agent,
    environment_agent,
    resource_agent,
)

ORCHESTRATOR_SYSTEM_PROMPT = """
You are the orchestrator for a Mars greenhouse control-room chat built with Strands.
This demo is a bounded scenario lab, not a general-purpose advisor.

Routing rules:
- Temperature deviation -> use environment_agent.
- Crop harvest-near-ready situations -> use crop_agent.
- Crew hydration, protein intake, nutrition impact, or crew planting needs -> use astro_agent.
- Water recycling drops, power availability drops, or humidity sensor failure risk -> use resource_agent.
- Queries that touch several concerns can call multiple relevant specialist tools and then combine only their approved actions.
- Very simple conversational queries can be answered directly without calling a specialist.

When Mars greenhouse context helps, you may also use the Mars knowledge base MCP tools.
Treat specialist outputs as the source of truth for actions. Do not invent new action types.
Final answer rules:
- Return plain text only.
- Return a very brief operator action list with flat bullets only.
- Use at most 4 bullets.
- Each bullet must start with "- ".
- Do not add long explanations, sections, or routing chatter.
- If no action is needed, return "- No immediate action required."
""".strip()

VISIBLE_AGENT_STEPS = {
    "environment": "Using environment_agent to evaluate climate and power stress.",
    "crop": "Using crop_agent to assess crop stress and harvest impact.",
    "astro": "Using astro_agent to assess crew and nutrition impact.",
    "resource": "Using resource_agent to evaluate water and power constraints.",
}

ROUTING_KEYWORDS = {
    "environment": ("temperature", "too cold", "too hot", "cooling", "heating", "climate"),
    "crop": ("crop", "harvest", "harvest-ready", "98%", "yield"),
    "astro": ("crew", "astronaut", "nutrition", "protein", "hydration", "food"),
    "resource": ("water", "recycling", "power", "led", "humidity sensor", "failure risk", "pump"),
}

CURRENT_STATE_QUERY_RE = re.compile(
    r"\b(current|latest|now)\b.*\b(temperature|temp|water|recycling|power|state|conditions)\b|\bwhat(?:'s| is)\b.*\b(temperature|temp|state|conditions)\b",
    re.IGNORECASE,
)

LOW_TEMP_THRESHOLD_C = 21.0
HIGH_TEMP_THRESHOLD_C = 24.0
LOW_WATER_RECYCLING_THRESHOLD_PCT = 70
LOW_POWER_THRESHOLD_PCT = 80
TOOL_CALL_FALLBACK_LABEL = "Action"
_USED_SPECIALISTS: ContextVar[tuple[str, ...]] = ContextVar("_USED_SPECIALISTS", default=())


def _record_specialist_use(agent_id: str) -> None:
    current = _USED_SPECIALISTS.get()
    if agent_id not in current:
        _USED_SPECIALISTS.set((*current, agent_id))


@tool
def tracked_environment_agent(query: str) -> str:
    """Tracked wrapper around environment_agent for orchestrator routing."""
    _record_specialist_use("environment")
    return environment_agent(query)


@tool
def tracked_crop_agent(query: str) -> str:
    """Tracked wrapper around crop_agent for orchestrator routing."""
    _record_specialist_use("crop")
    return crop_agent(query)


@tool
def tracked_astro_agent(query: str) -> str:
    """Tracked wrapper around astro_agent for orchestrator routing."""
    _record_specialist_use("astro")
    return astro_agent(query)


@tool
def tracked_resource_agent(query: str) -> str:
    """Tracked wrapper around resource_agent for orchestrator routing."""
    _record_specialist_use("resource")
    return resource_agent(query)


def create_orchestrator_agent() -> Agent:
    """Build the orchestrator agent with specialist tools and Mars MCP access."""
    return Agent(
        model=resolve_bedrock_model("orchestrator"),
        name="chat_orchestrator",
        system_prompt=ORCHESTRATOR_SYSTEM_PROMPT,
        tools=[
            tracked_environment_agent,
            tracked_crop_agent,
            tracked_astro_agent,
            tracked_resource_agent,
            *build_mars_kb_tools(),
        ],
    )


def _build_orchestrator_query(query: str) -> str:
    relevant_agents = preview_agent_usage(query)
    allowed_specialists = ", ".join(f"{agent}_agent" for agent in relevant_agents)
    return (
        f"Operator request:\n{query}\n\n"
        "Relevant specialists for this request:\n"
        f"- {allowed_specialists}\n\n"
        "Use only the relevant specialist tools unless the request clearly contains another supported scenario. "
        "Summarize the result as brief action bullets only."
    )


def _parse_operator_telemetry(operator_telemetry: dict[str, Any] | None) -> dict[str, Any] | None:
    if not isinstance(operator_telemetry, dict):
        return None

    timestamp = operator_telemetry.get("timestamp")
    temperature = operator_telemetry.get("temperature")
    humidity = operator_telemetry.get("humidity")
    water_recycling = operator_telemetry.get("waterRecycling")
    power_availability = operator_telemetry.get("powerAvailability")
    crop_stress_index = operator_telemetry.get("cropStressIndex")
    health_score = operator_telemetry.get("healthScore")
    if not isinstance(timestamp, str):
        return None

    parsed_health_score = float(health_score) if isinstance(health_score, (int, float)) else None
    parsed_crop_stress_index = (
        float(crop_stress_index)
        if isinstance(crop_stress_index, (int, float))
        else (100.0 - parsed_health_score if parsed_health_score is not None else None)
    )

    return {
        "timestamp": timestamp,
        "temperature": float(temperature) if isinstance(temperature, (int, float)) else None,
        "humidity": float(humidity) if isinstance(humidity, (int, float)) else None,
        "waterRecycling": float(water_recycling) if isinstance(water_recycling, (int, float)) else None,
        "powerAvailability": float(power_availability) if isinstance(power_availability, (int, float)) else None,
        "cropStressIndex": parsed_crop_stress_index,
        "healthScore": parsed_health_score,
    }


def _get_effective_conditions(
    snapshot: dict[str, Any],
    operator_telemetry: dict[str, Any] | None = None,
) -> dict[str, Any]:
    latest = dict(snapshot.get("latestSensorReading") or {})
    telemetry = _parse_operator_telemetry(operator_telemetry)
    if telemetry:
        latest["timestamp"] = telemetry["timestamp"]
        if telemetry["temperature"] is not None:
            latest["temperature"] = telemetry["temperature"]
        if telemetry["humidity"] is not None:
            latest["humidity"] = telemetry["humidity"]
        if telemetry["waterRecycling"] is not None:
            latest["recycleRatePercent"] = telemetry["waterRecycling"]
            latest["waterLitres"] = round((telemetry["waterRecycling"] / 100) * 4200)
        if telemetry["powerAvailability"] is not None:
            latest["powerKw"] = round((telemetry["powerAvailability"] / 100) * 9.2, 2)
            latest["lightPpfd"] = round(telemetry["powerAvailability"] * 9.2)
        if telemetry["cropStressIndex"] is not None:
            latest["cropStressIndex"] = telemetry["cropStressIndex"]
    return latest


def _is_current_state_query(query: str) -> bool:
    return bool(CURRENT_STATE_QUERY_RE.search(query))


def _format_current_state_response(conditions: dict[str, Any]) -> str:
    bullets: list[str] = []
    if conditions.get("temperature") is not None:
        bullets.append(f"Current temperature: {conditions['temperature']:.2f}°C")
    if conditions.get("humidity") is not None:
        bullets.append(f"Current humidity: {conditions['humidity']:.0f}%")
    if conditions.get("recycleRatePercent") is not None:
        bullets.append(f"Water recycling: {conditions['recycleRatePercent']:.0f}%")
    if conditions.get("powerKw") is not None:
        power_pct = round((float(conditions["powerKw"]) / 9.2) * 100)
        bullets.append(f"Power availability: {power_pct}%")
    crop_stress = conditions.get("cropStressIndex")
    if isinstance(crop_stress, (int, float)):
        health_score = max(0, min(100, round(100 - float(crop_stress))))
        bullets.append(f"Health score: {health_score}")
    return "\n".join(f"- {bullet}" for bullet in bullets[:5]) or "- Current telemetry is unavailable."


def _extract_action_lines(response: str) -> list[str]:
    actions: list[str] = []
    for line in response.splitlines():
        normalized = line.strip()
        if normalized.startswith("- "):
            actions.append(normalized[2:].strip())
    return actions


def _power_availability_pct(conditions: dict[str, Any]) -> int | None:
    power_kw = conditions.get("powerKw")
    if not isinstance(power_kw, (int, float)):
        return None
    return round((float(power_kw) / 9.2) * 100)


def _build_tool_call(
    action_type: str,
    summary: str,
    *,
    label: str,
    agent: str,
    metadata: dict[str, Any] | None = None,
) -> dict[str, Any]:
    return {
        "type": action_type,
        "label": label,
        "summary": summary,
        "agent": agent,
        "metadata": metadata or {},
    }


def _build_tool_calls_from_actions(actions: list[str], conditions: dict[str, Any]) -> list[dict[str, Any]]:
    tool_calls: list[dict[str, Any]] = []
    current_temperature = conditions.get("temperature")
    current_recycling = conditions.get("recycleRatePercent")
    current_power = _power_availability_pct(conditions)

    for action in actions:
        lowered = action.lower()
        if "turn on the heating" in lowered or "turn heating on" in lowered or "heating" in lowered:
            target_temperature = 22.0
            tool_calls.append(
                _build_tool_call(
                    "turn_on_heater",
                    action,
                    label="Heater",
                    agent="environment",
                    metadata={
                        "currentTemperature": current_temperature,
                        "targetTemperature": target_temperature,
                    },
                )
            )
            continue

        if "turn on the cooling" in lowered or "cooling" in lowered:
            target_temperature = 22.0
            tool_calls.append(
                _build_tool_call(
                    "turn_on_cooling",
                    action,
                    label="Cooling",
                    agent="environment",
                    metadata={
                        "currentTemperature": current_temperature,
                        "targetTemperature": target_temperature,
                    },
                )
            )
            continue

        if "irrigation pump" in lowered or "increase flow" in lowered:
            current_value = float(current_recycling) if isinstance(current_recycling, (int, float)) else None
            target_value = min(92.0, (current_value or 70.0) + 18.0)
            tool_calls.append(
                _build_tool_call(
                    "increase_irrigation_pump",
                    action,
                    label="Pump",
                    agent="resource",
                    metadata={
                        "currentWaterRecycling": current_value,
                        "targetWaterRecycling": target_value,
                    },
                )
            )
            continue

        if "reduce led" in lowered or "led light usage" in lowered:
            current_value = float(current_power) if isinstance(current_power, int) else current_power
            target_value = min(100.0, max(55.0, (current_value or 40.0) + 22.0))
            tool_calls.append(
                _build_tool_call(
                    "reduce_led_light_usage",
                    action,
                    label="LED",
                    agent="resource",
                    metadata={
                        "currentPowerAvailability": current_value,
                        "targetPowerAvailability": target_value,
                        "targetLedBrightness": 24,
                    },
                )
            )
            continue

        if "replace the humidity sensor" in lowered or "humidity sensor" in lowered:
            tool_calls.append(
                _build_tool_call(
                    "replace_humidity_sensor",
                    action,
                    label="Sensor",
                    agent="resource",
                )
            )
            continue

        tool_calls.append(
            _build_tool_call(
                "operator_action",
                action,
                label=TOOL_CALL_FALLBACK_LABEL,
                agent="orchestrator",
            )
        )

    for index, tool_call in enumerate(tool_calls, start=1):
        tool_call["id"] = f"{tool_call['type']}-{index}"

    return tool_calls


def _format_tool_call_response(tool_calls: list[dict[str, Any]], fallback_response: str) -> str:
    if not tool_calls:
        return fallback_response
    return "\n".join(f"- {tool_call['summary']}" for tool_call in tool_calls[:4])


def _resolve_data_actions(query: str, conditions: dict[str, Any]) -> list[str]:
    lowered_query = query.lower()
    actions: list[str] = []

    temperature = conditions.get("temperature")
    if isinstance(temperature, (int, float)) and ("temperature" in lowered_query or "climate" in lowered_query or "simulation" in lowered_query):
        if temperature < LOW_TEMP_THRESHOLD_C:
            actions.append(f"Turn on the heating because the temperature is {temperature:.2f}°C")
        elif temperature > HIGH_TEMP_THRESHOLD_C:
            actions.append(f"Turn on the cooling because the temperature is {temperature:.2f}°C")

    recycle_rate = conditions.get("recycleRatePercent")
    if isinstance(recycle_rate, (int, float)) and ("water" in lowered_query or "recycling" in lowered_query or "simulation" in lowered_query):
        if recycle_rate < LOW_WATER_RECYCLING_THRESHOLD_PCT:
            actions.append(
                f"Increase flow in the irrigation pump because water recycling is at {recycle_rate:.0f}%"
            )

    power_kw = conditions.get("powerKw")
    if isinstance(power_kw, (int, float)) and ("power" in lowered_query or "led" in lowered_query or "simulation" in lowered_query):
        power_pct = (float(power_kw) / 9.2) * 100
        if power_pct < LOW_POWER_THRESHOLD_PCT:
            actions.append(f"Reduce LED light usage because power availability is at {power_pct:.0f}%")

    if "humidity sensor" in lowered_query and "failure risk" in lowered_query and "high" in lowered_query:
        actions.append("Replace the humidity sensor because failure risk is high")

    deduped: list[str] = []
    for action in actions:
        if action not in deduped:
            deduped.append(action)
    return deduped

def _resolve_chat_payload(
    query: str,
    *,
    fresh_after_timestamp: str | None = None,
    greenhouse_id: str | None = None,
    operator_telemetry: dict[str, Any] | None = None,
) -> dict[str, Any]:
    cleaned_query = query.strip()
    if not cleaned_query:
        return {
            "steps": [],
            "toolCalls": [],
            "response": "Please enter a question for the agent system.",
            "telemetryContext": {
                "greenhouseId": greenhouse_id or os.getenv("GREENHOUSE_ID", "mars-greenhouse-1"),
                "freshAfterTimestamp": fresh_after_timestamp,
            },
        }

    steps: list[dict[str, str]] = []
    if _is_current_state_query(cleaned_query):
        steps = [
            {
                "agent": "orchestrator",
                "message": "Reading the latest greenhouse telemetry for your request.",
            }
        ]

    try:
        set_required_fresh_after_timestamp(fresh_after_timestamp)
        snapshot = get_greenhouse_snapshot(fresh_after_timestamp=fresh_after_timestamp)
        effective_conditions = _get_effective_conditions(snapshot, operator_telemetry)

        if _is_current_state_query(cleaned_query):
            response = _format_current_state_response(effective_conditions)
            tool_calls: list[dict[str, Any]] = []
        else:
            context_query = (
                f"{_build_orchestrator_query(cleaned_query)}\n\n"
                "Operator-confirmed telemetry for this request:\n"
                f"{format_greenhouse_snapshot({'latestSensorReading': effective_conditions, 'greenhouseId': snapshot.get('greenhouseId')})}"
            )
            used_specialists_token = _USED_SPECIALISTS.set(())
            try:
                model_response = format_action_response(
                    str(create_orchestrator_agent()(context_query)).strip(),
                    max_bullets=4,
                )
                used_specialists = list(_USED_SPECIALISTS.get())
            finally:
                _USED_SPECIALISTS.reset(used_specialists_token)

            steps = [
                {
                    "agent": agent_id,
                    "message": VISIBLE_AGENT_STEPS[agent_id],
                }
                for agent_id in used_specialists
            ]
            tool_calls = _build_tool_calls_from_actions(_extract_action_lines(model_response), effective_conditions)
            response = _format_tool_call_response(tool_calls, model_response)

        return {
            "steps": steps,
            "toolCalls": tool_calls,
            "response": response,
            "telemetryContext": {
                "greenhouseId": greenhouse_id or os.getenv("GREENHOUSE_ID", "mars-greenhouse-1"),
                "freshAfterTimestamp": fresh_after_timestamp,
            },
        }
    except Exception as exc:
        return {
            "steps": steps,
            "toolCalls": [],
            "response": f"Sorry, the agent orchestrator is unavailable right now: {exc}",
            "telemetryContext": {
                "greenhouseId": greenhouse_id or os.getenv("GREENHOUSE_ID", "mars-greenhouse-1"),
                "freshAfterTimestamp": fresh_after_timestamp,
            },
        }
    finally:
        clear_required_fresh_after_timestamp()


def handle_chat(
    query: str,
    *,
    fresh_after_timestamp: str | None = None,
    operator_telemetry: dict[str, Any] | None = None,
) -> str:
    """Handle one frontend chat turn and return a plain-text response."""
    return _resolve_chat_payload(
        query,
        fresh_after_timestamp=fresh_after_timestamp,
        operator_telemetry=operator_telemetry,
    )["response"]


def preview_agent_usage(query: str) -> list[str]:
    """Return a lightweight list of likely specialist agents for UI step rendering."""
    lowered_query = query.lower()
    matched_agents = [
        agent_id
        for agent_id, keywords in ROUTING_KEYWORDS.items()
        if any(keyword in lowered_query for keyword in keywords)
    ]
    return matched_agents or ["environment"]


def handle_chat_turn(
    query: str,
    *,
    fresh_after_timestamp: str | None = None,
    greenhouse_id: str | None = None,
    operator_telemetry: dict[str, Any] | None = None,
) -> dict[str, Any]:
    """Return a simple chat payload with visible routing steps and the final response."""
    return _resolve_chat_payload(
        query,
        fresh_after_timestamp=fresh_after_timestamp,
        greenhouse_id=greenhouse_id,
        operator_telemetry=operator_telemetry,
    )


def run_orchestrator(query: str) -> str:
    """Compatibility wrapper used by the older integration test scaffolding."""
    return handle_chat(query)
