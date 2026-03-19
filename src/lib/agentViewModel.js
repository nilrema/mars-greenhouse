const GREENHOUSE_THRESHOLDS = {
  temperature: { min: 20, max: 25 },
  humidity: { min: 60, max: 70 },
  co2Ppm: { min: 1000, max: 1400 },
  lightPpfd: { min: 300, max: 500 },
  waterLitres: { min: 120, max: 220 },
};

function getSeverityScore(severity) {
  if (severity === 'CRITICAL') return 3;
  if (severity === 'WARN') return 2;
  return 1;
}

function pickStatusFromScore(score) {
  if (score >= 3) return 'CRITICAL';
  if (score >= 1) return 'MONITOR';
  return 'STABLE';
}

function deriveGreenhouseOperations(reading = null) {
  if (!reading) {
    return {
      id: 'greenhouse-operations',
      label: 'Greenhouse Operations Agent',
      status: 'WAITING',
      summary: 'No live greenhouse reading available yet.',
      detail: 'Awaiting telemetry.',
      actions: [],
    };
  }

  const issues = Object.entries(GREENHOUSE_THRESHOLDS).flatMap(([metric, range]) => {
    const value = reading[metric];
    if (value == null) return [];
    if (value < range.min) return [{ metric, direction: 'increase', severity: value < range.min * 0.85 ? 'CRITICAL' : 'WARN' }];
    if (value > range.max) return [{ metric, direction: 'decrease', severity: value > range.max * 1.15 ? 'CRITICAL' : 'WARN' }];
    return [];
  });

  const score = issues.reduce((max, issue) => Math.max(max, getSeverityScore(issue.severity)), 0);
  const status = pickStatusFromScore(score);
  const actions = issues.slice(0, 3).map((issue) => `${issue.direction} ${issue.metric}`);

  return {
    id: 'greenhouse-operations',
    label: 'Greenhouse Operations Agent',
    status,
    summary: issues.length
      ? `${issues.length} environmental issue${issues.length > 1 ? 's' : ''} detected.`
      : 'Environment is within the target operating window.',
    detail: issues.length
      ? issues.map((issue) => `${issue.direction} ${issue.metric}`).join(', ')
      : 'Temperature, humidity, CO2, light, and water are stable.',
    actions,
  };
}

function deriveCropHealth(crops = []) {
  const monitorCount = crops.filter((crop) => crop.healthStatus === 'MONITOR').length;
  const criticalCount = crops.filter((crop) => crop.healthStatus === 'CRITICAL').length;
  const status = criticalCount > 0 ? 'CRITICAL' : monitorCount > 0 ? 'MONITOR' : 'STABLE';

  return {
    id: 'crop-health',
    label: 'Crop Health Agent',
    status,
    summary:
      criticalCount > 0
        ? `${criticalCount} crop section${criticalCount > 1 ? 's are' : ' is'} critical.`
        : monitorCount > 0
        ? `${monitorCount} crop section${monitorCount > 1 ? 's need' : ' needs'} inspection.`
        : 'No crop anomalies are currently flagged.',
    detail:
      criticalCount > 0
        ? 'Disease or severe stress risk is threatening production.'
        : monitorCount > 0
        ? 'Image-based inspection is recommended for flagged sections.'
        : 'Crop portfolio is healthy and on plan.',
    actions:
      status === 'STABLE'
        ? ['continue monitoring']
        : ['inspect affected crop sections', 'capture plant image'],
  };
}

