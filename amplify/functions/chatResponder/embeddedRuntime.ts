import type {
  AgentResponseMessage,
  AgentStatusSnapshot,
  SimulationContext,
  SubmitChatMessageRequest,
  SubmitChatMessageResponse,
} from '../../../src/components/mission/chatContract';
import type { AgentId, BaseStatus, ChatSeverity } from '../../../src/components/mission/types';

const BASELINE_TEMP = 24;

type ScenarioId = 'nominal-day' | 'water-pressure' | 'disease-suspicion' | 'dust-storm' | 'harvest-rush';

type ContextMetrics = {
  effectiveTemp: number;
  humidity: number;
  waterRecycling: number;
  powerAvailability: number;
  tempGap: number;
  waterGap: number;
  powerGap: number;
  humidityGap: number;
};

type SpecialistReport = {
  id: AgentId;
  name: string;
  role: string;
  icon: string;
  status: BaseStatus;
  riskScore: number;
  headline: string;
  observations: string[];
  dependencies: string[];
  asks: string[];
  recommendations: string[];
  currentAction: string;
};

type RuntimeScenario = {
  id: ScenarioId;
  label: string;
  summary: string;
  triggers: string[];
};

function severityFromStatus(status: BaseStatus): ChatSeverity {
  if (status === 'critical') {
    return 'critical';
  }
  if (status === 'warning') {
    return 'warning';
  }
  return 'success';
}

function statusFromScore(score: number, warningThreshold: number, criticalThreshold: number): BaseStatus {
  if (score >= criticalThreshold) {
    return 'critical';
  }
  if (score >= warningThreshold) {
    return 'warning';
  }
  return 'nominal';
}

function contextMetrics(context?: SimulationContext): ContextMetrics {
  if (!context) {
    return {
      effectiveTemp: 24,
      humidity: 68,
      waterRecycling: 100,
      powerAvailability: 100,
      tempGap: 0,
      waterGap: 0,
      powerGap: 0,
      humidityGap: 0,
    };
  }

  const effectiveTemp = BASELINE_TEMP + context.temperatureDrift;
  const humidity = Math.max(
    22,
    68 - Math.max(0, 15 - effectiveTemp) * 0.5 + (100 - context.waterRecycling) * 0.1,
  );

  return {
    effectiveTemp,
    humidity: Math.round(humidity),
    waterRecycling: context.waterRecycling,
    powerAvailability: context.powerAvailability,
    tempGap: Math.max(0, 22 - effectiveTemp),
    waterGap: Math.max(0, 72 - context.waterRecycling),
    powerGap: Math.max(0, 82 - context.powerAvailability),
    humidityGap: Math.max(0, humidity - 78),
  };
}

function detectScenario(message: string, metrics: ContextMetrics): RuntimeScenario {
  const normalized = message.toLowerCase();
  const triggerSet = new Set<string>();

  if (metrics.tempGap >= 4 || metrics.powerGap >= 18 || /(dust|storm|power)/.test(normalized)) {
    triggerSet.add('climate instability');
    triggerSet.add('power pressure');
  }

  if (metrics.waterGap >= 10 || /water|reservoir|irrigation|recycling/.test(normalized)) {
    triggerSet.add('water recovery shortfall');
  }

  if (metrics.humidityGap >= 4 || /disease|inspection|fung|crop stress/.test(normalized)) {
    triggerSet.add('disease-friendly humidity');
  }

  if (/harvest|crew|dispatch|nutrition|meal/.test(normalized)) {
    triggerSet.add('crew support demand');
  }

  if (triggerSet.has('disease-friendly humidity')) {
    return {
      id: 'disease-suspicion',
      label: 'Disease Suspicion',
      summary: 'Humidity and crop stress indicators suggest focused inspection and containment.',
      triggers: [...triggerSet],
    };
  }

  if (metrics.waterGap >= 10) {
    return {
      id: 'water-pressure',
      label: 'Water Pressure',
      summary: 'Water recycling is below the safe operating band, so irrigation and recovery sequencing lead the cycle.',
      triggers: [...triggerSet],
    };
  }

  if (metrics.powerGap >= 18 || metrics.tempGap >= 5) {
    return {
      id: 'dust-storm',
      label: 'Dust Storm / Power Constraint',
      summary: 'Reduced power and temperature recovery suggest an external constraint that forces energy triage.',
      triggers: [...triggerSet],
    };
  }

  if (triggerSet.has('crew support demand')) {
    return {
      id: 'harvest-rush',
      label: 'Harvest Rush',
      summary: 'Crew workload and dispatch timing are the primary coordination concern.',
      triggers: [...triggerSet],
    };
  }

  return {
    id: 'nominal-day',
    label: 'Nominal Day',
    summary: 'No single stressor dominates the greenhouse envelope.',
    triggers: triggerSet.size > 0 ? [...triggerSet] : ['nominal monitoring'],
  };
}

