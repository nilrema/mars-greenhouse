"""
Actuator tools for controlling greenhouse equipment.
Writes control commands to DynamoDB for Lambda functions to execute.
"""

import json
import logging
import uuid
from datetime import datetime

import boto3
from strands import tool

logger = logging.getLogger(__name__)

# DynamoDB client
_dynamodb = boto3.resource("dynamodb", region_name="us-east-2")
_actuator_table = _dynamodb.Table("ActuatorCommand")


@tool
def adjust_temperature(target_celsius: float, zone: str = "main") -> str:
    """Send a command to adjust greenhouse temperature.

    Args:
        target_celsius: Target temperature in degrees Celsius
        zone: Greenhouse zone identifier (default: "main")

    Returns:
        JSON with command ID and status.
    """
    try:
        command_id = str(uuid.uuid4())
        now = datetime.utcnow().isoformat() + "Z"
        
        command = {
            "commandId": command_id,
            "type": "TEMPERATURE_ADJUST",
            "targetValue": target_celsius,
            "zone": zone,
            "unit": "celsius",
            "status": "PENDING",
            "createdAt": now,
            "executedAt": None,
        }
        
        _actuator_table.put_item(Item=command)
        logger.info("Temperature adjustment command sent: %.1f°C in zone %s", target_celsius, zone)
        
        return json.dumps({
            "status": "COMMAND_QUEUED",
            "commandId": command_id,
            "message": f"Temperature adjustment to {target_celsius}°C queued for zone {zone}",
        })
    
    except Exception as e:
        logger.error("Failed to send temperature command: %s", e)
        return json.dumps({"error": str(e)})


@tool
def adjust_humidity(target_percent: float, zone: str = "main") -> str:
    """Send a command to adjust greenhouse humidity.

    Args:
        target_percent: Target relative humidity percentage (0-100)
        zone: Greenhouse zone identifier (default: "main")

    Returns:
        JSON with command ID and status.
    """
    try:
        command_id = str(uuid.uuid4())
        now = datetime.utcnow().isoformat() + "Z"
        
        command = {
            "commandId": command_id,
            "type": "HUMIDITY_ADJUST",
            "targetValue": target_percent,
            "zone": zone,
            "unit": "percent",
            "status": "PENDING",
            "createdAt": now,
            "executedAt": None,
        }
        
        _actuator_table.put_item(Item=command)
        logger.info("Humidity adjustment command sent: %.1f%% in zone %s", target_percent, zone)
        
        return json.dumps({
            "status": "COMMAND_QUEUED",
            "commandId": command_id,
            "message": f"Humidity adjustment to {target_percent}% queued for zone {zone}",
        })
    
    except Exception as e:
        logger.error("Failed to send humidity command: %s", e)
        return json.dumps({"error": str(e)})


@tool
def trigger_irrigation(zone_id: str, duration_seconds: int) -> str:
    """Send a command to trigger irrigation in a specific zone.

    Args:
        zone_id: Irrigation zone identifier (e.g., "zone-a", "zone-b")
        duration_seconds: Duration of irrigation in seconds

    Returns:
        JSON with command ID and status.
    """
    try:
        command_id = str(uuid.uuid4())
        now = datetime.utcnow().isoformat() + "Z"
        
        command = {
            "commandId": command_id,
            "type": "IRRIGATION_TRIGGER",
            "zone": zone_id,
            "durationSeconds": duration_seconds,
            "status": "PENDING",
            "createdAt": now,
            "executedAt": None,
        }
        
        _actuator_table.put_item(Item=command)
        logger.info("Irrigation command sent: zone %s for %d seconds", zone_id, duration_seconds)
        
        return json.dumps({
            "status": "COMMAND_QUEUED",
            "commandId": command_id,
            "message": f"Irrigation triggered for zone {zone_id} ({duration_seconds}s)",
        })
    
    except Exception as e:
        logger.error("Failed to send irrigation command: %s", e)
        return json.dumps({"error": str(e)})


@tool
def adjust_lighting(ppfd_target: float, zone: str = "main") -> str:
    """Send a command to adjust greenhouse lighting intensity.

    Args:
        ppfd_target: Target PPFD (Photosynthetic Photon Flux Density) in µmol/m²/s
        zone: Greenhouse zone identifier (default: "main")

    Returns:
        JSON with command ID and status.
    """
    try:
        command_id = str(uuid.uuid4())
        now = datetime.utcnow().isoformat() + "Z"
        
        command = {
            "commandId": command_id,
            "type": "LIGHTING_ADJUST",
            "targetValue": ppfd_target,
            "zone": zone,
            "unit": "ppfd",
            "status": "PENDING",
            "createdAt": now,
            "executedAt": None,
        }
        
        _actuator_table.put_item(Item=command)
        logger.info("Lighting adjustment command sent: %.1f PPFD in zone %s", ppfd_target, zone)
        
        return json.dumps({
            "status": "COMMAND_QUEUED",
            "commandId": command_id,
            "message": f"Lighting adjustment to {ppfd_target} PPFD queued for zone {zone}",
        })
    
    except Exception as e:
        logger.error("Failed to send lighting command: %s", e)
        return json.dumps({"error": str(e)})


@tool
def adjust_co2(target_ppm: int, zone: str = "main") -> str:
    """Send a command to adjust CO₂ concentration.

    Args:
        target_ppm: Target CO₂ concentration in parts per million
        zone: Greenhouse zone identifier (default: "main")

    Returns:
        JSON with command ID and status.
    """
    try:
        command_id = str(uuid.uuid4())
        now = datetime.utcnow().isoformat() + "Z"
        
        command = {
            "commandId": command_id,
            "type": "CO2_ADJUST",
            "targetValue": target_ppm,
            "zone": zone,
            "unit": "ppm",
            "status": "PENDING",
            "createdAt": now,
            "executedAt": None,
        }
        
        _actuator_table.put_item(Item=command)
        logger.info("CO₂ adjustment command sent: %d ppm in zone %s", target_ppm, zone)
        
        return json.dumps({
            "status": "COMMAND_QUEUED",
            "commandId": command_id,
            "message": f"CO₂ adjustment to {target_ppm} ppm queued for zone {zone}",
        })
    
    except Exception as e:
        logger.error("Failed to send CO₂ command: %s", e)
        return json.dumps({"error": str(e)})


@tool
def get_command_status(command_id: str) -> str:
    """Check the status of a previously sent actuator command.

    Args:
        command_id: The command ID returned by an actuator tool

    Returns:
        JSON with command details and current status.
    """
    try:
        response = _actuator_table.get_item(Key={"commandId": command_id})
        command = response.get("Item")
        
        if not command:
            return json.dumps({"error": f"Command {command_id} not found"})
        
        return json.dumps(command)
    
    except Exception as e:
        logger.error("Failed to get command status: %s", e)
        return json.dumps({"error": str(e)})