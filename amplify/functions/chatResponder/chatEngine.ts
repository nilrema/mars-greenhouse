import {
  submitChatMessageRequestSchema,
  type AgentResponseMessage,
  type AgentStatusSnapshot,
  type SimulationContext,
  type SubmitChatMessageRequest,
  type SubmitChatMessageResponse,
} from '../../../src/components/mission/chatContract';
import type { AgentId, BaseStatus, ChatSeverity } from '../../../src/components/mission/types';

const BASELINE_TEMP = 24;

type SpecialistInsight = {
  id: AgentId;
  name: string;
  role: string;
  icon: string;
  status: BaseStatus;
  severity: ChatSeverity;
  riskScore: number;
  headline: string;
  response: string;
  recommendations: string[];
  currentAction: string;
};

type OrchestratorResolution = {
  leadAgent: AgentId;
  severity: ChatSeverity;
  summary: string;
  recommendations: string[];
};

function getStress(context?: SimulationContext) {
  if (!context) {
    return 0;
  }

  const effectiveTemp = BASELINE_TEMP + context.temperatureDrift;
  const tempStress = Math.max(0, (15 - effectiveTemp) * 5);
  const waterStress = Math.max(0, (60 - context.waterRecycling) * 0.8);
  const powerStress = Math.max(0, (50 - context.powerAvailability) * 0.6);

  return Math.min(100, tempStress + waterStress + powerStress);
}

function severityFromStatus(status: BaseStatus): ChatSeverity {
  if (status === 'critical') {
    return 'critical';
  }

  if (status === 'warning') {
    return 'warning';
  }

  return 'success';
}

function statusFromRisk(riskScore: number, warningThreshold: number, criticalThreshold: number): BaseStatus {
  if (riskScore >= criticalThreshold) {
    return 'critical';
  }

  if (riskScore >= warningThreshold) {
    return 'warning';
  }

  return 'nominal';
}

function humidityFromContext(context: SimulationContext | undefined) {
  if (!context) {
    return 68;
  }

  const effectiveTemp = BASELINE_TEMP + context.temperatureDrift;
  return Math.max(
    20,
    68 - Math.round(Math.max(0, (15 - effectiveTemp) * 0.5)) + Math.round((100 - context.waterRecycling) * 0.1),
  );
}

function inferFocus(message: string) {
  const normalized = message.toLowerCase();

  return {
    environment: /(temp|temperature|climate|cold|heat|humidity|air)/.test(normalized),
    resource: /(water|power|resource|energy|irrigation|reservoir)/.test(normalized),
    crop: /(crop|plant|yield|harvest|growth|disease|inspection)/.test(normalized),
    astro: /(crew|astronaut|nutrition|food|meal|health|workload)/.test(normalized),
    resolution: /(resolve|resolution|plan|next step|coordinate|summary|status)/.test(normalized),
  };
}

function analyzeEnvironment(context: SimulationContext | undefined, focus: ReturnType<typeof inferFocus>): SpecialistInsight {
  const effectiveTemp = BASELINE_TEMP + (context?.temperatureDrift ?? 0);
  const humidity = humidityFromContext(context);
  const temperatureRisk = Math.max(0, Math.abs(effectiveTemp - 22) * 8);
  const humidityRisk = humidity > 78 ? (humidity > 84 ? 34 : 18) : humidity < 55 ? 14 : 0;
  const riskScore = Math.min(100, Math.round(temperatureRisk + humidityRisk));
  const status = statusFromRisk(riskScore, 18, 42);
  const headline =
    status === 'nominal'
      ? 'Environmental envelope is stable across the selected greenhouse.'
      : effectiveTemp < 20
        ? `Temperature is drifting down to ${effectiveTemp}°C and needs stabilization.`
        : humidity > 78
          ? `Humidity is elevated at ${humidity}% and increasing disease risk.`
          : `Environmental controls need correction around ${effectiveTemp}°C and ${humidity}% humidity.`;
  const recommendations =
    status === 'nominal'
      ? ['Maintain current greenhouse climate setpoints']
      : effectiveTemp < 20
        ? ['Increase thermal recovery and protect the crop envelope', 'Stabilize humidity while heat recovers']
        : humidity > 78
          ? ['Increase circulation and dehumidification in the active lanes', 'Protect vulnerable crop sections from fungal spread']
          : ['Retune climate controls before crop stress compounds'];
  const response =
    status === 'nominal' && !focus.environment
      ? 'Environment agent confirms the climate loop is nominal and no immediate retuning is required.'
      : `${headline} I recommend ${recommendations[0].toLowerCase()}${recommendations[1] ? `, then ${recommendations[1].toLowerCase()}` : ''}.`;

  return {
    id: 'environment',
    name: 'ENV_AGENT',
    role: 'Environment Control',
    icon: '🌡️',
    status,
    severity: severityFromStatus(status),
    riskScore,
    headline,
    response,
    recommendations,
    currentAction: recommendations[0],
  };
}

