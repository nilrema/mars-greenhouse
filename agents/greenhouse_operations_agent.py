"""
Compatibility wrapper.

Greenhouse operations are now represented by the Environment and Resource agents.
"""

from __future__ import annotations

import json

from agents.environment_agent import analyze_environment, run_environment_agent
from agents.resource_agent import analyze_resources, run_resource_agent
from agents.agent_support import DEFAULT_GREENHOUSE_ID, get_latest_sensor_snapshot


def analyze_greenhouse_operations(sensor_data, greenhouse_id: str = DEFAULT_GREENHOUSE_ID):
    environment = analyze_environment(sensor_data, greenhouse_id=greenhouse_id)
    resource = analyze_resources(sensor_data, greenhouse_id=greenhouse_id)
    status = "NOMINAL"
    if "ALERT" in {environment["status"], resource["status"]}:
        status = "CRITICAL"
    elif "WATCH" in {environment["status"], resource["status"]}:
        status = "ATTENTION"

    recommendations = environment["recommendations"] + resource["recommendations"]
    commands = environment["commands"] + resource["commands"]

    return {
        "agent": "greenhouse-operations",
        "greenhouse_id": greenhouse_id,
        "status": status,
        "risk_score": max(environment["riskScore"], resource["riskScore"]),
        "issues": environment.get("findings", []) + resource.get("findings", []),
        "recommendations": recommendations,
        "recommended_commands": commands,
    }


def run_greenhouse_operations_agent(greenhouse_id: str = DEFAULT_GREENHOUSE_ID, auto_execute: bool = True) -> str:
    _ = auto_execute
    sensor_data = get_latest_sensor_snapshot(greenhouse_id)
    return json.dumps(analyze_greenhouse_operations(sensor_data, greenhouse_id=greenhouse_id))


if __name__ == "__main__":
    print(run_greenhouse_operations_agent())
