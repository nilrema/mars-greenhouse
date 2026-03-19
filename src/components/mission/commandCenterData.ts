import type {
  ActivityFeedItem,
  CommandCenterMetrics,
  ModuleSummary,
  OrchestratorDecision,
  ScenarioDefinition,
  ScenarioId,
  SpecialistSnapshot,
} from './types';

const now = Date.now();

const baseModules: ModuleSummary[] = [
  {
    id: 'ares-prime',
    name: 'Ares Prime',
    label: 'CALORIE BACKBONE',
    location: 'Valles Marineris Rim',
    status: 'nominal',
    statusLabel: 'nominal',
    alert: 'Harvest cadence stable with minor irrigation watch',
    production: 92,
    risk: 18,
    harvestScore: 91,
    resourcePressure: 34,
    astroImpact: 22,
    evidence: ['Potato lane at 82% maturity', 'Tomato output covers 27% of fresh produce target'],
    dispatchQueue: ['Routine inspection in bay-3'],
    crops: [
      { name: 'Potatoes', growthStage: 82, daysToHarvest: 6, health: 93, stressStatus: 'Healthy', projectedYield: 4500, anomaly: false },
      { name: 'Tomatoes', growthStage: 68, daysToHarvest: 11, health: 90, stressStatus: 'Healthy', projectedYield: 2100, anomaly: false },
      { name: 'Soy', growthStage: 54, daysToHarvest: 19, health: 86, stressStatus: 'Healthy', projectedYield: 1700, anomaly: false },
    ],
    environment: { temperature: 24, humidity: 66, co2: 1190, light: 91, water: 83 },
    hardware: { heaterActive: false, heaterPower: 0, irrigationPumpFlow: 48, ledBrightness: 91 },
  },
  {
    id: 'elysium-pack',
    name: 'Elysium Pack',
    label: 'RESOURCE-SENSITIVE MIX',
    location: 'Elysium Planitia',
    status: 'warning',
    statusLabel: 'watch',
    alert: 'Water recovery trending below plan',
    production: 77,
    risk: 41,
    harvestScore: 76,
    resourcePressure: 68,
    astroImpact: 38,
    evidence: ['Rice bay requires tighter nutrient buffering', 'Water reserve buffer down to 2.4 sols'],
    dispatchQueue: ['Inspect nutrient control skid', 'Confirm valve reset'],
    crops: [
      { name: 'Rice', growthStage: 63, daysToHarvest: 14, health: 78, stressStatus: 'Moderate Stress', projectedYield: 2600, anomaly: false },
      { name: 'Spinach', growthStage: 88, daysToHarvest: 3, health: 91, stressStatus: 'Healthy', projectedYield: 640, anomaly: false },
      { name: 'Pepper', growthStage: 47, daysToHarvest: 23, health: 80, stressStatus: 'Mild Stress', projectedYield: 980, anomaly: false },
    ],
    environment: { temperature: 23, humidity: 72, co2: 1150, light: 78, water: 58 },
    hardware: { heaterActive: false, heaterPower: 0, irrigationPumpFlow: 66, ledBrightness: 80 },
  },
  {
    id: 'noctis-stack',
    name: 'Noctis Stack',
    label: 'FAST TURNOVER LAB',
    location: 'Noctis Labyrinthus',
    status: 'critical',
    statusLabel: 'alert',
    alert: 'Disease suspicion in root vegetable lane',
    production: 66,
    risk: 58,
    harvestScore: 64,
    resourcePressure: 55,
    astroImpact: 47,
    evidence: ['Bean sprout lane shows humidity spikes', 'Inspection confidence still below threshold'],
    dispatchQueue: ['Urgent bay-3 inspection', 'Prepare quarantine partition'],
    crops: [
      { name: 'Microgreens', growthStage: 74, daysToHarvest: 4, health: 92, stressStatus: 'Healthy', projectedYield: 320, anomaly: false },
      { name: 'Radish', growthStage: 59, daysToHarvest: 9, health: 82, stressStatus: 'Mild Stress', projectedYield: 460, anomaly: false },
      { name: 'Bean Sprouts', growthStage: 71, daysToHarvest: 5, health: 54, stressStatus: 'Critical Stress', projectedYield: 210, anomaly: true },
    ],
    environment: { temperature: 25, humidity: 81, co2: 1110, light: 74, water: 69 },
    hardware: { heaterActive: false, heaterPower: 0, irrigationPumpFlow: 61, ledBrightness: 76 },
  },
];

