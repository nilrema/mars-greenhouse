"""
Mars greenhouse agents package.

Keep this module import-light so tests can import `agents.*` without requiring
live Amplify outputs or triggering runtime-only side effects.
"""

from importlib import import_module

__all__ = [
    "run_mission_orchestrator",
    "run_greenhouse_operations_agent",
    "run_crop_health_agent",
    "run_crew_nutrition_agent",
    "run_incident_chaos_agent",
]


def __getattr__(name: str):
    mapping = {
        "run_mission_orchestrator": ("agents.mission_orchestrator", "run_mission_orchestrator"),
        "run_greenhouse_operations_agent": ("agents.greenhouse_operations_agent", "run_greenhouse_operations_agent"),
        "run_crop_health_agent": ("agents.crop_health_agent", "run_crop_health_agent"),
        "run_crew_nutrition_agent": ("agents.crew_nutrition_agent", "run_crew_nutrition_agent"),
        "run_incident_chaos_agent": ("agents.incident_chaos_agent", "run_incident_chaos_agent"),
    }

    if name not in mapping:
        raise AttributeError(f"module 'agents' has no attribute {name!r}")

    module_name, attr_name = mapping[name]
    module = import_module(module_name)
    return getattr(module, attr_name)
