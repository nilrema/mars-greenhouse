"""
Greenhouse Operations Agent.

Functional first-pass agent that reasons about temperature, humidity, CO2,
light, and water, then recommends or queues direct greenhouse adjustments.
"""

from __future__ import annotations

import json
import logging
from typing import Any

from agents.agent_support import (
    DEFAULT_GREENHOUSE_ID,
    get_latest_sensor_snapshot,
    safe_load_json,
    utc_now_iso,
    write_agent_event,
)
from agents.tools.actuator_tools import (
    adjust_co2,
    adjust_humidity,
    adjust_lighting,
    adjust_temperature,
    trigger_irrigation,
)
from agents.tools.kb_tools import query_knowledge_base

logger = logging.getLogger(__name__)

OPTIMAL_RANGES = {
    "temperature": {"min": 20.0, "max": 25.0, "target": 22.0, "unit": "C"},
    "humidity": {"min": 60.0, "max": 70.0, "target": 65.0, "unit": "%"},
    "co2Ppm": {"min": 1000.0, "max": 1400.0, "target": 1200.0, "unit": "ppm"},
    "lightPpfd": {"min": 300.0, "max": 500.0, "target": 400.0, "unit": "ppfd"},
    "waterLitres": {"min": 120.0, "max": 220.0, "target": 160.0, "unit": "L"},
}


def _metric_severity(value: float, minimum: float, maximum: float) -> str:
    if minimum <= value <= maximum:
        return "INFO"

    lower_span = max(1.0, minimum * 0.15)
    upper_span = max(1.0, maximum * 0.15)

    if value < minimum:
        return "CRITICAL" if value < minimum - lower_span else "WARN"
    return "CRITICAL" if value > maximum + upper_span else "WARN"


def analyze_greenhouse_operations(
    sensor_data: dict[str, Any],
    greenhouse_id: str = DEFAULT_GREENHOUSE_ID,
) -> dict[str, Any]:
    issues: list[dict[str, Any]] = []
    recommendations: list[str] = []
    commands: list[dict[str, Any]] = []
    risk_score = 0

    for metric, config in OPTIMAL_RANGES.items():
        value = sensor_data.get(metric)
        if value is None:
            continue

        severity = _metric_severity(float(value), config["min"], config["max"])
        if severity == "INFO":
            continue

        direction = "increase" if value < config["min"] else "decrease"
        issues.append(
            {
                "metric": metric,
                "severity": severity,
                "value": value,
                "recommended_target": config["target"],
                "direction": direction,
            }
        )
        recommendations.append(
            f"{direction.title()} {metric} toward {config['target']}{config['unit']}"
        )
        risk_score += 40 if severity == "CRITICAL" else 20

        if metric == "temperature":
            commands.append({"tool": "adjust_temperature", "target": config["target"], "zone": "main"})
        elif metric == "humidity":
            commands.append({"tool": "adjust_humidity", "target": config["target"], "zone": "main"})
        elif metric == "co2Ppm":
            commands.append({"tool": "adjust_co2", "target": int(config["target"]), "zone": "main"})
        elif metric == "lightPpfd":
            commands.append({"tool": "adjust_lighting", "target": config["target"], "zone": "main"})
        elif metric == "waterLitres" and value < config["min"]:
            commands.append({"tool": "trigger_irrigation", "duration_seconds": 180, "zone": "main"})

    status = "STABLE"
    if any(issue["severity"] == "CRITICAL" for issue in issues):
        status = "CRITICAL"
    elif issues:
        status = "ATTENTION"

    return {
        "agent": "greenhouse-operations",
        "greenhouse_id": greenhouse_id,
        "timestamp": utc_now_iso(),
        "status": status,
        "risk_score": min(risk_score, 100),
        "issues": issues,
        "recommendations": recommendations,
        "recommended_commands": commands,
    }


def apply_operations_commands(plan: dict[str, Any]) -> list[dict[str, Any]]:
    executed: list[dict[str, Any]] = []

    for command in plan.get("recommended_commands", []):
        tool_name = command["tool"]
        if tool_name == "adjust_temperature":
            result = safe_load_json(adjust_temperature(command["target"], zone=command["zone"]))
        elif tool_name == "adjust_humidity":
            result = safe_load_json(adjust_humidity(command["target"], zone=command["zone"]))
        elif tool_name == "adjust_co2":
            result = safe_load_json(adjust_co2(command["target"], zone=command["zone"]))
        elif tool_name == "adjust_lighting":
            result = safe_load_json(adjust_lighting(command["target"], zone=command["zone"]))
        elif tool_name == "trigger_irrigation":
            result = safe_load_json(
                trigger_irrigation(command["zone"], duration_seconds=command["duration_seconds"])
            )
        else:
            result = {"error": f"Unknown command {tool_name}"}

        executed.append({"command": command, "result": result})

    return executed


def run_greenhouse_operations_agent(
    greenhouse_id: str = DEFAULT_GREENHOUSE_ID,
    auto_execute: bool = True,
) -> str:
    sensor_data = get_latest_sensor_snapshot(greenhouse_id)
    plan = analyze_greenhouse_operations(sensor_data, greenhouse_id=greenhouse_id)

    if plan["issues"]:
        kb_query = "Martian greenhouse operating guidance for " + ", ".join(
            issue["metric"] for issue in plan["issues"][:3]
        )
        try:
            plan["knowledge_base_guidance"] = safe_load_json(query_knowledge_base(kb_query))
        except Exception as error:
            logger.warning("KB lookup failed for greenhouse operations: %s", error)
            plan["knowledge_base_guidance"] = {"error": str(error)}

    if auto_execute and plan["recommended_commands"]:
        plan["executed_commands"] = apply_operations_commands(plan)

    severity = "CRITICAL" if plan["status"] == "CRITICAL" else "WARN" if plan["issues"] else "INFO"
    write_agent_event(
        "greenhouse-operations",
        severity,
        f"{greenhouse_id} operations status: {plan['status']}",
        "; ".join(plan["recommendations"]) if plan["recommendations"] else "No greenhouse adjustments required",
    )
    return json.dumps(plan)


if __name__ == "__main__":
    print(run_greenhouse_operations_agent())