export const scenarios: ScenarioDefinition[] = [
  {
    id: 'nominal-day',
    label: 'Nominal day',
    summary: 'All modules stable with only one resource watch item in Elysium Pack.',
    leadAgent: 'orchestrator',
    affectedModules: ['elysium-pack'],
  },
  {
    id: 'water-pressure',
    label: 'Water pressure',
    summary: 'Recycling efficiency dips across two modules, so the resource agent leads the cycle.',
    leadAgent: 'resource',
    affectedModules: ['ares-prime', 'elysium-pack'],
  },
  {
    id: 'disease-suspicion',
    label: 'Disease suspicion',
    summary: 'The crop agent flags a likely pathogen event in Noctis Stack bay-3.',
    leadAgent: 'crop',
    affectedModules: ['noctis-stack'],
  },
  {
    id: 'dust-storm',
    label: 'Dust storm / power drop',
    summary: 'Regional dust cuts light and power, forcing environmental and resource compensation.',
    leadAgent: 'environment',
    affectedModules: ['ares-prime', 'elysium-pack'],
  },
  {
    id: 'harvest-rush',
    label: 'Harvest rush',
    summary: 'A compressed harvest window drives astronaut dispatch and task reprioritization.',
    leadAgent: 'astro',
    affectedModules: ['ares-prime', 'noctis-stack'],
  },
];

const scenarioOverrides: Record<ScenarioId, Partial<Record<string, Partial<ModuleSummary>>>> = {
  'nominal-day': {},
  'water-pressure': {
    'ares-prime': {
      status: 'warning',
      statusLabel: 'watch',
      alert: 'Backup water routing active for calorie lanes',
      harvestScore: 84,
      resourcePressure: 74,
      astroImpact: 31,
      environment: { temperature: 23, humidity: 68, co2: 1180, light: 88, water: 48 },
    },
    'elysium-pack': {
      status: 'critical',
      statusLabel: 'alert',
      alert: 'Water reserve below target, nutrient timing compressed',
      harvestScore: 63,
      resourcePressure: 89,
      astroImpact: 46,
      environment: { temperature: 22, humidity: 74, co2: 1140, light: 76, water: 32 },
    },
  },
  'disease-suspicion': {
    'noctis-stack': {
      status: 'critical',
      statusLabel: 'alert',
      alert: 'Suspected fungal spread in bay-3, quarantine prep active',
      harvestScore: 58,
      resourcePressure: 61,
      astroImpact: 55,
    },
  },
  'dust-storm': {
    'ares-prime': {
      status: 'warning',
      statusLabel: 'watch',
      alert: 'Light compensation and heater smoothing active',
      harvestScore: 79,
      resourcePressure: 65,
      astroImpact: 34,
      environment: { temperature: 18, humidity: 64, co2: 1210, light: 42, water: 76 },
    },
    'elysium-pack': {
      status: 'critical',
      statusLabel: 'alert',
      alert: 'Power-constrained lighting schedule engaged',
      harvestScore: 57,
      resourcePressure: 82,
      astroImpact: 49,
      environment: { temperature: 17, humidity: 69, co2: 1170, light: 36, water: 51 },
    },
  },
  'harvest-rush': {
    'ares-prime': {
      status: 'warning',
      statusLabel: 'watch',
      alert: 'Mature calorie crops require accelerated harvest team routing',
      harvestScore: 95,
      resourcePressure: 42,
      astroImpact: 71,
      dispatchQueue: ['Harvest team to bay-1', 'Packaging team for cold storage handoff'],
    },
    'noctis-stack': {
      status: 'warning',
      statusLabel: 'watch',
      alert: 'Fast-turn greens need rapid rotation before quality drops',
      harvestScore: 83,
      resourcePressure: 47,
      astroImpact: 69,
      dispatchQueue: ['Dispatch inspector to bay-3', 'Prepare harvest bin reset'],
    },
  },
};

