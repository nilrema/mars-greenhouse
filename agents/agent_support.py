"""
Shared helpers for the functional Mars agent roles.
"""

from __future__ import annotations

import json
import logging
import uuid
from datetime import datetime, timezone
from typing import Any

from agents.appsync_client import execute_graphql

logger = logging.getLogger(__name__)

DEFAULT_GREENHOUSE_ID = "mars-greenhouse-1"
DEFAULT_CHAOS_TARGETS = ["mars-greenhouse-1", "mars-greenhouse-2"]

LIST_SENSOR_READINGS = """
query ListSensorReadings($filter: ModelSensorReadingFilterInput, $limit: Int) {
  listSensorReadings(filter: $filter, limit: $limit) {
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
      updatedAt
    }
  }
}
"""

LIST_CROP_RECORDS = """
query ListCropRecords($limit: Int) {
  listCropRecords(limit: $limit) {
    items {
      id
      cropId
      name
      variety
      plantedAt
      growthStage
      daysToHarvest
      healthStatus
      zone
      createdAt
      updatedAt
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


def utc_now_iso() -> str:
    return datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")


def safe_load_json(raw: str | dict[str, Any] | list[Any] | None) -> Any:
    if raw is None:
        return None
    if isinstance(raw, (dict, list)):
        return raw
    try:
        return json.loads(raw)
    except json.JSONDecodeError:
        return {"raw": raw}


def list_sensor_readings(greenhouse_id: str, limit: int = 100) -> list[dict[str, Any]]:
    data = execute_graphql(
        LIST_SENSOR_READINGS,
        {"filter": {"greenhouseId": {"eq": greenhouse_id}}, "limit": limit},
    )
    items = data.get("listSensorReadings", {}).get("items", [])
    return [item for item in items if item]


def get_latest_sensor_snapshot(greenhouse_id: str) -> dict[str, Any]:
    items = list_sensor_readings(greenhouse_id, limit=100)
    if not items:
        raise RuntimeError(f"No sensor readings found for greenhouse {greenhouse_id}")
    return max(items, key=lambda item: item.get("timestamp") or item.get("createdAt") or "")


def list_crop_records(limit: int = 200) -> list[dict[str, Any]]:
    data = execute_graphql(LIST_CROP_RECORDS, {"limit": limit})
    items = data.get("listCropRecords", {}).get("items", [])
    return [item for item in items if item]


def write_agent_event(agent_id: str, severity: str, message: str, action_taken: str) -> dict[str, Any]:
    item = {
        "id": str(uuid.uuid4()),
        "agentId": agent_id,
        "timestamp": utc_now_iso(),
        "severity": severity.upper(),
        "message": message,
        "actionTaken": action_taken,
    }
    execute_graphql(CREATE_AGENT_EVENT, {"input": item})
    logger.info("Agent event persisted for %s: %s", agent_id, message)
    return {"status": "ok", "id": item["id"]}
