"""
Compatibility wrapper.

Water and resource checks currently live inside the Greenhouse Operations Agent.
This file remains as a stable entry point for older integrations.
"""

from agents.greenhouse_operations_agent import run_greenhouse_operations_agent


def run_resource_agent(greenhouse_id: str = "mars-greenhouse-1") -> str:
    return run_greenhouse_operations_agent(greenhouse_id=greenhouse_id)


if __name__ == "__main__":
    print(run_resource_agent())