const specialistTemplates: Record<ScenarioId, Omit<SpecialistSnapshot, 'timestamp'>[]> = {
  'nominal-day': [
    { agentId: 'orchestrator', name: 'ORCHESTRATOR', role: 'Coordination Layer', icon: '🧭', status: 'nominal', headline: 'Keep Elysium Pack under resource watch while other modules hold cadence.', riskScore: 24, recommendations: ['Maintain nominal harvest plan', 'Track Elysium reserve trend'], affectedModules: ['elysium-pack'] },
    { agentId: 'environment', name: 'ENVIRONMENT', role: 'Climate Control', icon: '🌡️', status: 'nominal', headline: 'Climate envelope nominal across all active grow lanes.', riskScore: 18, recommendations: ['No environmental retuning required'], affectedModules: ['ares-prime', 'elysium-pack', 'noctis-stack'] },
    { agentId: 'crop', name: 'CROP', role: 'Harvest & Health', icon: '🌱', status: 'watch', headline: 'Noctis Stack bay-3 still needs one more confident inspection pass.', riskScore: 42, recommendations: ['Capture updated visual for bay-3'], affectedModules: ['noctis-stack'] },
    { agentId: 'astro', name: 'ASTRO', role: 'Crew Ops & Dispatch', icon: '👩‍🚀', status: 'nominal', headline: 'Astronaut workload remains inside nominal harvest cadence.', riskScore: 20, recommendations: ['Keep current task queue'], affectedModules: ['mission-wide'] },
    { agentId: 'resource', name: 'RESOURCE', role: 'Water, Energy, Nutrients', icon: '⚡', status: 'watch', headline: 'Elysium Pack water buffer is below plan but still controllable.', riskScore: 51, recommendations: ['Stage recovery cycle for Elysium Pack'], affectedModules: ['elysium-pack'] },
  ],
  'water-pressure': [
    { agentId: 'orchestrator', name: 'ORCHESTRATOR', role: 'Coordination Layer', icon: '🧭', status: 'watch', headline: 'Resource pressure leads the cycle; protect calorie lanes first.', riskScore: 66, recommendations: ['Prioritize water to Ares Prime and Elysium Pack'], affectedModules: ['ares-prime', 'elysium-pack'] },
    { agentId: 'environment', name: 'ENVIRONMENT', role: 'Climate Control', icon: '🌡️', status: 'watch', headline: 'Humidity drift is acceptable, but ventilation must support lower irrigation.', riskScore: 44, recommendations: ['Lower humidity in stressed modules'], affectedModules: ['ares-prime', 'elysium-pack'] },
    { agentId: 'crop', name: 'CROP', role: 'Harvest & Health', icon: '🌱', status: 'watch', headline: 'Crop impact is moderate if irrigation recovers inside one cycle.', riskScore: 48, recommendations: ['Delay low-priority bays by one cycle'], affectedModules: ['ares-prime', 'elysium-pack'] },
    { agentId: 'astro', name: 'ASTRO', role: 'Crew Ops & Dispatch', icon: '👩‍🚀', status: 'watch', headline: 'Two astronaut interventions are needed to stabilize water recovery hardware.', riskScore: 39, recommendations: ['Dispatch technician to Elysium Pack'], affectedModules: ['elysium-pack'] },
    { agentId: 'resource', name: 'RESOURCE', role: 'Water, Energy, Nutrients', icon: '⚡', status: 'alert', headline: 'Water reserve is below target and staged rationing is now active.', riskScore: 84, recommendations: ['Shift reserve water to calorie-heavy modules', 'Queue nutrient line inspection'], affectedModules: ['ares-prime', 'elysium-pack'] },
  ],
  'disease-suspicion': [
    { agentId: 'orchestrator', name: 'ORCHESTRATOR', role: 'Coordination Layer', icon: '🧭', status: 'watch', headline: 'Crop containment leads; resource and astro support remain secondary.', riskScore: 61, recommendations: ['Quarantine Noctis Stack bay-3 pending confirmation'], affectedModules: ['noctis-stack'] },
    { agentId: 'environment', name: 'ENVIRONMENT', role: 'Climate Control', icon: '🌡️', status: 'watch', headline: 'Humidity in Noctis Stack bay-3 is inside disease-friendly range.', riskScore: 57, recommendations: ['Reduce humidity and increase circulation'], affectedModules: ['noctis-stack'] },
    { agentId: 'crop', name: 'CROP', role: 'Harvest & Health', icon: '🌱', status: 'alert', headline: 'Inspection confidence is improving, but bay-3 still looks pathogen-positive.', riskScore: 89, recommendations: ['Inspect bay-3 before harvest', 'Prepare quarantine partition'], affectedModules: ['noctis-stack'] },
    { agentId: 'astro', name: 'ASTRO', role: 'Crew Ops & Dispatch', icon: '👩‍🚀', status: 'watch', headline: 'One inspector and one technician dispatch are now top priority.', riskScore: 46, recommendations: ['Dispatch inspection pair to Noctis Stack'], affectedModules: ['noctis-stack'] },
    { agentId: 'resource', name: 'RESOURCE', role: 'Water, Energy, Nutrients', icon: '⚡', status: 'nominal', headline: 'Resource posture is stable enough to support containment actions.', riskScore: 27, recommendations: ['Hold reserve buffer for isolation workflow'], affectedModules: ['noctis-stack'] },
  ],
  'dust-storm': [
    { agentId: 'orchestrator', name: 'ORCHESTRATOR', role: 'Coordination Layer', icon: '🧭', status: 'alert', headline: 'Environment leads, with resource conservation immediately behind it.', riskScore: 79, recommendations: ['Protect temperature envelope and lighting priority in Ares and Elysium'], affectedModules: ['ares-prime', 'elysium-pack'] },
    { agentId: 'environment', name: 'ENVIRONMENT', role: 'Climate Control', icon: '🌡️', status: 'alert', headline: 'Dust-driven light loss is pushing two modules outside their thermal target.', riskScore: 91, recommendations: ['Increase heater smoothing', 'Move to low-light recovery setpoints'], affectedModules: ['ares-prime', 'elysium-pack'] },
    { agentId: 'crop', name: 'CROP', role: 'Harvest & Health', icon: '🌱', status: 'watch', headline: 'Crop health is still recoverable if low-light conditions stay under two cycles.', riskScore: 43, recommendations: ['Protect mature crops first'], affectedModules: ['ares-prime', 'elysium-pack'] },
    { agentId: 'astro', name: 'ASTRO', role: 'Crew Ops & Dispatch', icon: '👩‍🚀', status: 'watch', headline: 'Astronaut tasking must shift toward power and temperature checks.', riskScore: 40, recommendations: ['Pause non-urgent harvest work'], affectedModules: ['ares-prime', 'elysium-pack'] },
    { agentId: 'resource', name: 'RESOURCE', role: 'Water, Energy, Nutrients', icon: '⚡', status: 'alert', headline: 'Power-constrained lighting schedule is active and reserve buffers are tightening.', riskScore: 83, recommendations: ['Stage energy budget reductions', 'Preserve nutrient circulation in mature bays'], affectedModules: ['ares-prime', 'elysium-pack'] },
  ],
  'harvest-rush': [
    { agentId: 'orchestrator', name: 'ORCHESTRATOR', role: 'Coordination Layer', icon: '🧭', status: 'watch', headline: 'Astro leads the cycle because dispatch timing now determines yield recovery.', riskScore: 70, recommendations: ['Prioritize astronaut routing over marginal optimization work'], affectedModules: ['ares-prime', 'noctis-stack'] },
    { agentId: 'environment', name: 'ENVIRONMENT', role: 'Climate Control', icon: '🌡️', status: 'nominal', headline: 'Climate remains stable enough to support the accelerated harvest window.', riskScore: 21, recommendations: ['Maintain current setpoints'], affectedModules: ['ares-prime', 'noctis-stack'] },
    { agentId: 'crop', name: 'CROP', role: 'Harvest & Health', icon: '🌱', status: 'watch', headline: 'Several mature bays have short quality windows and must be cut in order.', riskScore: 54, recommendations: ['Harvest Ares bay-1 before Noctis microgreens'], affectedModules: ['ares-prime', 'noctis-stack'] },
    { agentId: 'astro', name: 'ASTRO', role: 'Crew Ops & Dispatch', icon: '👩‍🚀', status: 'alert', headline: 'Astronaut workload has crossed the normal dispatch threshold for this sol.', riskScore: 87, recommendations: ['Dispatch harvest team to Ares Prime', 'Queue packaging support for Noctis Stack'], affectedModules: ['ares-prime', 'noctis-stack'] },
    { agentId: 'resource', name: 'RESOURCE', role: 'Water, Energy, Nutrients', icon: '⚡', status: 'watch', headline: 'Resources can support the rush window if packing and cold storage stay on schedule.', riskScore: 38, recommendations: ['Hold reserve power for post-harvest handling'], affectedModules: ['ares-prime', 'noctis-stack'] },
  ],
};

