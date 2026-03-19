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

function resolveStatus(stress: number, mildThreshold: number, severeThreshold: number): BaseStatus {
  if (stress >= severeThreshold) {
    return 'critical';
  }

  if (stress >= mildThreshold) {
    return 'warning';
  }

  return 'nominal';
}

export function buildAgentStatuses(context?: SimulationContext): AgentStatusSnapshot[] {
  const stress = getStress(context);
  const effectiveTemp = BASELINE_TEMP + (context?.temperatureDrift ?? 0);
  const waterRecycling = context?.waterRecycling ?? 100;
  const powerAvailability = context?.powerAvailability ?? 100;

  return [
    {
      id: 'environment',
      name: 'ENV_AGENT',
      role: 'Environment Control',
      icon: '🌡️',
      status: resolveStatus(
        Math.max(stress, context && context.temperatureDrift < -5 ? 45 : 0),
        20,
        45,
      ),
      currentAction:
        context && context.temperatureDrift < -2
          ? `Counteracting temperature drift at ${effectiveTemp}°C.`
          : 'Climate loop stable and holding target conditions.',
    },
    {
      id: 'crop',
      name: 'CROP_AGENT',
      role: 'Crop Management',
      icon: '🌱',
      status: resolveStatus(stress, 30, 55),
      currentAction:
        stress > 30
          ? 'Reducing crop stress and protecting harvest yield.'
          : 'Harvest rotation and canopy health remain on schedule.',
    },
    {
      id: 'astro',
      name: 'ASTRO_AGENT',
      role: 'Astronaut Welfare',
      icon: '🧑‍🚀',
      status: resolveStatus(stress, 40, 60),
      currentAction:
        stress > 40
          ? 'Monitoring crew workload, nutrition coverage, and contingency staffing.'
          : 'Crew nutrition and workload remain nominal.',
    },
    {
      id: 'resource',
      name: 'RESOURCE_AGENT',
      role: 'Resource Management',
      icon: '⚡',
      status: resolveStatus(Math.max(100 - waterRecycling, 100 - powerAvailability), 30, 55),
      currentAction:
        waterRecycling < 70
          ? `Water recycling is ${waterRecycling}%. Compensating through reserve prioritization.`
          : powerAvailability < 80
            ? `Power availability is ${powerAvailability}%. Rebalancing non-critical loads.`
            : 'Water and power reserves remain stable.',
    },
    {
      id: 'orchestrator',
      name: 'ORCH_AGENT',
      role: 'Mission Orchestration',
      icon: '🧭',
      status: resolveStatus(stress, 25, 55),
      currentAction:
        stress > 25
          ? 'Coordinating mitigation across greenhouse, crop, crew, and resource specialists.'
          : 'Specialists remain aligned on nominal operations.',
    },
  ];
}

function containsAny(text: string, words: string[]) {
  return words.some((word) => text.includes(word));
}

function inferPrimaryAgent(message: string): AgentId {
  const normalized = message.toLowerCase();

  if (containsAny(normalized, ['temp', 'temperature', 'climate', 'cold', 'heat', 'humidity'])) {
    return 'environment';
  }

  if (containsAny(normalized, ['water', 'power', 'resource', 'energy', 'irrigation', 'reservoir'])) {
    return 'resource';
  }

  if (containsAny(normalized, ['crop', 'plant', 'yield', 'harvest', 'growth'])) {
    return 'crop';
  }

  if (containsAny(normalized, ['crew', 'astronaut', 'nutrition', 'food', 'meal', 'health'])) {
    return 'astro';
  }

  return 'orchestrator';
}

