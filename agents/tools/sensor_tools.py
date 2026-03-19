"""
Sensor tools for reading greenhouse sensor data from AppSync.
"""

from __future__ import annotations

import json
import logging
from datetime import datetime, timedelta, timezone

from agents.appsync_client import execute_graphql
from agents.tools._compat import tool

logger = logging.getLogger(__name__)

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


def _load_sensor_readings(greenhouse_id: str, limit: int = 100) -> list[dict]:
    data = execute_graphql(
        LIST_SENSOR_READINGS,
        {
            "filter": {"greenhouseId": {"eq": greenhouse_id}},
            "limit": limit,
        },
    )
    items = data.get("listSensorReadings", {}).get("items", [])
    return [item for item in items if item]


@tool
def get_latest_sensor_reading(greenhouse_id: str) -> str:
    try:
        items = _load_sensor_readings(greenhouse_id, limit=100)
        if not items:
            return json.dumps(
                {"error": f"No sensor readings found for greenhouse {greenhouse_id}"}
            )

        latest = max(items, key=lambda item: item.get("timestamp", ""))
        logger.info("Retrieved latest sensor reading for %s", greenhouse_id)
        return json.dumps(latest)
    except Exception as error:
        logger.error("Failed to get latest sensor reading: %s", error)
        return json.dumps({"error": str(error)})


@tool
def get_sensor_history(greenhouse_id: str, hours: int = 24) -> str:
    try:
        cutoff = datetime.now(timezone.utc) - timedelta(hours=hours)
        items = _load_sensor_readings(greenhouse_id, limit=1000)
        history = [
            item
            for item in items
            if item.get("timestamp")
            and datetime.fromisoformat(item["timestamp"].replace("Z", "+00:00")) >= cutoff
        ]
        history.sort(key=lambda item: item.get("timestamp", ""))

        if not history:
            return json.dumps(
                {
                    "error": (
                        f"No sensor readings found for greenhouse {greenhouse_id} "
                        f"in last {hours} hours"
                    )
                }
            )

        logger.info(
            "Retrieved %d sensor readings for %s (last %d hours)",
            len(history),
            greenhouse_id,
            hours,
        )
        return json.dumps(history)
    except Exception as error:
        logger.error("Failed to get sensor history: %s", error)
        return json.dumps({"error": str(error)})


@tool
def get_sensor_statistics(greenhouse_id: str, metric: str, hours: int = 24) -> str:
    try:
        history_json = get_sensor_history(greenhouse_id, hours)
        history = json.loads(history_json)

        if isinstance(history, dict) and "error" in history:
            return history_json

        values = [reading[metric] for reading in history if reading.get(metric) is not None]
        if not values:
            return json.dumps({"error": f"Metric {metric} not found in sensor readings"})

        return json.dumps(
            {
                "metric": metric,
                "current": values[-1],
                "min": min(values),
                "max": max(values),
                "average": sum(values) / len(values),
                "samples": len(values),
                "time_window_hours": hours,
            }
        )
    except Exception as error:
        logger.error("Failed to calculate sensor statistics: %s", error)
        return json.dumps({"error": str(error)})
