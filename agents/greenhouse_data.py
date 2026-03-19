"""Helpers for reading live greenhouse data from the Amplify AppSync API."""

from __future__ import annotations

import json
from datetime import datetime
from pathlib import Path
from typing import Any
from urllib.error import URLError
from urllib.request import Request, urlopen

from strands import tool

AMPLIFY_OUTPUTS_PATH = Path(__file__).resolve().parents[1] / "amplify_outputs.json"

GREENHOUSE_QUERY = """
query GreenhouseSnapshot($greenhouseId: String!) {
  listSensorReadings(filter: { greenhouseId: { eq: $greenhouseId } }, limit: 20) {
    items {
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
    }
  }
  listCropRecords(limit: 50) {
    items {
      cropId
      name
      variety
      growthStage
      daysToHarvest
      healthStatus
      zone
    }
  }
  listModuleSummaries(limit: 10) {
    items {
      moduleId
      name
      status
      alert
      harvestScore
      resourcePressure
      astroImpact
      orchestratorSummary
      leadAgent
      updatedAtLabel
    }
  }
  listAgentSnapshots(limit: 20) {
    items {
      moduleId
      agentId
      status
      headline
      riskScore
      timestamp
    }
  }
  listActionRequests(limit: 20) {
    items {
      type
      moduleId
      assignedAgent
      status
      summary
      createdAtLabel
    }
  }
  listActuatorCommands(limit: 20) {
    items {
      commandId
      type
      targetValue
      zone
      unit
      durationSeconds
      status
      executedAt
      result
    }
  }
}
""".strip()


def _load_amplify_data_config() -> tuple[str, str]:
    data = json.loads(AMPLIFY_OUTPUTS_PATH.read_text())
    data_config = data.get("data") or {}
    url = data_config.get("url")
    api_key = data_config.get("api_key")
    if not url or not api_key:
        raise RuntimeError("Amplify data URL or API key is missing from amplify_outputs.json")
    return str(url), str(api_key)


def _post_graphql(query: str, variables: dict[str, Any]) -> dict[str, Any]:
    url, api_key = _load_amplify_data_config()
    request = Request(
        url,
        data=json.dumps({"query": query, "variables": variables}).encode("utf-8"),
        headers={
          "Content-Type": "application/json",
          "x-api-key": api_key,
        },
        method="POST",
    )

    try:
        with urlopen(request, timeout=10) as response:
            payload = json.loads(response.read().decode("utf-8"))
    except URLError as exc:
        raise RuntimeError(f"Unable to reach Amplify AppSync API: {exc}") from exc

    if payload.get("errors"):
        raise RuntimeError(f"Amplify AppSync query failed: {payload['errors'][0].get('message', 'unknown error')}")

    return payload.get("data") or {}


def _sort_by_timestamp(items: list[dict[str, Any]], field: str) -> list[dict[str, Any]]:
    def parse_timestamp(item: dict[str, Any]) -> datetime:
        value = item.get(field) or ""
        return datetime.fromisoformat(value.replace("Z", "+00:00")) if value else datetime.min

    return sorted((item for item in items if item), key=parse_timestamp, reverse=True)


def get_greenhouse_snapshot(greenhouse_id: str = "mars-greenhouse-1") -> dict[str, Any]:
    """Return current greenhouse, crop, and actuator state from AppSync."""
    data = _post_graphql(GREENHOUSE_QUERY, {"greenhouseId": greenhouse_id})

    sensor_items = _sort_by_timestamp(data.get("listSensorReadings", {}).get("items", []), "timestamp")
    actuator_items = _sort_by_timestamp(data.get("listActuatorCommands", {}).get("items", []), "executedAt")
    snapshot_items = _sort_by_timestamp(data.get("listAgentSnapshots", {}).get("items", []), "timestamp")

    return {
        "greenhouseId": greenhouse_id,
        "latestSensorReading": sensor_items[0] if sensor_items else None,
        "cropRecords": data.get("listCropRecords", {}).get("items", []),
        "moduleSummaries": data.get("listModuleSummaries", {}).get("items", []),
        "agentSnapshots": snapshot_items[:8],
        "actionRequests": data.get("listActionRequests", {}).get("items", [])[:8],
        "actuatorCommands": actuator_items[:8],
    }


