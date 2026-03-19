"""
Mission Orchestrator.

Coordinator for the Mars Harvest Command specialist agents.
"""

from __future__ import annotations

import json
from typing import Any

from agents.agent_support import DEFAULT_GREENHOUSE_ID, write_agent_event
from agents.astro_agent import run_astro_agent
from agents.crop_agent import run_crop_agent
from agents.environment_agent import run_environment_agent
from agents.resource_agent import run_resource_agent


def _safe_load(raw: str) -> dict[str, Any]:
    return json.loads(raw)


def _normalize_report(report: dict[str, Any], fallback_agent: str) -> dict[str, Any]:
    normalized = dict(report)
    normalized["agent"] = normalized.get("agent") or fallback_agent

    raw_status = str(normalized.get("status") or "").upper()
    normalized["status"] = (
        "ALERT"
        if raw_status in {"CRITICAL", "ALERT"}
        else "WATCH"
        if raw_status in {"MONITOR", "ATTENTION", "WATCH", "WARN"}
        else "NOMINAL"
    )

    if "riskScore" not in normalized:
        normalized["riskScore"] = normalized.get("risk_score", normalized.get("disease_risk_score", 0))

    recommendations = normalized.get("recommendations")
    if not recommendations:
        recommendations = normalized.get("recommended_actions", [])
    normalized["recommendations"] = recommendations or []

    if "commands" not in normalized:
        normalized["commands"] = normalized.get("recommended_commands", [])

    if "affectedModules" not in normalized:
        greenhouse_id = normalized.get("greenhouse_id")
        normalized["affectedModules"] = [greenhouse_id] if greenhouse_id else []

    if not normalized.get("headline"):
        if normalized["recommendations"]:
            normalized["headline"] = normalized["recommendations"][0]
        elif normalized.get("anomalies"):
            normalized["headline"] = normalized["anomalies"][0].get("message") or normalized["anomalies"][0].get("type", "Crop anomaly detected.")
        elif normalized.get("issues"):
            normalized["headline"] = normalized["issues"][0].get("metric", "Operational issue detected.")
        else:
            normalized["headline"] = f"{fallback_agent.title()} agent reports nominal conditions."

    return normalized


def prompt_to_scenario(prompt: str | None) -> str | None:
    if not prompt:
        return None
    lowered = prompt.lower()
    if "water" in lowered:
        return "water-pressure"
    if "disease" in lowered or "inspection" in lowered:
        return "disease-suspicion"
    if "dust" in lowered or "power" in lowered or "storm" in lowered:
        return "dust-storm"
    if "harvest" in lowered or "crew" in lowered or "dispatch" in lowered:
        return "harvest-rush"
    return "nominal-day"


def compose_mission_decision(
    environment_report: dict[str, Any],
    crop_report: dict[str, Any],
    astro_report: dict[str, Any],
    resource_report: dict[str, Any],
    scenario: str | None = None,
) -> dict[str, Any]:
    ranked = [environment_report, crop_report, astro_report, resource_report]
    ranked.sort(key=lambda item: item.get("riskScore", 0), reverse=True)
    lead = ranked[0]

    priority_stack = [
        {"owner": report["agent"], "reason": report["headline"]}
        for report in ranked
        if report.get("riskScore", 0) > 0 or report.get("status") != "NOMINAL"
    ]
    if not priority_stack:
        priority_stack.append(
            {"owner": "orchestrator", "reason": "All specialist agents report nominal conditions."}
        )

    operator_summary = (
        f"{lead['agent'].title()} agent leads the cycle. "
        f"Environment={environment_report['status']}, Crop={crop_report['status']}, "
        f"Astro={astro_report['status']}, Resource={resource_report['status']}."
    )
    if scenario:
        operator_summary += f" Scenario: {scenario}."

    next_actions = []
    for report in ranked:
        next_actions.extend(report.get("recommendations", [])[:1])

    return {
        "leadAgent": lead["agent"],
        "priorityStack": priority_stack,
        "operatorSummary": operator_summary,
        "nextActions": next_actions[:4],
        "scenario": scenario or "nominal-day",
    }


def run_mission_orchestrator(
    greenhouse_id: str = DEFAULT_GREENHOUSE_ID,
    prompt: str | None = None,
    sensor_data: dict[str, Any] | None = None,
    crop_records: list[dict[str, Any]] | None = None,
    persist_events: bool = True,
    include_knowledge: bool = False,
) -> str:
    environment_report = _normalize_report(
        _safe_load(
            run_environment_agent(
                greenhouse_id,
                sensor_data=sensor_data,
                persist_event=persist_events,
            )
        ),
        "environment",
    )
    crop_report = _normalize_report(
        _safe_load(
            run_crop_agent(
                greenhouse_id,
                sensor_data=sensor_data,
                crop_records=crop_records,
                persist_event=persist_events,
                include_knowledge=include_knowledge,
            )
        ),
        "crop",
    )
    astro_report = _normalize_report(
        _safe_load(run_astro_agent(crop_records=crop_records, persist_event=persist_events)),
        "astro",
    )
    resource_report = _normalize_report(
        _safe_load(
            run_resource_agent(
                greenhouse_id,
                sensor_data=sensor_data,
                persist_event=persist_events,
            )
        ),
        "resource",
    )
    scenario = prompt_to_scenario(prompt)

    decision = compose_mission_decision(
        environment_report=environment_report,
        crop_report=crop_report,
        astro_report=astro_report,
        resource_report=resource_report,
        scenario=scenario,
    )
    ui_feed_entries = [
        {
            "agent": "orchestrator",
            "type": "info" if decision["leadAgent"] == "orchestrator" else "warning",
            "message": decision["operatorSummary"],
        },
        *[
            {
                "agent": report["agent"],
                "type": "critical" if report["status"] == "ALERT" else "warning" if report["status"] == "WATCH" else "success",
                "message": report["headline"],
            }
            for report in [environment_report, crop_report, astro_report, resource_report]
        ],
    ]

    if persist_events:
        write_agent_event(
            "orchestrator",
            "WARN" if decision["leadAgent"] != "orchestrator" else "INFO",
            "Orchestrator cycle complete",
            decision["operatorSummary"],
        )

    return json.dumps(
        {
            "agent": "orchestrator",
            "selectedModuleId": greenhouse_id,
            "scenario": scenario or "nominal-day",
            "prompt": prompt,
            "reports": {
                "environment": environment_report,
                "crop": crop_report,
                "astro": astro_report,
                "resource": resource_report,
            },
            "decision": decision,
            "uiFeedEntries": ui_feed_entries,
        }
    )


if __name__ == "__main__":
    print(run_mission_orchestrator())