export function getScenarioDefinition(scenarioId: ScenarioId): ScenarioDefinition {
  return scenarios.find((scenario) => scenario.id === scenarioId) ?? scenarios[0];
}

export function getModulesForScenario(scenarioId: ScenarioId): ModuleSummary[] {
  const overrides = scenarioOverrides[scenarioId] ?? {};
  return baseModules.map((module) => {
    const override = overrides[module.id] ?? {};
    return {
      ...module,
      ...override,
      environment: {
        ...module.environment,
        ...(override.environment ?? {}),
      },
      hardware: {
        ...module.hardware,
        ...(override.hardware ?? {}),
      },
      dispatchQueue: override.dispatchQueue ?? module.dispatchQueue,
    };
  });
}

export function getSpecialistsForScenario(scenarioId: ScenarioId): SpecialistSnapshot[] {
  return (specialistTemplates[scenarioId] ?? specialistTemplates['nominal-day']).map((snapshot, index) => ({
    ...snapshot,
    timestamp: now - index * 60000,
  }));
}

export function getDecisionForScenario(scenarioId: ScenarioId): OrchestratorDecision {
  const scenario = getScenarioDefinition(scenarioId);
  const specialists = getSpecialistsForScenario(scenarioId);
  return {
    leadAgent: scenario.leadAgent,
    priorityStack: specialists
      .filter((snapshot) => snapshot.agentId !== 'orchestrator')
      .sort((left, right) => right.riskScore - left.riskScore)
      .slice(0, 3)
      .map((snapshot) => ({
        owner: snapshot.agentId,
        reason: snapshot.headline,
      })),
    operatorSummary: specialists.find((snapshot) => snapshot.agentId === 'orchestrator')?.headline ?? scenario.summary,
    nextActions: specialists.flatMap((snapshot) => snapshot.recommendations.slice(0, 1)).slice(0, 4),
    scenarioLabel: scenario.label,
  };
}