function analyzeEnvironment(metrics: ContextMetrics, scenario: RuntimeScenario): SpecialistReport {
  const score = Math.min(100, Math.round(metrics.tempGap * 10 + metrics.humidityGap * 4 + metrics.powerGap * 1.2));
  const status = statusFromScore(score, 18, 42);
  const observations = [
    metrics.tempGap > 0
      ? `Canopy temperature has fallen to ${metrics.effectiveTemp.toFixed(1)}C, which slows recovery and nutrient uptake.`
      : `Temperature is holding at ${metrics.effectiveTemp.toFixed(1)}C inside the control band.`,
    metrics.humidityGap > 0
      ? `Humidity is elevated at ${metrics.humidity.toFixed(0)}%, which increases fungal exposure during recovery.`
      : `Humidity remains inside the safe disease envelope.`,
  ];
  const dependencies =
    status === 'nominal'
      ? ['Resource should keep reserve power available in case the envelope drifts again.']
      : [
          'Resource needs to preserve enough power headroom for thermal recovery.',
          'Crop should identify which lanes are least tolerant to another cold cycle.',
        ];
  const asks =
    status === 'nominal'
      ? ['Continue passive monitoring of the climate loop.']
      : [
          'Resource, hold lighting cuts away from the recovery lanes until temperature stabilizes.',
          'Crop, flag the cold-sensitive beds so I can prioritize airflow and heating around them.',
        ];
  const recommendations =
    status === 'nominal'
      ? ['Maintain current greenhouse climate setpoints']
      : [
          `Increase temperature toward 22C in the active grow lanes`,
          metrics.humidityGap > 0
            ? 'Pull humidity back below 78% while heat is recovering'
            : 'Retune airflow so thermal recovery does not create stagnant pockets',
        ];

  return {
    id: 'environment',
    name: 'ENV_AGENT',
    role: 'Environment Control',
    icon: '🌡️',
    status,
    riskScore: score,
    headline:
      status === 'nominal'
        ? 'Environmental envelope is stable across the selected module.'
        : scenario.id === 'dust-storm'
          ? 'Climate recovery is constrained by the power shortfall and cannot drift further.'
          : 'Environmental control needs immediate correction before crop stress compounds.',
    observations,
    dependencies,
    asks,
    recommendations,
    currentAction: recommendations[0],
  };
}

function analyzeCrop(metrics: ContextMetrics, scenario: RuntimeScenario): SpecialistReport {
  const score = Math.min(
    100,
    Math.round(metrics.tempGap * 7 + metrics.humidityGap * 6 + metrics.waterGap * 2 + metrics.powerGap * 1.4),
  );
  const status = statusFromScore(score, 22, 50);
  const observations = [
    metrics.tempGap > 0
      ? `Cold drift is slowing canopy recovery and putting the most mature beds at yield risk.`
      : 'Thermal conditions are not the main crop stressor right now.',
    metrics.waterGap > 0
      ? `Water recycling at ${metrics.waterRecycling}% raises irrigation unevenness risk across sensitive lanes.`
      : 'Irrigation pressure is currently inside the normal crop tolerance band.',
  ];
  if (metrics.humidityGap > 0) {
    observations.push('Elevated humidity increases the chance that a stressed lane turns into a disease event.');
  }

  const dependencies =
    status === 'nominal'
      ? ['Environment should keep the envelope steady through the next monitoring cycle.']
      : [
          'Environment must stabilize temperature before we can trust recovery in the mature lanes.',
          'Resource should protect irrigation timing for the most stress-sensitive beds first.',
        ];
  const asks =
    status === 'nominal'
      ? ['No emergency crop intervention is needed from other teams.']
      : [
          'Environment, protect the mature crop lanes from another cold dip during your recovery cycle.',
          'Astro, keep inspection labor available in case humidity converts this into an active containment issue.',
        ];
  const recommendations =
    status === 'nominal'
      ? ['Maintain nominal crop monitoring and harvest rotation']
      : [
          'Protect the most mature crop lanes first',
          metrics.humidityGap > 0
            ? 'Run a disease-focused inspection pass on the highest-risk beds'
            : 'Run a focused inspection pass on the highest-risk beds',
        ];

  return {
    id: 'crop',
    name: 'CROP_AGENT',
    role: 'Crop Management',
    icon: '🌱',
    status,
    riskScore: score,
    headline:
      status === 'nominal'
        ? 'Crop outlook is stable and the near-term harvest window remains intact.'
        : scenario.id === 'disease-suspicion'
          ? 'Crop stress plus humidity drift makes early containment more important than throughput.'
          : 'Crop stress is building faster than the harvest lanes can comfortably absorb.',
    observations,
    dependencies,
    asks,
    recommendations,
    currentAction: recommendations[0],
  };
}

