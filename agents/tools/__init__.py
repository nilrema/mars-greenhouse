"""
Tools for the Martian Greenhouse Agents
"""

from .sensor_tools import get_latest_sensor_reading, get_sensor_history, get_sensor_statistics
from .actuator_tools import (
    adjust_temperature, 
    adjust_humidity, 
    adjust_lighting, 
    adjust_co2, 
    trigger_irrigation,
    get_command_status
)
from .kb_tools import (
    query_knowledge_base,
    get_crop_profile,
    get_mars_environmental_constraints,
    get_plant_stress_guide,
    get_nutrient_strategy
)

__all__ = [
    # Sensor tools
    'get_latest_sensor_reading',
    'get_sensor_history', 
    'get_sensor_statistics',
    
    # Actuator tools
    'adjust_temperature',
    'adjust_humidity',
    'adjust_lighting',
    'adjust_co2',
    'trigger_irrigation',
    'get_command_status',
    
    # Knowledge base tools
    'query_knowledge_base',
    'get_crop_profile',
    'get_mars_environmental_constraints',
    'get_plant_stress_guide', 
    'get_nutrient_strategy',
]