function analyzeCrop(
  context: SimulationContext | undefined,
  focus: ReturnType<typeof inferFocus>,
): SpecialistInsight {
  const stress = getStress(context);
  const effectiveTemp = BASELINE_TEMP + (context?.temperatureDrift ?? 0);
  const waterRecycling = context?.waterRecycling ?? 100;
  const powerAvailability = context?.powerAvailability ?? 100;
  const riskScore = Math.min(
    100,
    Math.round(
      Math.max(0, stress * 0.9) +
        Math.max(0, 72 - waterRecycling) * 0.6 +
        Math.max(0, 82 - powerAvailability) * 0.35,
    ),
  );
  const status = statusFromRisk(riskScore, 22, 50);
  const headline =
    status === 'nominal'
      ? 'Crop outlook is stable and the near-term harvest window remains intact.'
      : effectiveTemp < 20
        ? 'Crop stress is increasing because colder greenhouse conditions are slowing recovery.'
        : waterRecycling < 70
          ? 'Reduced water recycling is pushing the crop lanes into a monitored stress state.'
          : 'Crop yield risk is rising under the current greenhouse load.';
  const recommendations =
    status === 'nominal'
      ? ['Maintain nominal crop monitoring and harvest rotation']
      : [
          'Protect the most mature crop lanes first',
          waterRecycling < 70 ? 'Inspect irrigation-sensitive sections for stress markers' : 'Run a focused inspection pass on the highest-risk beds',
        ];
  const response =
    status === 'nominal' && !focus.crop
      ? 'Crop agent reports nominal plant health across the active lanes.'
      : `${headline} My priority is to ${recommendations[0].toLowerCase()}${recommendations[1] ? ` and ${recommendations[1].toLowerCase()}` : ''}.`;

  return {
    id: 'crop',
    name: 'CROP_AGENT',
    role: 'Crop Management',
    icon: '🌱',
    status,
    severity: severityFromStatus(status),
    riskScore,
    headline,
    response,
    recommendations,
    currentAction: recommendations[0],
  };
}

function analyzeAstro(
  context: SimulationContext | undefined,
  focus: ReturnType<typeof inferFocus>,
): SpecialistInsight {
  const stress = getStress(context);
  const waterRecycling = context?.waterRecycling ?? 100;
  const powerAvailability = context?.powerAvailability ?? 100;
  const foodSecurityDays = Math.max(20, Math.round(142 - stress * 1.2));
  const workloadRisk = Math.max(0, 100 - foodSecurityDays) * 0.55 + Math.max(0, 80 - powerAvailability) * 0.3;
  const riskScore = Math.min(100, Math.round(workloadRisk + Math.max(0, 78 - waterRecycling) * 0.2));
  const status = statusFromRisk(riskScore, 20, 46);
  const headline =
    status === 'nominal'
      ? 'Crew workload and nutrition coverage remain inside nominal bounds.'
      : foodSecurityDays < 110
        ? `Projected food security is down to ${foodSecurityDays} sols under current stress.`
        : 'Crew workload is rising because greenhouse recovery now needs manual follow-up.';
  const recommendations =
    status === 'nominal'
      ? ['Keep astronaut workload on nominal harvest cadence']
      : ['Queue follow-up checks for the highest-risk greenhouse sections', 'Protect meal coverage while greenhouse conditions recover'];
  const response =
    status === 'nominal' && !focus.astro
      ? 'Astro agent confirms the crew can stay on the normal workload plan.'
      : `${headline} I recommend ${recommendations[0].toLowerCase()}${recommendations[1] ? ` and ${recommendations[1].toLowerCase()}` : ''}.`;

  return {
    id: 'astro',
    name: 'ASTRO_AGENT',
    role: 'Astronaut Welfare',
    icon: '🧑‍🚀',
    status,
    severity: severityFromStatus(status),
    riskScore,
    headline,
    response,
    recommendations,
    currentAction: recommendations[0],
  };
}