def format_greenhouse_snapshot(snapshot: dict[str, Any]) -> str:
    """Render the AppSync snapshot into a compact text block for agent prompts."""
    latest = snapshot.get("latestSensorReading") or {}
    crop_records = snapshot.get("cropRecords") or []
    module_summaries = snapshot.get("moduleSummaries") or []
    agent_snapshots = snapshot.get("agentSnapshots") or []
    action_requests = snapshot.get("actionRequests") or []
    actuator_commands = snapshot.get("actuatorCommands") or []

    lines = ["Live greenhouse AppSync data:"]
    if latest:
        lines.extend(
            [
                f"- greenhouseId: {latest.get('greenhouseId', snapshot.get('greenhouseId', 'unknown'))}",
                f"- timestamp: {latest.get('timestamp', 'unknown')}",
                f"- temperature_c: {latest.get('temperature', 'unknown')}",
                f"- humidity_pct: {latest.get('humidity', 'unknown')}",
                f"- co2_ppm: {latest.get('co2Ppm', 'unknown')}",
                f"- light_ppfd: {latest.get('lightPpfd', 'unknown')}",
                f"- ph_level: {latest.get('phLevel', 'unknown')}",
                f"- nutrient_ec: {latest.get('nutrientEc', 'unknown')}",
                f"- water_litres: {latest.get('waterLitres', 'unknown')}",
                f"- radiation_msv: {latest.get('radiationMsv', 'unknown')}",
            ]
        )
    else:
        lines.append("- latest sensor reading: unavailable")

    if crop_records:
        lines.append("- crops: " + "; ".join(
            f"{crop.get('name', 'unknown')} zone={crop.get('zone', 'n/a')} health={crop.get('healthStatus', 'n/a')} growthStage={crop.get('growthStage', 'n/a')} daysToHarvest={crop.get('daysToHarvest', 'n/a')}"
            for crop in crop_records[:8]
        ))

    if module_summaries:
        lines.append("- module summaries: " + "; ".join(
            f"{module.get('name', module.get('moduleId', 'module'))} status={module.get('status', 'n/a')} lead={module.get('leadAgent', 'n/a')} alert={module.get('alert', 'none')}"
            for module in module_summaries[:5]
        ))

    if agent_snapshots:
        lines.append("- agent snapshots: " + "; ".join(
            f"{snapshot_item.get('agentId', 'agent')} status={snapshot_item.get('status', 'n/a')} risk={snapshot_item.get('riskScore', 'n/a')} headline={snapshot_item.get('headline', 'n/a')}"
            for snapshot_item in agent_snapshots[:5]
        ))

    if action_requests:
        lines.append("- action requests: " + "; ".join(
            f"{request.get('type', 'action')} status={request.get('status', 'n/a')} assigned={request.get('assignedAgent', 'n/a')} summary={request.get('summary', 'n/a')}"
            for request in action_requests[:5]
        ))

    if actuator_commands:
        lines.append("- actuator commands: " + "; ".join(
            f"{command.get('type', 'command')} status={command.get('status', 'n/a')} zone={command.get('zone', 'n/a')} target={command.get('targetValue', 'n/a')} result={command.get('result', 'n/a')}"
            for command in actuator_commands[:5]
        ))

    return "\n".join(lines)


@tool
def greenhouse_data_tool(greenhouse_id: str = "mars-greenhouse-1") -> str:
    """Get the latest greenhouse telemetry, crop state, and actuator activity from AppSync."""
    try:
        snapshot = get_greenhouse_snapshot(greenhouse_id)
        return format_greenhouse_snapshot(snapshot)
    except Exception as exc:
        return f"Unable to load greenhouse AppSync data: {exc}"
