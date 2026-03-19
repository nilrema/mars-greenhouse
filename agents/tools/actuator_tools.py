"""
Actuator tools for controlling greenhouse equipment via AppSync.
"""

from __future__ import annotations

import json
import logging
import uuid
from datetime import datetime, timezone

from agents.appsync_client import execute_graphql
from agents.tools._compat import tool

logger = logging.getLogger(__name__)

CREATE_ACTUATOR_COMMAND = """
mutation CreateActuatorCommand($input: CreateActuatorCommandInput!) {
  createActuatorCommand(input: $input) {
    id
    commandId
    status
  }
}
"""

GET_ACTUATOR_COMMAND = """
query GetActuatorCommand($id: ID!) {
  getActuatorCommand(id: $id) {
    id
    commandId
    type
    targetValue
    zone
    unit
    durationSeconds
    status
    createdAt
    updatedAt
    executedAt
    result
  }
}
"""


def _create_command(command_type: str, zone: str, **extra: object) -> str:
    command_id = str(uuid.uuid4())
    now = datetime.now(timezone.utc).isoformat()

    data = execute_graphql(
        CREATE_ACTUATOR_COMMAND,
        {
            "input": {
                "id": command_id,
                "commandId": command_id,
                "type": command_type,
                "zone": zone,
                "status": "PENDING",
                **extra,
            }
        },
    )

    result = data["createActuatorCommand"]
    logger.info("Command queued: %s", command_id)
    return json.dumps(
        {
            "status": "COMMAND_QUEUED",
            "commandId": result["commandId"],
            "createdAt": now,
        }
    )


@tool
def adjust_temperature(target_celsius: float, zone: str = "main") -> str:
    try:
        return _create_command(
            "TEMPERATURE_ADJUST",
            zone,
            targetValue=target_celsius,
            unit="celsius",
        )
    except Exception as error:
        logger.error("Failed to send temperature command: %s", error)
        return json.dumps({"error": str(error)})


@tool
def adjust_humidity(target_percent: float, zone: str = "main") -> str:
    try:
        return _create_command(
            "HUMIDITY_ADJUST",
            zone,
            targetValue=target_percent,
            unit="percent",
        )
    except Exception as error:
        logger.error("Failed to send humidity command: %s", error)
        return json.dumps({"error": str(error)})


@tool
def trigger_irrigation(zone_id: str, duration_seconds: int) -> str:
    try:
        return _create_command(
            "IRRIGATION_TRIGGER",
            zone_id,
            durationSeconds=duration_seconds,
        )
    except Exception as error:
        logger.error("Failed to send irrigation command: %s", error)
        return json.dumps({"error": str(error)})


@tool
def adjust_lighting(ppfd_target: float, zone: str = "main") -> str:
    try:
        return _create_command(
            "LIGHTING_ADJUST",
            zone,
            targetValue=ppfd_target,
            unit="ppfd",
        )
    except Exception as error:
        logger.error("Failed to send lighting command: %s", error)
        return json.dumps({"error": str(error)})


@tool
def adjust_co2(target_ppm: int, zone: str = "main") -> str:
    try:
        return _create_command(
            "CO2_ADJUST",
            zone,
            targetValue=target_ppm,
            unit="ppm",
        )
    except Exception as error:
        logger.error("Failed to send CO₂ command: %s", error)
        return json.dumps({"error": str(error)})


@tool
def get_command_status(command_id: str) -> str:
    try:
        data = execute_graphql(GET_ACTUATOR_COMMAND, {"id": command_id})
        command = data.get("getActuatorCommand")
        if not command:
            return json.dumps({"error": f"Command {command_id} not found"})
        return json.dumps(command)
    except Exception as error:
        logger.error("Failed to get command status: %s", error)
        return json.dumps({"error": str(error)})
