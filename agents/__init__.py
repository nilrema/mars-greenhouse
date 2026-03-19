"""
Mars greenhouse agents package.

Keep this module import-light so tests can import `agents.*` without requiring
live Amplify outputs or triggering runtime-only side effects.
"""

from importlib import import_module

__all__ = [
    "run_mission_orchestrator",
    "run_environment_agent",
    "run_crop_agent",
    "run_astro_agent",
    "run_resource_agent",
]


def __getattr__(name: str):
    mapping = {
        "run_mission_orchestrator": ("agents.mission_orchestrator", "run_mission_orchestrator"),
        "run_environment_agent": ("agents.environment_agent", "run_environment_agent"),
        "run_crop_agent": ("agents.crop_agent", "run_crop_agent"),
        "run_astro_agent": ("agents.astro_agent", "run_astro_agent"),
        "run_resource_agent": ("agents.resource_agent", "run_resource_agent"),
    }

    if name not in mapping:
        raise AttributeError(f"module 'agents' has no attribute {name!r}")

    module_name, attr_name = mapping[name]
    module = import_module(module_name)
    return getattr(module, attr_name)