function deriveCrewNutrition(crops = []) {
  const diversity = new Set(crops.map((crop) => crop.name).filter(Boolean)).size;
  const monitorCount = crops.filter((crop) => crop.healthStatus === 'MONITOR').length;
  const criticalCount = crops.filter((crop) => crop.healthStatus === 'CRITICAL').length;
  const nutritionScore = Math.max(0, Math.min(100, 58 + diversity * 8 - monitorCount * 10 - criticalCount * 18));
  const mealDiversity = Math.max(20, Math.min(100, diversity * 20));
  const foodSecurity = Math.max(5, Math.min(100, 62 + diversity * 6 - monitorCount * 12 - criticalCount * 20));
  const crewHealthRisk = nutritionScore < 45 || foodSecurity < 35 ? 'HIGH' : nutritionScore < 70 ? 'MEDIUM' : 'LOW';
  const status = crewHealthRisk === 'HIGH' ? 'CRITICAL' : crewHealthRisk === 'MEDIUM' ? 'MONITOR' : 'STABLE';

  return {
    id: 'crew-nutrition',
    label: 'Crew Nutrition Agent',
    status,
    summary: `Nutrition ${nutritionScore}, diversity ${mealDiversity}, food security ${foodSecurity}.`,
    detail: `Crew health risk is ${crewHealthRisk}.`,
    actions:
      crewHealthRisk === 'HIGH'
        ? ['replant calorie-dense crops', 'prioritize crew supply']
        : ['maintain crop mix'],
    metrics: {
      nutritionScore,
      mealDiversity,
      foodSecurity,
      crewHealthRisk,
    },
  };
}

function deriveIncidentChaos(events = [], specialistStatuses = []) {
  const chaosEvent = events.find((event) => event.agentId === 'incident-chaos');
  const criticalSpecialist = specialistStatuses.some((item) => item.status === 'CRITICAL');

  if (!chaosEvent && !criticalSpecialist) {
    return {
      id: 'incident-chaos',
      label: 'Incident / Chaos Agent',
      status: 'IDLE',
      summary: 'No active incident scenario.',
      detail: 'Chaos mode is not currently active.',
      actions: ['stand by'],
    };
  }

  return {
    id: 'incident-chaos',
    label: 'Incident / Chaos Agent',
    status: chaosEvent?.severity || 'MONITOR',
    summary: chaosEvent?.message || 'Incident conditions require extra coordination.',
    detail: chaosEvent?.actionTaken || 'Two greenhouses may be impacted by the active scenario.',
    actions: ['re-run impacted specialists', 'raise operator visibility'],
  };
}

export function buildAgentViewModel({ latestReading, crops, agentEvents }) {
  const greenhouseOperations = deriveGreenhouseOperations(latestReading);
  const cropHealth = deriveCropHealth(crops);
  const crewNutrition = deriveCrewNutrition(crops);
  const incidentChaos = deriveIncidentChaos(agentEvents, [greenhouseOperations, cropHealth, crewNutrition]);

  const specialists = [greenhouseOperations, cropHealth, crewNutrition, incidentChaos];
  const lead =
    crewNutrition.status === 'CRITICAL'
      ? crewNutrition
      : greenhouseOperations.status === 'CRITICAL'
      ? greenhouseOperations
      : cropHealth.status === 'CRITICAL'
      ? cropHealth
      : incidentChaos.status !== 'IDLE'
      ? incidentChaos
      : greenhouseOperations;

  const flow = [
    {
      title: 'Mission Orchestrator -> Greenhouse Operations Agent',
      status: greenhouseOperations.status,
      text: greenhouseOperations.summary,
    },
    {
      title: 'Mission Orchestrator -> Crop Health Agent',
      status: cropHealth.status,
      text: cropHealth.summary,
    },
    {
      title: 'Mission Orchestrator -> Crew Nutrition Agent',
      status: crewNutrition.status,
      text: crewNutrition.summary,
    },
  ];

  if (incidentChaos.status !== 'IDLE') {
    flow.push({
      title: 'Mission Orchestrator -> Incident / Chaos Agent',
      status: incidentChaos.status,
      text: incidentChaos.summary,
    });
  }

  const orchestrator = {
    label: 'Mission Orchestrator',
    lead: lead.label,
    summary: `Lead response: ${lead.id}.`,
    chatResponse:
      lead.id === 'crew-nutrition'
        ? 'Crew nutrition is the current mission priority. Stabilize food security before optimizing anything else.'
        : lead.id === 'greenhouse-operations'
        ? 'Greenhouse conditions need immediate correction before crop performance degrades.'
        : lead.id === 'crop-health'
        ? 'Crop anomalies are threatening production. Inspect affected sections and confirm disease risk.'
        : lead.id === 'incident-chaos'
        ? 'Incident response is active. Re-check impacted greenhouses and coordinate mitigation.'
        : 'All specialist agents are stable. Maintain the current operating plan.',
  };

  return {
    orchestrator,
    specialists,
    flow,
  };
}
