import type { GreenhouseZone, AstronautClone, AgentRecommendation } from './types';

export function generateZones(baseId: string): GreenhouseZone[] {
  const zoneTemplates: Record<string, GreenhouseZone[]> = {
    'ares-prime': [
      { id: 'bay-1', name: 'Bay 1 — Tomato', type: 'growing', crop: 'Tomato', growthStage: 'vegetative', predictedYield: 12.4, humidity: 72, temperature: 24.1, nutrientStatus: 'optimal', waterUptake: 88, co2: 1220, diseaseRisk: 8, inspectionConfidence: 96, status: 'healthy', x: 15, y: 20, w: 20, h: 25 },
      { id: 'bay-2', name: 'Bay 2 — Lettuce', type: 'growing', crop: 'Lettuce', growthStage: 'harvest-ready', predictedYield: 8.2, humidity: 78, temperature: 22.8, nutrientStatus: 'optimal', waterUptake: 91, co2: 1180, diseaseRisk: 5, inspectionConfidence: 98, status: 'healthy', x: 40, y: 20, w: 20, h: 25 },
      { id: 'bay-3', name: 'Bay 3 — Potato', type: 'growing', crop: 'Potato', growthStage: 'vegetative', predictedYield: 22.1, humidity: 81, temperature: 23.5, nutrientStatus: 'warning', waterUptake: 76, co2: 1250, diseaseRisk: 34, inspectionConfidence: 72, status: 'warning', x: 65, y: 20, w: 20, h: 25 },
      { id: 'bay-4', name: 'Bay 4 — Soybean', type: 'growing', crop: 'Soybean', growthStage: 'seedling', predictedYield: 6.8, humidity: 69, temperature: 24.3, nutrientStatus: 'optimal', waterUptake: 82, co2: 1200, diseaseRisk: 3, inspectionConfidence: 99, status: 'healthy', x: 15, y: 50, w: 20, h: 25 },
      { id: 'bay-5', name: 'Bay 5 — Wheat', type: 'growing', crop: 'Wheat', growthStage: 'harvest-ready', predictedYield: 15.3, humidity: 65, temperature: 23.9, nutrientStatus: 'optimal', waterUptake: 85, co2: 1190, diseaseRisk: 6, inspectionConfidence: 97, status: 'healthy', x: 40, y: 50, w: 20, h: 25 },
      { id: 'nutrient', name: 'Nutrient Control', type: 'nutrient', crop: undefined, growthStage: undefined, predictedYield: undefined, humidity: 45, temperature: 21.0, nutrientStatus: 'optimal', waterUptake: undefined, co2: 800, diseaseRisk: 0, inspectionConfidence: 100, status: 'healthy', x: 65, y: 50, w: 20, h: 12 },
      { id: 'storage', name: 'Storage & Packing', type: 'storage', crop: undefined, growthStage: undefined, predictedYield: undefined, humidity: 38, temperature: 18.0, nutrientStatus: undefined, waterUptake: undefined, co2: 600, diseaseRisk: 0, inspectionConfidence: 100, status: 'healthy', x: 65, y: 65, w: 20, h: 12 },
      { id: 'quarantine', name: 'Quarantine Zone', type: 'quarantine', crop: undefined, growthStage: undefined, predictedYield: undefined, humidity: 50, temperature: 20.0, nutrientStatus: undefined, waterUptake: undefined, co2: 900, diseaseRisk: 0, inspectionConfidence: 100, status: 'healthy', x: 15, y: 80, w: 35, h: 12 },
      { id: 'airlock', name: 'Habitat Airlock', type: 'airlock', crop: undefined, growthStage: undefined, predictedYield: undefined, humidity: 30, temperature: 19.0, nutrientStatus: undefined, waterUptake: undefined, co2: 500, diseaseRisk: 0, inspectionConfidence: 100, status: 'healthy', x: 55, y: 80, w: 30, h: 12 },
    ],
    'elysium-pack': [
      { id: 'bay-1', name: 'Bay 1 — Spinach', type: 'growing', crop: 'Spinach', growthStage: 'harvest-ready', predictedYield: 5.6, humidity: 74, temperature: 23.2, nutrientStatus: 'optimal', waterUptake: 90, co2: 1160, diseaseRisk: 4, inspectionConfidence: 98, status: 'healthy', x: 15, y: 20, w: 25, h: 30 },
      { id: 'bay-2', name: 'Bay 2 — Pepper', type: 'growing', crop: 'Pepper', growthStage: 'vegetative', predictedYield: 7.3, humidity: 68, temperature: 25.1, nutrientStatus: 'optimal', waterUptake: 79, co2: 1200, diseaseRisk: 12, inspectionConfidence: 91, status: 'healthy', x: 45, y: 20, w: 25, h: 30 },
      { id: 'bay-3', name: 'Bay 3 — Rice', type: 'growing', crop: 'Rice', growthStage: 'vegetative', predictedYield: 18.9, humidity: 82, temperature: 26.0, nutrientStatus: 'warning', waterUptake: 95, co2: 1280, diseaseRisk: 18, inspectionConfidence: 85, status: 'warning', x: 15, y: 55, w: 25, h: 25 },
      { id: 'bay-4', name: 'Bay 4 — Kale', type: 'growing', crop: 'Kale', growthStage: 'harvest-ready', predictedYield: 4.2, humidity: 71, temperature: 22.5, nutrientStatus: 'optimal', waterUptake: 87, co2: 1140, diseaseRisk: 2, inspectionConfidence: 99, status: 'healthy', x: 45, y: 55, w: 25, h: 25 },
      { id: 'nutrient', name: 'Nutrient Control', type: 'nutrient', crop: undefined, growthStage: undefined, predictedYield: undefined, humidity: 42, temperature: 21.0, nutrientStatus: 'optimal', waterUptake: undefined, co2: 780, diseaseRisk: 0, inspectionConfidence: 100, status: 'healthy', x: 75, y: 20, w: 15, h: 25 },
      { id: 'storage', name: 'Storage & Packing', type: 'storage', crop: undefined, growthStage: undefined, predictedYield: undefined, humidity: 35, temperature: 18.5, nutrientStatus: undefined, waterUptake: undefined, co2: 580, diseaseRisk: 0, inspectionConfidence: 100, status: 'healthy', x: 75, y: 50, w: 15, h: 15 },
      { id: 'quarantine', name: 'Quarantine Zone', type: 'quarantine', crop: undefined, growthStage: undefined, predictedYield: undefined, humidity: 48, temperature: 19.5, nutrientStatus: undefined, waterUptake: undefined, co2: 850, diseaseRisk: 0, inspectionConfidence: 100, status: 'healthy', x: 15, y: 83, w: 30, h: 12 },
      { id: 'airlock', name: 'Habitat Airlock', type: 'airlock', crop: undefined, growthStage: undefined, predictedYield: undefined, humidity: 28, temperature: 18.0, nutrientStatus: undefined, waterUptake: undefined, co2: 480, diseaseRisk: 0, inspectionConfidence: 100, status: 'healthy', x: 55, y: 83, w: 35, h: 12 },
    ],
    'noctis-stack': [
      { id: 'bay-1', name: 'Bay 1 — Microgreens', type: 'growing', crop: 'Microgreens', growthStage: 'harvest-ready', predictedYield: 3.1, humidity: 66, temperature: 22.0, nutrientStatus: 'optimal', waterUptake: 92, co2: 1100, diseaseRisk: 1, inspectionConfidence: 99, status: 'healthy', x: 15, y: 20, w: 30, h: 30 },
      { id: 'bay-2', name: 'Bay 2 — Radish', type: 'growing', crop: 'Radish', growthStage: 'vegetative', predictedYield: 4.8, humidity: 63, temperature: 21.5, nutrientStatus: 'optimal', waterUptake: 88, co2: 1080, diseaseRisk: 3, inspectionConfidence: 97, status: 'healthy', x: 50, y: 20, w: 30, h: 30 },
      { id: 'bay-3', name: 'Bay 3 — Bean Sprouts', type: 'growing', crop: 'Bean Sprouts', growthStage: 'harvest-ready', predictedYield: 2.9, humidity: 70, temperature: 23.0, nutrientStatus: 'optimal', waterUptake: 94, co2: 1120, diseaseRisk: 2, inspectionConfidence: 98, status: 'healthy', x: 15, y: 55, w: 30, h: 25 },
      { id: 'nutrient', name: 'Nutrient Control', type: 'nutrient', crop: undefined, growthStage: undefined, predictedYield: undefined, humidity: 40, temperature: 20.0, nutrientStatus: 'optimal', waterUptake: undefined, co2: 750, diseaseRisk: 0, inspectionConfidence: 100, status: 'healthy', x: 50, y: 55, w: 15, h: 12 },
      { id: 'storage', name: 'Storage & Packing', type: 'storage', crop: undefined, growthStage: undefined, predictedYield: undefined, humidity: 32, temperature: 17.5, nutrientStatus: undefined, waterUptake: undefined, co2: 550, diseaseRisk: 0, inspectionConfidence: 100, status: 'healthy', x: 50, y: 70, w: 15, h: 12 },
      { id: 'quarantine', name: 'Quarantine Zone', type: 'quarantine', crop: undefined, growthStage: undefined, predictedYield: undefined, humidity: 45, temperature: 19.0, nutrientStatus: undefined, waterUptake: undefined, co2: 820, diseaseRisk: 0, inspectionConfidence: 100, status: 'healthy', x: 70, y: 55, w: 15, h: 27 },
      { id: 'airlock', name: 'Habitat Airlock', type: 'airlock', crop: undefined, growthStage: undefined, predictedYield: undefined, humidity: 25, temperature: 17.0, nutrientStatus: undefined, waterUptake: undefined, co2: 450, diseaseRisk: 0, inspectionConfidence: 100, status: 'healthy', x: 15, y: 83, w: 70, h: 12 },
    ],
  };
  return zoneTemplates[baseId] || zoneTemplates['ares-prime'];
}