function buildPrimaryMessage(
  primaryAgent: AgentId,
  normalizedMessage: string,
  context: SimulationContext | undefined,
  stress: number,
): { severity: ChatSeverity; text: string } {
  const effectiveTemp = BASELINE_TEMP + (context?.temperatureDrift ?? 0);

  switch (primaryAgent) {
    case 'environment':
      return {
        severity: stress >= 55 ? 'critical' : context?.temperatureDrift && context.temperatureDrift < -2 ? 'warning' : 'info',
        text:
          context && context.temperatureDrift !== 0
            ? `Environmental controls are tracking a live temperature of ${effectiveTemp}°C. I am compensating for the current drift and monitoring humidity stability before conditions cascade into crop stress.`
            : 'Environmental controls are nominal. I can keep tracking temperature, humidity, and atmosphere if you want a deeper climate readout.',
      };
    case 'resource':
      return {
        severity:
          context && (context.waterRecycling < 60 || context.powerAvailability < 50) ? 'critical' : 'warning',
        text:
          context
            ? `Resource posture is ${context.waterRecycling}% water recycling and ${context.powerAvailability}% power availability. I am prioritizing greenhouse continuity first and deferring non-critical loads.`
            : 'Resource systems are stable. Ask for water, power, or irrigation posture and I will return a current operating summary.',
      };
    case 'crop':
      return {
        severity: stress >= 45 ? 'warning' : 'success',
        text:
          context
            ? 'Crop outlook is being recalculated against the current greenhouse conditions. The immediate focus is preserving plant health, reducing stress exposure, and protecting near-term harvest yield.'
            : 'Crop conditions are nominal right now. I can summarize harvest readiness, plant stress, or inspection priorities when needed.',
      };
    case 'astro':
      return {
        severity: stress >= 45 ? 'warning' : 'info',
        text:
          context
            ? 'Crew impact remains tied to greenhouse recovery. I am watching nutrition coverage, manual workload, and whether environmental instability could force schedule changes.'
            : 'Crew posture is nominal. I can summarize nutrition and workload implications whenever greenhouse conditions shift.',
      };
    case 'orchestrator':
    default:
      return {
        severity: stress >= 55 ? 'warning' : 'info',
        text: normalizedMessage.includes('status')
          ? 'Mission control summary ready. I can route the request to the most relevant specialist and return a coordinated answer without leaving the operator chat flow.'
          : 'Request received. I am coordinating the specialist agents and returning the clearest next action based on the current greenhouse context.',
      };
  }
}

function messageForAgent(
  status: AgentStatusSnapshot,
  severity: ChatSeverity,
  message: string,
  timestamp: number,
): AgentResponseMessage {
  return {
    id: `${status.id}-${timestamp}`,
    agentId: status.id,
    agentName: status.name,
    agentRole: status.role,
    severity,
    message,
    timestamp,
  };
}

export function buildChatResponse(input: SubmitChatMessageRequest): SubmitChatMessageResponse {
  const request = submitChatMessageRequestSchema.parse(input);
  const timestamp = Date.now();
  const requestId = `req-${timestamp}`;
  const conversationId = request.conversationId ?? `conv-${timestamp}`;
  const agentStatuses = buildAgentStatuses(request.context);
  const primaryAgent = inferPrimaryAgent(request.message);
  const primaryStatus = agentStatuses.find((status) => status.id === primaryAgent) ?? agentStatuses[0];
  const stress = getStress(request.context);
  const normalizedMessage = request.message.toLowerCase();
  const primary = buildPrimaryMessage(primaryAgent, normalizedMessage, request.context, stress);

  const messages: AgentResponseMessage[] = [
    messageForAgent(primaryStatus, primary.severity, primary.text, timestamp),
  ];

  if (stress >= 25 || primaryAgent !== 'orchestrator') {
    const orchestrator = agentStatuses.find((status) => status.id === 'orchestrator') ?? agentStatuses[0];
    const summary =
      stress >= 55
        ? 'Priority sequence is containment, greenhouse stabilization, then crew-impact review. Keep the operator loop active while the specialists work through mitigation.'
        : 'Specialists are aligned. The operator can continue using chat as the control point while we keep greenhouse, crop, and crew signals coordinated.';

    messages.push(messageForAgent(orchestrator, stress >= 55 ? 'warning' : 'info', summary, timestamp + 1));
  }

  return {
    conversationId,
    requestId,
    agentStatuses,
    messages,
  };
}