function analyzeAstro(metrics: ContextMetrics, scenario: RuntimeScenario): SpecialistReport {
  const score = Math.min(100, Math.round(metrics.waterGap * 1.1 + metrics.powerGap * 1.3 + metrics.humidityGap * 1.4));
  const status = statusFromScore(score, 20, 40);
  const observations = [
    status === 'nominal'
      ? 'Crew workload remains inside the planned greenhouse support window.'
      : 'Crew support demand rises if inspections, manual checks, or lane triage continue beyond one cycle.',
    metrics.waterGap > 0 || metrics.powerGap > 0
      ? 'A prolonged recovery cycle would start pulling crew time away from nominal harvest cadence.'
      : 'No crew rerouting is needed while specialists hold the current envelope.',
  ];
  const dependencies =
    status === 'nominal'
      ? ['Environment and Resource should keep the recovery inside one cycle to avoid dispatch overhead.']
      : [
          'Crop needs to identify whether inspection labor should go to containment or harvest protection.',
          'Orchestrator should decide whether manual checks outrank routine crew work in the next hour.',
        ];
  const asks =
    status === 'nominal'
      ? ['Keep me informed if this escalates beyond one corrective cycle.']
      : [
          'Crop, tell me which lanes need eyes first so I do not overcommit the crew.',
          'Orchestrator, if Resource extends restrictions, I want harvest labor held in reserve.',
        ];
  const recommendations =
    status === 'nominal'
      ? ['Keep astronaut workload on nominal harvest cadence']
      : ['Queue follow-up checks for monitored crop sections', 'Protect meal coverage while greenhouse conditions recover'];

  return {
    id: 'astro',
    name: 'ASTRO_AGENT',
    role: 'Astronaut Welfare',
    icon: '🧑‍🚀',
    status,
    riskScore: score,
    headline:
      status === 'nominal'
        ? 'Crew workload and nutrition coverage remain inside nominal bounds.'
        : scenario.id === 'harvest-rush'
          ? 'Crew timing now determines whether the greenhouse can recover without slipping meal support.'
          : 'Crew workload is still manageable, but only if the specialists converge on one recovery plan.',
    observations,
    dependencies,
    asks,
    recommendations,
    currentAction: recommendations[0],
  };
}

function analyzeResource(metrics: ContextMetrics, scenario: RuntimeScenario): SpecialistReport {
  const score = Math.min(100, Math.round(metrics.waterGap * 2.4 + metrics.powerGap * 2 + metrics.tempGap * 1.2));
  const status = statusFromScore(score, 18, 44);
  const observations = [
    metrics.waterGap > 0
      ? `Water recycling is down to ${metrics.waterRecycling}%, so irrigation recovery cannot stay flat across all lanes.`
      : 'Water reserves are still inside the nominal operating band.',
    metrics.powerGap > 0
      ? `Power availability at ${metrics.powerAvailability}% limits how aggressively we can recover climate and lighting together.`
      : 'Power headroom is sufficient for the current greenhouse load.',
  ];
  const dependencies =
    status === 'nominal'
      ? ['Environment can keep its normal thermal cadence without a reserve conflict.']
      : [
          'Environment needs to tell me which thermal loads are non-negotiable before I schedule reserve draw.',
          'Crop should identify which lanes justify priority irrigation if water recovery stays constrained.',
        ];
  const asks =
    status === 'nominal'
      ? ['Continue normal load scheduling.']
      : [
          'Environment, give me the minimum viable heating target so I can avoid cutting the wrong load.',
          'Crop, confirm the priority beds before I stagger irrigation across the module.',
        ];
  const recommendations =
    status === 'nominal'
      ? ['Maintain current water, nutrient, and power budgets']
      : [
          metrics.waterGap >= metrics.powerGap
            ? 'Prioritize water recovery and stagger irrigation loads'
            : 'Shift to an energy-constrained lighting schedule for non-critical bays',
          'Preserve reserve capacity for greenhouse stabilization',
        ];

  return {
    id: 'resource',
    name: 'RESOURCE_AGENT',
    role: 'Resource Management',
    icon: '⚡',
    status,
    riskScore: score,
    headline:
      status === 'nominal'
        ? 'Resource reserves are within the nominal operating buffer.'
        : scenario.id === 'water-pressure'
          ? 'Water recovery is now the limiting factor for a clean greenhouse reset.'
          : 'Resource limits are beginning to shape which corrective moves are still safe.',
    observations,
    dependencies,
    asks,
    recommendations,
    currentAction: recommendations[0],
  };
}

function agentStatus(report: SpecialistReport): AgentStatusSnapshot {
  return {
    id: report.id,
    name: report.name,
    role: report.role,
    icon: report.icon,
    status: report.status,
    currentAction: report.currentAction,
  };
}

