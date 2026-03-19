"""
Compatibility wrapper for the new Greenhouse Operations Agent role.
"""

from agents.greenhouse_operations_agent import (
    analyze_greenhouse_operations,
    run_greenhouse_operations_agent,
)


def analyze_environmental_conditions(greenhouse_id: str = "mars-greenhouse-1") -> str:
    from agents.agent_support import get_latest_sensor_snapshot
    import json

    sensor_data = get_latest_sensor_snapshot(greenhouse_id)
    return json.dumps(analyze_greenhouse_operations(sensor_data, greenhouse_id=greenhouse_id))


def run_environment_agent(greenhouse_id: str = "mars-greenhouse-1") -> str:
    return run_greenhouse_operations_agent(greenhouse_id=greenhouse_id)


if __name__ == "__main__":
    import sys

    greenhouse_id = sys.argv[1] if len(sys.argv) > 1 else "mars-greenhouse-1"
    print(run_environment_agent(greenhouse_id))
