"""
Sensor tools for reading greenhouse sensor data from DynamoDB.
"""

import json
import logging
from datetime import datetime, timedelta

import boto3
from strands import tool

logger = logging.getLogger(__name__)

# DynamoDB client
_dynamodb = boto3.resource("dynamodb", region_name="us-east-2")
_sensor_table = _dynamodb.Table("SensorReading")


@tool
def get_latest_sensor_reading(greenhouse_id: str) -> str:
    """Fetch the most recent SensorReading for a specific greenhouse.

    Args:
        greenhouse_id: The ID of the greenhouse (e.g., "mars-greenhouse-1")

    Returns:
        JSON string with temperature (°C), humidity (%), co2Ppm, lightPpfd,
        phLevel, nutrientEc (mS/cm), waterLitres, and radiationMsv.
    """
    try:
        # Query by greenhouseId, sorted by timestamp descending
        response = _sensor_table.query(
            KeyConditionExpression="greenhouseId = :gid",
            ExpressionAttributeValues={":gid": greenhouse_id},
            Limit=1,
            ScanIndexForward=False,  # Most recent first
        )
        items = response.get("Items", [])
        if not items:
            return json.dumps({"error": f"No sensor readings found for greenhouse {greenhouse_id}"})
        
        latest = items[0]
        # Convert Decimal to float for JSON serialization
        result = {}
        for key, value in latest.items():
            if hasattr(value, "__float__"):
                result[key] = float(value)
            else:
                result[key] = value
        
        logger.info("Retrieved latest sensor reading for %s", greenhouse_id)
        return json.dumps(result)
    
    except Exception as e:
        logger.error("Failed to get latest sensor reading: %s", e)
        return json.dumps({"error": str(e)})


@tool
def get_sensor_history(greenhouse_id: str, hours: int = 24) -> str:
    """Fetch sensor readings from the last N hours.

    Args:
        greenhouse_id: The ID of the greenhouse
        hours: Number of hours of history to retrieve (default: 24)

    Returns:
        JSON array of sensor readings, each with timestamp and sensor values.
    """
    try:
        # Calculate time range
        end_time = datetime.utcnow()
        start_time = end_time - timedelta(hours=hours)
        
        # Query by greenhouseId and timestamp range
        response = _sensor_table.query(
            KeyConditionExpression="greenhouseId = :gid AND #ts BETWEEN :start AND :end",
            ExpressionAttributeNames={"#ts": "timestamp"},
            ExpressionAttributeValues={
                ":gid": greenhouse_id,
                ":start": start_time.isoformat() + "Z",
                ":end": end_time.isoformat() + "Z",
            },
            ScanIndexForward=True,  # Oldest first
        )
        
        items = response.get("Items", [])
        if not items:
            return json.dumps({"error": f"No sensor readings found for greenhouse {greenhouse_id} in last {hours} hours"})
        
        # Convert Decimal to float and format results
        results = []
        for item in items:
            formatted = {}
            for key, value in item.items():
                if hasattr(value, "__float__"):
                    formatted[key] = float(value)
                else:
                    formatted[key] = value
            results.append(formatted)
        
        logger.info("Retrieved %d sensor readings for %s (last %d hours)", len(results), greenhouse_id, hours)
        return json.dumps(results)
    
    except Exception as e:
        logger.error("Failed to get sensor history: %s", e)
        return json.dumps({"error": str(e)})


@tool
def get_sensor_statistics(greenhouse_id: str, metric: str, hours: int = 24) -> str:
    """Calculate statistics (min, max, avg) for a specific sensor metric.

    Args:
        greenhouse_id: The ID of the greenhouse
        metric: Sensor metric name (temperature, humidity, co2Ppm, etc.)
        hours: Time window in hours (default: 24)

    Returns:
        JSON with min, max, average, and current value of the metric.
    """
    try:
        # Get history first
        history_json = get_sensor_history(greenhouse_id, hours)
        history = json.loads(history_json)
        
        if "error" in history:
            return history_json
        
        # Extract metric values
        values = []
        for reading in history:
            if metric in reading:
                values.append(reading[metric])
        
        if not values:
            return json.dumps({"error": f"Metric {metric} not found in sensor readings"})
        
        # Calculate statistics
        current = values[-1] if values else None
        stats = {
            "metric": metric,
            "current": current,
            "min": min(values),
            "max": max(values),
            "average": sum(values) / len(values),
            "samples": len(values),
            "time_window_hours": hours,
        }
        
        logger.info("Calculated statistics for %s.%s", greenhouse_id, metric)
        return json.dumps(stats)
    
    except Exception as e:
        logger.error("Failed to calculate sensor statistics: %s", e)
        return json.dumps({"error": str(e)})