export const clones: AstronautClone[] = [
  { id: 'clone-a1', name: 'CLONE-A1', role: 'harvester', status: 'idle', assignedZone: null, x: 50, y: 10 },
  { id: 'clone-b2', name: 'CLONE-B2', role: 'inspector', status: 'idle', assignedZone: null, x: 30, y: 10 },
  { id: 'clone-c3', name: 'CLONE-C3', role: 'technician', status: 'idle', assignedZone: null, x: 70, y: 10 },
];

export function getAgentRecommendations(baseId: string, zoneId: string | null): AgentRecommendation[] {
  if (!zoneId) {
    return [
      { agent: 'ORCHESTRATOR', icon: '🧭', message: 'All sectors operational. Continue the current module plan.' },
      { agent: 'CROP', icon: '🌱', message: 'Harvest windows are approaching for mature crop lanes.' },
      { agent: 'RESOURCE', icon: '⚡', message: 'Reserve posture is stable for the active cycle.' },
    ];
  }
  
  const zones = generateZones(baseId);
  const zone = zones.find(z => z.id === zoneId);
  if (!zone) return [];

  const recs: AgentRecommendation[] = [];

  if (zone.status === 'warning' || zone.status === 'critical') {
    recs.push({ agent: 'CROP', icon: '🦠', message: `Anomaly detected in ${zone.name}. Disease risk: ${zone.diseaseRisk}%. Recommend inspection.` });
    recs.push({ agent: 'ORCHESTRATOR', icon: '🧭', message: `Dispatch a team for manual inspection before reallocating harvest capacity.` });
  }
  if (zone.type === 'growing' && zone.growthStage === 'harvest-ready') {
    recs.push({ agent: 'CROP', icon: '🌱', message: `Harvest window in 2 sols. Yield forecast: ${zone.predictedYield}kg. Deploy harvester team.` });
  }
  if (zone.humidity && zone.humidity > 75) {
    recs.push({ agent: 'ENVIRONMENT', icon: '🌡️', message: `Humidity above optimal range (${zone.humidity}%). Adjust ventilation and circulation.` });
  }
  if (zone.type === 'growing') {
    const vitaminPct = Math.floor(Math.random() * 15) + 10;
    recs.push({ agent: 'ASTRO', icon: '👩‍🚀', message: `This bay supports ${vitaminPct}% of current crew nutrition coverage.` });
  }
  if (recs.length === 0) {
    recs.push({ agent: 'ORCHESTRATOR', icon: '🧭', message: 'Sector nominal. No action required.' });
  }
  return recs;
}
