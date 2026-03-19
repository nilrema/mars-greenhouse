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
    agentId: 'orchestrator',
    severity: 'INFO',
    message: 'Mock mode is active until amplify_outputs.json is available.',
    actionTaken: 'Serving demo telemetry',
    createdAt: new Date(now - 5 * 60 * 1000).toISOString(),
  },
  {
    id: 'mock-event-2',
    agentId: 'environment',
    severity: 'WARN',
    message: 'Humidity drift detected in zone A.',
    actionTaken: 'Queued humidifier adjustment',
    createdAt: new Date(now - 2 * 60 * 1000).toISOString(),
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
