"""
Crop Agent.

Specialist for crop stress, harvest risk, and plant inspection follow-up.
"""

from __future__ import annotations

import json
from typing import Any

from agents.agent_support import (
    DEFAULT_GREENHOUSE_ID,
    get_latest_sensor_snapshot,
    list_crop_records,
    utc_now_iso,
    write_agent_event,
)
from agents.mcp_support import describe_mcp_access, query_mars_crop_knowledge


def analyze_crop_health(
    sensor_data: dict[str, Any],
    crop_records: list[dict[str, Any]],
    greenhouse_id: str = DEFAULT_GREENHOUSE_ID,
) -> dict[str, Any]:
    anomalies: list[dict[str, Any]] = []
    monitored_crops = [crop for crop in crop_records if crop.get("healthStatus") == "MONITOR"]
    critical_crops = [crop for crop in crop_records if crop.get("healthStatus") == "CRITICAL"]

    risk_score = 0
    humidity = float(sensor_data.get("humidity") or 0)
    temperature = float(sensor_data.get("temperature") or 0)
    co2 = float(sensor_data.get("co2Ppm") or 0)
    light_ppfd = float(sensor_data.get("lightPpfd") or 0)

    if humidity > 78 and 18 <= temperature <= 28:
        severity = "ALERT" if humidity > 85 else "WATCH"
        anomalies.append(
            {
                "type": "disease-friendly-climate",
                "status": severity,
                "message": "High humidity is increasing fungal disease risk.",
            }
        )
        risk_score += 45 if severity == "ALERT" else 25

    if co2 < 850:
        anomalies.append(
            {
                "type": "growth-suppression",
                "status": "WATCH",
                "message": "Low CO2 may suppress canopy growth and crop recovery.",
            }
        )
        risk_score += 10

    if light_ppfd < 260:
        anomalies.append(
            {
                "type": "reduced-lighting",
                "status": "WATCH",
                "message": "Reduced lighting is slowing crop recovery in the active lanes.",
            }
        )
        risk_score += 10

    if monitored_crops:
        anomalies.append(
            {
                "type": "crop-monitoring",
                "status": "WATCH",
                "message": f"{len(monitored_crops)} crop records are already flagged for monitoring.",
            }
        )
        risk_score += 10 * len(monitored_crops)

    if critical_crops:
        anomalies.append(
            {
                "type": "critical-crops",
                "status": "ALERT",
                "message": f"{len(critical_crops)} crop records are in critical state.",
            }
        )
        risk_score += 20 * len(critical_crops)

    status = "NOMINAL"
    if any(item["status"] == "ALERT" for item in anomalies):
        status = "ALERT"
    elif anomalies:
        status = "WATCH"

    recommendations = [
        "Protect the most mature crop lanes first" if anomalies else "Maintain nominal crop monitoring and harvest rotation",
        "Run a focused inspection pass on the highest-risk beds" if anomalies else "No immediate crop inspection is required",
    ]
    headline = "Crop outlook is stable and the near-term harvest window remains intact." if not anomalies else anomalies[0]["message"]

    return {
        "agent": "crop",
        "greenhouse_id": greenhouse_id,
        "timestamp": utc_now_iso(),
        "status": status,
        "headline": headline,
        "riskScore": min(risk_score, 100),
        "cropCount": len(crop_records),
        "cropTypes": sorted({(crop.get("name") or "unknown").lower() for crop in crop_records}),
        "anomalies": anomalies,
        "recommendations": recommendations,
        "commands": [
            {"tool": "inspect_crop_section", "summary": recommendation}
            for recommendation in recommendations[:2]
        ],
        "affectedModules": [greenhouse_id],
        "knowledgeBase": {
            "access": describe_mcp_access(),
            "queryHint": "Mars crop disease and stress guidance for greenhouse anomaly response",
        },
    }


def inspect_crop_image(image_ref: str | None = None) -> dict[str, Any]:
    if not image_ref:
        return {
            "status": "NO_IMAGE",
            "message": "No crop image provided. Use this agent later for plant inspection.",
        }

    if not image_ref.startswith("s3://"):
        return {
            "status": "UNSUPPORTED_IMAGE_REF",
            "message": "Only s3:// image references are supported in the current runtime.",
            "image_ref": image_ref,
        }

    return {
        "status": "DE_SCOPED",
        "message": "Visual crop inspection is archived until the image analysis path is restored.",
        "image_ref": image_ref,
    }


def run_crop_agent(
    greenhouse_id: str = DEFAULT_GREENHOUSE_ID,
    *,
    sensor_data: dict[str, Any] | None = None,
    crop_records: list[dict[str, Any]] | None = None,
    image_ref: str | None = None,
    persist_event: bool = True,
    include_knowledge: bool = False,
) -> str:
    sensor_snapshot = sensor_data if sensor_data is not None else get_latest_sensor_snapshot(greenhouse_id)
    records = crop_records if crop_records is not None else list_crop_records()
    report = analyze_crop_health(sensor_snapshot, records, greenhouse_id=greenhouse_id)
    report["imageInspection"] = inspect_crop_image(image_ref)

    if include_knowledge and report["status"] != "NOMINAL":
        report["knowledgeBase"]["guidance"] = query_mars_crop_knowledge(report["knowledgeBase"]["queryHint"])

    severity = "CRITICAL" if report["status"] == "ALERT" else "WARN" if report["status"] == "WATCH" else "INFO"
    if persist_event:
        write_agent_event("crop", severity, report["headline"], "; ".join(report["recommendations"][:2]))
    return json.dumps(report)


if __name__ == "__main__":
    print(run_crop_agent())
