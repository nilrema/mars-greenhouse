const now = Date.now();

export const mockSensorReading = {
  id: 'mock-reading-1',
  greenhouseId: 'mars-greenhouse-1',
  timestamp: new Date(now).toISOString(),
  temperature: 21.8,
  humidity: 63.4,
  co2Ppm: 1185,
  lightPpfd: 405,
  phLevel: 6.15,
  nutrientEc: 2.08,
  waterLitres: 147.2,
  radiationMsv: 0.07,
  createdAt: new Date(now).toISOString(),
};

export const mockAgentEvents = [
  {
    id: 'mock-event-1',
    agentId: 'mission-orchestrator',
    severity: 'CRITICAL',
    message: 'Mission orchestration cycle complete.',
    actionTaken: 'Lead response: crew-nutrition. Operations=STABLE, Crop=MONITOR, CrewRisk=HIGH',
    createdAt: new Date(now - 5 * 60 * 1000).toISOString(),
  },
  {
    id: 'mock-event-2',
    agentId: 'greenhouse-operations',
    severity: 'WARN',
    message: 'Humidity drift detected in zone A.',
    actionTaken: 'Queued humidifier adjustment',
    createdAt: new Date(now - 2 * 60 * 1000).toISOString(),
  },
  {
    id: 'mock-event-3',
    agentId: 'crop-health',
    severity: 'WARN',
    message: 'Tomato canopy requires disease inspection.',
    actionTaken: 'Inspect affected crop sections',
    createdAt: new Date(now - 90 * 1000).toISOString(),
  },
  {
    id: 'mock-event-4',
    agentId: 'crew-nutrition',
    severity: 'CRITICAL',
    message: 'Crew nutrition score dropped below target threshold.',
    actionTaken: 'Recommend wheat replanting to restore food security',
    createdAt: new Date(now - 30 * 1000).toISOString(),
  },
];

export const mockCrops = [
  {
    id: 'mock-crop-1',
    cropId: 'lettuce-01',
    name: 'Lettuce',
    variety: 'Red Romaine',
    growthStage: 3,
    healthStatus: 'HEALTHY',
  },
  {
    id: 'mock-crop-2',
    cropId: 'tomato-01',
    name: 'Tomato',
    variety: 'Micro Dwarf',
    growthStage: 2,
    healthStatus: 'MONITOR',
  },
];