function message(
  agentId: AgentId,
  agentName: string,
  agentRole: string,
  severity: ChatSeverity,
  body: string,
  timestamp: number,
): AgentResponseMessage {
  return {
    id: `${agentId}-${timestamp}`,
    agentId,
    agentName,
    agentRole,
    severity,
    message: body,
    timestamp,
  };
}

function joinSentences(parts: string[]): string {
  return parts.filter(Boolean).join(' ');
}

function dispatchMessage(scenario: RuntimeScenario, ranked: SpecialistReport[], timestamp: number): AgentResponseMessage {
  const lead = ranked[0];
  return message(
    'orchestrator',
    'ORCH_AGENT',
    'Mission Orchestration',
    'info',
    `Mission control acknowledged the operator request. Scenario assessment: ${scenario.label}. ${scenario.summary} Initial lead is ${lead.name}; all specialists report with dependencies and required support before we lock the recovery plan.`,
    timestamp,
  );
}

function specialistAssessment(report: SpecialistReport, timestamp: number): AgentResponseMessage {
  return message(
    report.id,
    report.name,
    report.role,
    severityFromStatus(report.status),
    joinSentences([
      report.headline,
      report.observations[0] ?? '',
      report.observations[1] ?? '',
      report.asks[0] ? `Request: ${report.asks[0]}` : '',
    ]),
    timestamp,
  );
}

function supportResponse(
  report: SpecialistReport,
  lead: SpecialistReport,
  previous: SpecialistReport | undefined,
  timestamp: number,
): AgentResponseMessage {
  const supportLead = previous?.name ?? lead.name;
  const dependency = report.dependencies[0] ?? `${lead.name} should keep the recovery plan coherent.`;
  const request = report.asks[0] ?? `I can support ${lead.name} once the final priority is confirmed.`;
  return message(
    report.id,
    report.name,
    report.role,
    severityFromStatus(report.status),
    `${supportLead} is setting the tempo for this cycle. ${dependency} ${request}`,
    timestamp,
  );
}

function buildOrchestratorResolution(
  scenario: RuntimeScenario,
  ranked: SpecialistReport[],
  timestamp: number,
): AgentResponseMessage {
  const lead = ranked[0];
  const supporting = ranked.slice(1);
  const plan = [
    `1. ${lead.name}: ${lead.currentAction}.`,
    ...supporting.slice(0, 3).map((report, index) => `${index + 2}. ${report.name}: ${report.currentAction}.`),
  ];
  const rationale = supporting
    .slice(0, 2)
    .map((report) => `${report.name} supports because ${report.dependencies[0]?.toLowerCase() ?? 'its support is required.'}`)
    .join(' ');
  const severity = lead.status === 'critical' ? 'critical' : lead.status === 'warning' ? 'warning' : 'success';

  return message(
    'orchestrator',
    'ORCH_AGENT',
    'Mission Orchestration',
    severity,
    `Orchestrator resolution: ${lead.name} owns the first move for ${scenario.label}. ${rationale} Course of action: ${plan.join(' ')} Success condition: recover the greenhouse without adding a second stressor or pulling crew effort off the core plan.`,
    timestamp,
  );
}

export function buildEmbeddedRuntimeResponse(input: SubmitChatMessageRequest): SubmitChatMessageResponse {
  const timestamp = Math.floor(Date.now() / 1000);
  const conversationId = input.conversationId ?? `conv-${timestamp}`;
  const requestId = `req-${timestamp}`;
  const metrics = contextMetrics(input.context ?? undefined);
  const scenario = detectScenario(input.message, metrics);
  const reports = [
    analyzeEnvironment(metrics, scenario),
    analyzeCrop(metrics, scenario),
    analyzeAstro(metrics, scenario),
    analyzeResource(metrics, scenario),
  ];
  const ranked = [...reports].sort((left, right) => right.riskScore - left.riskScore);
  const lead = ranked[0];

  const messages: AgentResponseMessage[] = [
    dispatchMessage(scenario, ranked, timestamp),
    specialistAssessment(lead, timestamp + 1),
    ...ranked.slice(1).map((report, index) => supportResponse(report, lead, ranked[index], timestamp + index + 2)),
    buildOrchestratorResolution(scenario, ranked, timestamp + ranked.length + 1),
  ];

  const agentStatuses: AgentStatusSnapshot[] = [
    ...reports.map(agentStatus),
    {
      id: 'orchestrator',
      name: 'ORCH_AGENT',
      role: 'Mission Orchestration',
      icon: '🧭',
      status: lead.status === 'nominal' ? 'nominal' : 'warning',
      currentAction: lead.currentAction,
    },
  ];

  return {
    conversationId,
    requestId,
    agentStatuses,
    messages,
  };
}
