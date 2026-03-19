"""
Seed the Amplify backend with demo greenhouse data for local development.
"""

from __future__ import annotations

import json
import uuid
from datetime import datetime, timedelta, timezone

from agents.appsync_client import execute_graphql

GREENHOUSE_ID = "mars-greenhouse-1"

CREATE_SENSOR_READING = """
mutation CreateSensorReading($input: CreateSensorReadingInput!) {
  createSensorReading(input: $input) {
    id
  }
}
"""

CREATE_CROP_RECORD = """
mutation CreateCropRecord($input: CreateCropRecordInput!) {
  createCropRecord(input: $input) {
    id
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

LIST_CROP_RECORDS = """
query ListCropRecords {
  listCropRecords(limit: 10) {
    items {
      id
    }
  }
}
"""


def seed_sensor_history() -> None:
    now = datetime.now(timezone.utc)

    for index in range(6):
        timestamp = (now - timedelta(minutes=(5 - index) * 10)).isoformat()
        execute_graphql(
            CREATE_SENSOR_READING,
            {
                "input": {
                    "id": str(uuid.uuid4()),
                    "greenhouseId": GREENHOUSE_ID,
                    "timestamp": timestamp,
                    "temperature": 21.4 + index * 0.2,
                    "humidity": 63.0 + index * 0.4,
                    "co2Ppm": 1140 + index * 15,
                    "lightPpfd": 380 + index * 8,
                    "phLevel": 6.0 + index * 0.03,
                    "nutrientEc": 2.0 + index * 0.02,
                    "waterLitres": 154.0 - index * 0.8,
                    "radiationMsv": 0.07,
                }
            },
        )


def seed_crops() -> None:
    existing = execute_graphql(LIST_CROP_RECORDS)
    items = existing.get("listCropRecords", {}).get("items", [])
    if items:
        return

    crops = [
        {
            "cropId": "lettuce-01",
            "name": "Lettuce",
            "variety": "Red Romaine",
            "growthStage": 3,
            "daysToHarvest": 18,
            "healthStatus": "HEALTHY",
            "zone": "nursery",
        },
        {
            "cropId": "tomato-01",
            "name": "Tomato",
            "variety": "Micro Dwarf",
            "growthStage": 2,
            "daysToHarvest": 42,
            "healthStatus": "MONITOR",
            "zone": "fruiting",
        },
        {
            "cropId": "potato-01",
            "name": "Potato",
            "variety": "Yukon Gold",
            "growthStage": 4,
            "daysToHarvest": 24,
            "healthStatus": "HEALTHY",
            "zone": "main",
        },
    ]

    planted_at = datetime.now(timezone.utc).isoformat()
    for crop in crops:
        execute_graphql(
            CREATE_CROP_RECORD,
            {
                "input": {
                    "id": str(uuid.uuid4()),
                    "plantedAt": planted_at,
                    **crop,
                }
            },
        )


def seed_agent_event() -> None:
    execute_graphql(
        CREATE_AGENT_EVENT,
        {
            "input": {
                "id": str(uuid.uuid4()),
                "agentId": "system",
                "timestamp": datetime.now(timezone.utc).isoformat(),
                "severity": "INFO",
                "message": "Demo data seeded successfully.",
                "actionTaken": "Prepared dashboard for local development",
            }
        },
    )


def main() -> None:
    seed_sensor_history()
    seed_crops()
    seed_agent_event()
    print(json.dumps({"status": "ok", "message": "Demo data seeded"}))


if __name__ == "__main__":
    main()
