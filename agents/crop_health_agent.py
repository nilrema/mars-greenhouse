"""
Crop Health Agent.

Functional first-pass agent for anomaly detection, disease risk scoring,
and optional image-based inspection support.
"""

from __future__ import annotations

import json
from typing import Any

from agents.agent_support import (
    DEFAULT_GREENHOUSE_ID,
    get_latest_sensor_snapshot,
    list_crop_records,
    safe_load_json,
    utc_now_iso,
    write_agent_event,
)
from agents.tools.kb_tools import query_knowledge_base
from agents.stress_agent import analyze_crop_image


def analyze_crop_health(
    sensor_data: dict[str, Any],
    crop_records: list[dict[str, Any]],
    greenhouse_id: str = DEFAULT_GREENHOUSE_ID,
) -> dict[str, Any]:
    anomalies: list[dict[str, Any]] = []
    monitored_crops = [crop for crop in crop_records if crop.get("healthStatus") == "MONITOR"]
    critical_crops = [crop for crop in crop_records if crop.get("healthStatus") == "CRITICAL"]

    disease_risk_score = 0
    humidity = sensor_data.get("humidity") or 0
    temperature = sensor_data.get("temperature") or 0
    co2 = sensor_data.get("co2Ppm") or 0

    if humidity > 78 and 18 <= temperature <= 28:
        anomalies.append(
            {
                "type": "disease-friendly-climate",
                "severity": "CRITICAL" if humidity > 85 else "WARN",
                "message": "High humidity is increasing fungal disease risk.",
            }
        )
        disease_risk_score += 45 if humidity > 85 else 25

    if co2 < 850:
        anomalies.append(
            {
                "type": "growth-suppression",
                "severity": "WARN",
                "message": "Low CO2 may suppress canopy growth and crop recovery.",
            }
        )
        disease_risk_score += 10

    if monitored_crops:
        anomalies.append(
            {
                "type": "crop-monitoring",
                "severity": "WARN",
                "message": f"{len(monitored_crops)} crop records are already flagged for monitoring.",
            }
        )
        disease_risk_score += 10 * len(monitored_crops)

    if critical_crops:
        anomalies.append(
            {
                "type": "critical-crops",
                "severity": "CRITICAL",
                "message": f"{len(critical_crops)} crop records are in critical state.",
            }
        )
        disease_risk_score += 20 * len(critical_crops)

    unique_crops = sorted({(crop.get("name") or "unknown").lower() for crop in crop_records})
    status = "HEALTHY"
    if any(item["severity"] == "CRITICAL" for item in anomalies):
        status = "CRITICAL"
    elif anomalies:
        status = "MONITOR"

    return {
        "agent": "crop-health",
        "greenhouse_id": greenhouse_id,
        "timestamp": utc_now_iso(),
        "status": status,
        "crop_count": len(crop_records),
        "crop_types": unique_crops,
        "anomalies": anomalies,
        "disease_risk_score": min(disease_risk_score, 100),
        "recommended_actions": [
            "Inspect affected crop sections"
            if anomalies
            else "Continue normal crop monitoring",
            "Capture a plant image for disease inspection"
            if anomalies
            else "No image inspection required",
        ],
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
            "message": "Only s3:// image references are supported in the current functional version.",
            "image_ref": image_ref,
        }

    bucket, _, key = image_ref.replace("s3://", "", 1).partition("/")
    return safe_load_json(analyze_crop_image(bucket, key))


def run_crop_health_agent(
    greenhouse_id: str = DEFAULT_GREENHOUSE_ID,
    image_ref: str | None = None,
) -> str:
    sensor_data = get_latest_sensor_snapshot(greenhouse_id)
    crops = list_crop_records()
    report = analyze_crop_health(sensor_data, crops, greenhouse_id=greenhouse_id)

    if report["anomalies"]:
        kb_query = "Martian crop disease and stress guidance for greenhouse anomaly response"
        report["knowledge_base_guidance"] = safe_load_json(query_knowledge_base(kb_query))

    report["image_inspection"] = inspect_crop_image(image_ref)

    severity = "CRITICAL" if report["status"] == "CRITICAL" else "WARN" if report["anomalies"] else "INFO"
    write_agent_event(
        "crop-health",
        severity,
        f"{greenhouse_id} crop health status: {report['status']}",
        "; ".join(report["recommended_actions"]),
    )
    return json.dumps(report)


if __name__ == "__main__":
    print(run_crop_health_agent())
