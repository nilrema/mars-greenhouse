"""
CLI wrapper for the Orchestrator Agent.
"""

from __future__ import annotations

import json
import sys
from pathlib import Path

if __package__ in (None, ""):
    sys.path.insert(0, str(Path(__file__).resolve().parent.parent))
    from agents.mission_orchestrator import run_mission_orchestrator
else:
    from agents.mission_orchestrator import run_mission_orchestrator


def _trim(text: str | None, limit: int = 140) -> str:
    if not text:
        return "-"
    clean = " ".join(str(text).split())
    return clean if len(clean) <= limit else clean[: limit - 3] + "..."


def format_orchestration_trace(result: dict) -> str:
    decision = result.get("decision", {})
    reports = result.get("reports", {})
    lines = [
        "ORCHESTRATOR TRACE",
        f"module: {result.get('selectedModuleId', '-')}",
        f"scenario: {result.get('scenario', '-')}",
        f"prompt: {_trim(result.get('prompt') or 'automatic cycle')}",
        "",
    ]

    for index, name in enumerate(["environment", "crop", "astro", "resource"], start=1):
        report = reports.get(name, {})
        lines.extend(
            [
                f"{index}. Orchestrator -> {name.title()} Agent",
                f"status: {report.get('status', '-')}",
                f"headline: {_trim(report.get('headline'))}",
                f"riskScore: {report.get('riskScore', '-')}",
                "",
            ]
        )

    lines.extend(
        [
            "5. Specialists -> Orchestrator",
            f"leadAgent: {decision.get('leadAgent', '-')}",
            f"summary: {_trim(decision.get('operatorSummary'), 220)}",
        ]
    )
    return "\n".join(lines)


def run_orchestrator(prompt: str | None = None) -> str:
    return run_mission_orchestrator(prompt=prompt)


if __name__ == "__main__":
    args = sys.argv[1:]
    emit_json = False
    if "--json" in args:
        emit_json = True
        args = [arg for arg in args if arg != "--json"]

    prompt = " ".join(args) if args else None
    raw = run_orchestrator(prompt)
    if emit_json:
        print(raw)
    else:
        print(format_orchestration_trace(json.loads(raw)))