function analyzeResource(
  context: SimulationContext | undefined,
  focus: ReturnType<typeof inferFocus>,
): SpecialistInsight {
  const waterRecycling = context?.waterRecycling ?? 100;
  const powerAvailability = context?.powerAvailability ?? 100;
  const riskScore = Math.min(
    100,
    Math.round(Math.max(0, 82 - waterRecycling) * 1.2 + Math.max(0, 88 - powerAvailability) * 0.9),
  );
  const status = statusFromRisk(riskScore, 18, 44);
  const headline =
    status === 'nominal'
      ? 'Resource reserves are within the nominal operating buffer.'
      : waterRecycling < powerAvailability
        ? `Water recycling has dropped to ${waterRecycling}% and needs active compensation.`
        : `Power availability is down to ${powerAvailability}% and reserve scheduling is active.`;
  const recommendations =
    status === 'nominal'
      ? ['Maintain current water, nutrient, and power budgets']
      : [
          waterRecycling < powerAvailability
            ? 'Prioritize water recovery and stagger irrigation loads'
            : 'Shift to an energy-constrained lighting schedule for non-critical bays',
          'Preserve reserve capacity for greenhouse stabilization',
        ];
  const response =
    status === 'nominal' && !focus.resource
      ? 'Resource agent confirms water and power are currently stable.'
      : `${headline} I am moving to ${recommendations[0].toLowerCase()}${recommendations[1] ? ` while we ${recommendations[1].toLowerCase()}` : ''}.`;

  return {
    id: 'resource',
    name: 'RESOURCE_AGENT',
    role: 'Resource Management',
    icon: '⚡',
    status,
    severity: severityFromStatus(status),
    riskScore,
    headline,
    response,
    recommendations,
    currentAction: recommendations[0],
  };
}

function resolveMission(
  reports: SpecialistInsight[],
  focus: ReturnType<typeof inferFocus>,
  prompt: string,
): OrchestratorResolution {
  const ranked = [...reports].sort((left, right) => right.riskScore - left.riskScore);
  const lead = ranked[0];
  const activeReports = ranked.filter((report) => report.status !== 'nominal');
  const sequence =
    activeReports.length === 0
      ? 'No specialist escalation is required right now.'
      : activeReports
          .map((report, index) =>
            index === 0
              ? `${report.name} takes point`
              : `${report.name} supports with ${report.currentAction.toLowerCase()}`,
          )
          .join(', ');
  const recommendations = ranked.flatMap((report) => report.recommendations.slice(0, 1)).slice(0, 3);
  const summary =
    activeReports.length === 0 && !focus.resolution
      ? 'Orchestrator resolution: all specialist agents report nominal conditions, so we keep standard monitoring and preserve reserve capacity.'
      : `Orchestrator resolution: ${lead.name} leads the cycle. ${sequence} Final plan: ${recommendations.join('; ')}. Request context: ${prompt.trim()}.`;
  const severity = lead.status === 'critical' ? 'critical' : activeReports.length > 0 ? 'warning' : 'success';

  return {
    leadAgent: lead.id,
    severity,
    summary,
    recommendations,
  };
}

function toStatusSnapshot(report: SpecialistInsight): AgentStatusSnapshot {
  return {
    id: report.id,
    name: report.name,
    role: report.role,
    icon: report.icon,
    status: report.status,
    currentAction: report.currentAction,
  };
}

function messageForAgent(
  agentId: AgentId,
  agentName: string,
  agentRole: string,
  severity: ChatSeverity,
  message: string,
  timestamp: number,
): AgentResponseMessage {
  return {
    id: `${agentId}-${timestamp}`,
    agentId,
    agentName,
    agentRole,
    severity,
    message,
    timestamp,
  };
}

export function buildChatResponse(input: SubmitChatMessageRequest): SubmitChatMessageResponse {
  const request = submitChatMessageRequestSchema.parse(input);
  const timestamp = Math.floor(Date.now() / 1000);
  const requestId = `req-${timestamp}`;
  const conversationId = request.conversationId ?? `conv-${timestamp}`;
  const focus = inferFocus(request.message);
  const context = request.context ?? undefined;

  const environment = analyzeEnvironment(context, focus);
  const crop = analyzeCrop(context, focus);
  const astro = analyzeAstro(context, focus);
  const resource = analyzeResource(context, focus);
  const reports = [environment, crop, astro, resource];
  const resolution = resolveMission(reports, focus, request.message);

  const agentStatuses: AgentStatusSnapshot[] = [
    ...reports.map(toStatusSnapshot),
    {
      id: 'orchestrator' as const,
      name: 'ORCH_AGENT',
      role: 'Mission Orchestration',
      icon: '🧭',
      status:
        resolution.severity === 'critical'
          ? 'critical'
          : resolution.severity === 'warning'
            ? 'warning'
            : 'nominal',
      currentAction: resolution.recommendations[0] ?? 'Maintain standard monitoring cadence',
    },
  ];

  const messages = [
    messageForAgent(
      'orchestrator',
      'ORCH_AGENT',
      'Mission Orchestration',
      'info',
      'Mission control acknowledged the operator request and opened a specialist coordination cycle.',
      timestamp,
    ),
    ...reports.map((report, index) =>
      messageForAgent(
        report.id,
        report.name,
        report.role,
        report.severity,
        report.response,
        timestamp + index + 1,
      ),
    ),
    messageForAgent(
      'orchestrator',
      'ORCH_AGENT',
      'Mission Orchestration',
      resolution.severity,
      resolution.summary,
      timestamp + reports.length + 1,
    ),
  ];

  return {
    conversationId,
    requestId,
    agentStatuses,
    messages,
  };
}