export function getActivityFeedForScenario(scenarioId: ScenarioId): ActivityFeedItem[] {
  const decision = getDecisionForScenario(scenarioId);
  const specialists = getSpecialistsForScenario(scenarioId);
  return [
    {
      agent: 'orchestrator',
      message: decision.operatorSummary,
      timestamp: now,
      type: decision.leadAgent === 'orchestrator' ? 'success' : 'warning',
    },
    ...specialists
      .filter((snapshot) => snapshot.agentId !== 'orchestrator')
      .map((snapshot, index) => ({
        agent: snapshot.agentId,
        message: snapshot.headline,
        timestamp: now - (index + 1) * 90000,
        type: snapshot.status === 'alert' ? 'critical' : snapshot.status === 'watch' ? 'warning' : 'success',
      })),
  ];
}

export function getMetricsForModules(modules: ModuleSummary[], scenarioId: ScenarioId): CommandCenterMetrics {
  const harvestReadiness = Math.round(modules.reduce((sum, module) => sum + module.harvestScore, 0) / modules.length);
  const resourcePressure = Math.round(modules.reduce((sum, module) => sum + module.resourcePressure, 0) / modules.length);
  const astronautLoad = Math.round(modules.reduce((sum, module) => sum + module.astroImpact, 0) / modules.length);
  return {
    harvestReadiness,
    resourcePressure,
    astronautLoad,
    incidentState: scenarioId === 'nominal-day' ? 'Nominal' : scenarioId === 'harvest-rush' ? 'Watch' : 'Active',
  };
}
