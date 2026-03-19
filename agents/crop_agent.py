"""
Compatibility entry point for the crop specialist role.
"""

from agents.crop_health_agent import analyze_crop_health, inspect_crop_image, run_crop_health_agent as run_crop_agent


if __name__ == "__main__":
    print(run_crop_agent())
