import type {
  AgentResponseMessage,
  AgentStatusSnapshot,
  SimulationContext,
  SubmitChatMessageRequest,
  SubmitChatMessageResponse,
} from '../../../src/components/mission/chatContract';
import type { AgentId, BaseStatus, ChatSeverity } from '../../../src/components/mission/types';

const BASELINE_TEMP = 24;

type SpecialistReport = {
  id: AgentId;
  name: string;
  role: string;
  icon: string;
  status: BaseStatus;
  riskScore: number;
  headline: string;
  recommendations: string[];
  currentAction: string;
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

function inferScenario(message: string): string {
  const normalized = message.toLowerCase();
  if (normalized.includes('water')) {
    return 'water-pressure';
  }
  if (/(disease|inspection)/.test(normalized)) {
    return 'disease-suspicion';
  }
  if (/(dust|power|storm)/.test(normalized)) {
    return 'dust-storm';
  }
  if (/(harvest|crew|dispatch)/.test(normalized)) {
    return 'harvest-rush';
  }
  return 'nominal-day';
}

function contextMetrics(context?: SimulationContext) {
  if (!context) {
    return {
      effectiveTemp: 24,
      humidity: 68,
      waterRecycling: 100,
      powerAvailability: 100,
    };
  }

  const effectiveTemp = BASELINE_TEMP + context.temperatureDrift;
  const humidity = Math.max(
    22,
    68 - Math.round(Math.max(0, 15 - effectiveTemp) * 0.5) + Math.round((100 - context.waterRecycling) * 0.1),
  );
  return {
    effectiveTemp,
    humidity,
    waterRecycling: context.waterRecycling,
    powerAvailability: context.powerAvailability,
  };
}

function analyzeEnvironment(context?: SimulationContext): SpecialistReport {
  const { effectiveTemp, humidity } = contextMetrics(context);
  const score = Math.min(
    100,
    Math.round(Math.max(0, Math.abs(effectiveTemp - 22) * 8) + (humidity > 78 ? (humidity > 84 ? 30 : 15) : 0)),
  );
  const status = statusFromScore(score, 18, 42);
  const recommendations =
    status === 'nominal'
      ? ['Maintain current greenhouse climate setpoints']
      : effectiveTemp < 20
        ? ['Increase temperature toward 22.0', 'Stabilize humidity while the thermal loop recovers']
        : ['Reduce humidity and increase circulation in affected grow lanes'];

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
        : recommendations[0],
    recommendations,
    currentAction: recommendations[0],
  };
}

function analyzeCrop(context?: SimulationContext): SpecialistReport {
  const { effectiveTemp, humidity, powerAvailability, waterRecycling } = contextMetrics(context);
  const score = Math.min(
    100,
    Math.round(
      Math.max(0, 20 - effectiveTemp) * 4 +
        Math.max(0, humidity - 78) * 1.2 +
        Math.max(0, 72 - waterRecycling) * 0.8 +
        Math.max(0, 82 - powerAvailability) * 0.5,
    ),
  );
  const status = statusFromScore(score, 22, 50);
  const recommendations =
    status === 'nominal'
      ? ['Maintain nominal crop monitoring and harvest rotation']
      : ['Protect the most mature crop lanes first', 'Run a focused inspection pass on the highest-risk beds'];

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
        : effectiveTemp < 20
          ? 'Cold greenhouse conditions are increasing crop stress.'
          : 'Crop stress is increasing under the current greenhouse load.',
    recommendations,
    currentAction: recommendations[0],
  };
}

function analyzeAstro(context?: SimulationContext): SpecialistReport {
  const { powerAvailability, waterRecycling } = contextMetrics(context);
  const score = Math.min(
    100,
    Math.round(Math.max(0, 78 - waterRecycling) * 0.6 + Math.max(0, 80 - powerAvailability) * 0.8),
  );
  const status = statusFromScore(score, 20, 40);
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
        : recommendations[0],
    recommendations,
    currentAction: recommendations[0],
  };
}

function analyzeResource(context?: SimulationContext): SpecialistReport {
  const { powerAvailability, waterRecycling } = contextMetrics(context);
  const score = Math.min(
    100,
    Math.round(Math.max(0, 82 - waterRecycling) * 1.2 + Math.max(0, 88 - powerAvailability) * 0.9),
  );
  const status = statusFromScore(score, 18, 44);
  const recommendations =
    status === 'nominal'
      ? ['Maintain current water, nutrient, and power budgets']
      : [
          waterRecycling < powerAvailability
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
        : recommendations[0],
    recommendations,
    currentAction: recommendations[0],
  };
}

function toStatus(report: SpecialistReport): AgentStatusSnapshot {
  return {
    id: report.id,
    name: report.name,
    role: report.role,
    icon: report.icon,
    status: report.status,
    currentAction: report.currentAction,
  };
}

function toMessage(
  report: SpecialistReport,
  timestamp: number,
): AgentResponseMessage {
  return {
    id: `${report.id}-${timestamp}`,
    agentId: report.id,
    agentName: report.name,
    agentRole: report.role,
    severity: severityFromStatus(report.status),
    message: `${report.headline} Current action: ${report.currentAction.toLowerCase()}.`,
    timestamp,
  };
}

export function buildEmbeddedRuntimeResponse(input: SubmitChatMessageRequest): SubmitChatMessageResponse {
  const timestamp = Math.floor(Date.now() / 1000);
  const conversationId = input.conversationId ?? `conv-${timestamp}`;
  const requestId = `req-${timestamp}`;
  const reports = [
    analyzeEnvironment(input.context ?? undefined),
    analyzeCrop(input.context ?? undefined),
    analyzeAstro(input.context ?? undefined),
    analyzeResource(input.context ?? undefined),
  ];
  const ranked = [...reports].sort((left, right) => right.riskScore - left.riskScore);
  const lead = ranked[0];
  const scenario = inferScenario(input.message);
  const nextActions = ranked.flatMap((report) => report.recommendations.slice(0, 1)).slice(0, 4);

  const statuses: AgentStatusSnapshot[] = [
    ...reports.map(toStatus),
    {
      id: 'orchestrator',
      name: 'ORCH_AGENT',
      role: 'Mission Orchestration',
      icon: '🧭',
      status: lead.status === 'nominal' ? 'nominal' : 'warning',
      currentAction: nextActions[0] ?? 'Maintain standard monitoring cadence',
    },
  ];

  const messages: AgentResponseMessage[] = [
    {
      id: `orchestrator-${timestamp}`,
      agentId: 'orchestrator',
      agentName: 'ORCH_AGENT',
      agentRole: 'Mission Orchestration',
      severity: 'info',
      message: 'Mission control acknowledged the operator request and started the retained specialist runtime.',
      timestamp,
    },
    ...reports.map((report, index) => toMessage(report, timestamp + index + 1)),
    {
      id: `orchestrator-${timestamp + reports.length + 1}`,
      agentId: 'orchestrator',
      agentName: 'ORCH_AGENT',
      agentRole: 'Mission Orchestration',
      severity: lead.status === 'critical' ? 'critical' : lead.status === 'warning' ? 'warning' : 'success',
      message: `Orchestrator resolution: ${lead.name} leads the cycle. Scenario: ${scenario}. Next actions: ${nextActions.join('; ')}.`,
      timestamp: timestamp + reports.length + 1,
    },
  ];

  return {
    conversationId,
    requestId,
    agentStatuses: statuses,
    messages,
  };
}
