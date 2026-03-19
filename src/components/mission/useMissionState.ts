import { useCallback, useMemo, useState } from 'react';
import type {
  AgentStatusCard,
  AstronautRecord,
  ConversationMessage,
  HumanMetrics,
  MarsBase,
  SimulationParams,
} from './types';
import { submitChatMessage } from './chatApi';
import type { AgentStatusSnapshot } from './chatContract';

const BASELINE_TEMP = 24;

const initialBase: MarsBase = {
  id: 'alpha',
  name: 'Greenhouse Alpha',
  label: 'PRIMARY GREENHOUSE',
  status: 'nominal',
  production: 94,
  risk: 8,
  crops: [
    { name: 'Potatoes', growthStage: 65, daysToHarvest: 28, health: 95, stressStatus: 'Healthy', projectedYield: 4200, anomaly: false },
    { name: 'Beans', growthStage: 48, daysToHarvest: 42, health: 88, stressStatus: 'Healthy', projectedYield: 1800, anomaly: false },
    { name: 'Lettuce', growthStage: 82, daysToHarvest: 8, health: 92, stressStatus: 'Healthy', projectedYield: 320, anomaly: false },
    { name: 'Radishes', growthStage: 71, daysToHarvest: 14, health: 96, stressStatus: 'Healthy', projectedYield: 280, anomaly: false },
    { name: 'Herbs', growthStage: 55, daysToHarvest: 21, health: 90, stressStatus: 'Healthy', projectedYield: 150, anomaly: false },
  ],
  environment: { temperature: 24, humidity: 68, co2: 1200, light: 92, water: 85 },
  hardware: { heaterActive: false, heaterPower: 0, irrigationPumpFlow: 45, ledBrightness: 92 },
};

const initialAstronauts: AstronautRecord[] = [
  {
    name: 'Cmdr. Vasquez',
    avatar: '👩‍🚀',
    role: 'Mission Commander',
    calories: { current: 1820, target: 2200 },
    protein: { current: 72, target: 90 },
    micronutrientScore: 88,
    hydration: 'optimal',
    health: 'nominal',
  },
  {
    name: 'Dr. Okafor',
    avatar: '👨‍🔬',
    role: 'Botanist',
    calories: { current: 1950, target: 2100 },
    protein: { current: 85, target: 85 },
    micronutrientScore: 92,
    hydration: 'optimal',
    health: 'nominal',
  },
  {
    name: 'Lt. Park',
    avatar: '🧑‍🚀',
    role: 'Systems Engineer',
    calories: { current: 1600, target: 2300 },
    protein: { current: 58, target: 95 },
    micronutrientScore: 64,
    hydration: 'low',
    health: 'warning',
  },
  {
    name: 'Sgt. Ivanova',
    avatar: '👩‍🔧',
    role: 'Mechanical Specialist',
    calories: { current: 2100, target: 2400 },
    protein: { current: 91, target: 100 },
    micronutrientScore: 79,
    hydration: 'adequate',
    health: 'nominal',
  },
];

const initialAgents: AgentStatusCard[] = [
  { id: 'environment', name: 'ENV_AGENT', role: 'Environment Control', icon: '🌡️', status: 'nominal', currentAction: 'Climate stable. Temperature 24°C, humidity 68%.' },
  { id: 'crop', name: 'CROP_AGENT', role: 'Crop Management', icon: '🌱', status: 'nominal', currentAction: 'Harvest windows remain on schedule.' },
  { id: 'astro', name: 'ASTRO_AGENT', role: 'Astronaut Welfare', icon: '🧑‍🚀', status: 'nominal', currentAction: 'Crew nutrition and workload nominal.' },
  { id: 'resource', name: 'RESOURCE_AGENT', role: 'Resource Management', icon: '⚡', status: 'nominal', currentAction: 'Water and power reserves sufficient.' },
];

const initialMetrics: HumanMetrics = {
  nutritionScore: 94,
  mealDiversity: 87,
  foodSecurityDays: 142,
  crewHealthRisk: 'nominal',
};

const defaultSimParams: SimulationParams = {
  temperatureDrift: 0,
  waterRecycling: 100,
  powerAvailability: 100,
};

function computeHardware(params: SimulationParams) {
  const effectiveTemp = BASELINE_TEMP + params.temperatureDrift;
  const heaterNeeded = effectiveTemp < 18;
  const heaterPower = heaterNeeded ? Math.min(100, Math.round((18 - effectiveTemp) * 10)) : 0;
  const waterDeficit = 100 - params.waterRecycling;
  const irrigationPumpFlow = Math.min(100, 45 + Math.round(waterDeficit * 0.8));
  const ledBrightness = Math.round(params.powerAvailability * 0.92);

  return {
    heaterActive: heaterNeeded,
    heaterPower,
    irrigationPumpFlow,
    ledBrightness: Math.max(0, ledBrightness),
  };
}

function getStress(params: SimulationParams) {
  const effectiveTemp = BASELINE_TEMP + params.temperatureDrift;
  const tempStress = Math.max(0, (15 - effectiveTemp) * 5);
  const waterStress = Math.max(0, (60 - params.waterRecycling) * 0.8);
  const powerStress = Math.max(0, (50 - params.powerAvailability) * 0.6);
  return Math.min(100, tempStress + waterStress + powerStress);
}

function stressLabel(stress: number) {
  if (stress > 60) return 'Critical Stress';
  if (stress > 30) return 'Moderate Stress';
  if (stress > 10) return 'Mild Stress';
  return 'Healthy';
}

function computeBaseFromParams(params: SimulationParams): MarsBase {
  const effectiveTemp = BASELINE_TEMP + params.temperatureDrift;
  const totalStress = getStress(params);
  const status = totalStress > 50 ? 'critical' : totalStress > 20 ? 'warning' : 'nominal';

  return {
    ...initialBase,
    status,
    production: Math.max(10, Math.round(94 - totalStress * 0.8)),
    risk: Math.min(95, Math.round(8 + totalStress)),
    crops: initialBase.crops.map((crop, index) => {
      const cropStress = totalStress + index * 2;
      const health = Math.max(10, Math.round(crop.health - cropStress * 0.6));
      const yieldMultiplier = Math.max(0.1, 1 - totalStress / 120);
      return {
        ...crop,
        health,
        stressStatus: stressLabel(cropStress),
        projectedYield: Math.round(crop.projectedYield * yieldMultiplier),
        anomaly: health < 50,
      };
    }),
    environment: {
      temperature: effectiveTemp,
      humidity: Math.max(20, 68 - Math.round(Math.max(0, (15 - effectiveTemp) * 0.5)) + Math.round((100 - params.waterRecycling) * 0.1)),
      co2: 1200,
      light: Math.round(params.powerAvailability * 0.92),
      water: params.waterRecycling,
    },
    hardware: computeHardware(params),
  };
}

function computeAstronautsFromStress(stress: number): AstronautRecord[] {
  return initialAstronauts.map((astronaut, index) => {
    const burden = stress + index * 6;
    const calories = Math.max(1200, astronaut.calories.current - Math.round(burden * 4));
    const protein = Math.max(40, astronaut.protein.current - Math.round(burden * 0.35));
    const micronutrientScore = Math.max(45, astronaut.micronutrientScore - Math.round(burden * 0.45));

    return {
      ...astronaut,
      calories: { ...astronaut.calories, current: calories },
      protein: { ...astronaut.protein, current: protein },
      micronutrientScore,
      hydration: burden > 50 ? 'low' : burden > 20 ? 'adequate' : 'optimal',
      health: burden > 55 ? 'warning' : astronaut.health,
    };
  });
}

function computeMetricsFromStress(stress: number): HumanMetrics {
  return {
    nutritionScore: Math.max(30, Math.round(94 - stress * 0.5)),
    mealDiversity: Math.max(20, Math.round(87 - stress * 0.6)),
    foodSecurityDays: Math.max(20, Math.round(142 - stress * 1.2)),
    crewHealthRisk: stress > 50 ? 'critical' : stress > 20 ? 'warning' : 'nominal',
  };
}

function computeAgents(params: SimulationParams, stress: number): AgentStatusCard[] {
  const effectiveTemp = BASELINE_TEMP + params.temperatureDrift;
  return [
    {
      id: 'environment',
      name: 'ENV_AGENT',
      role: 'Environment Control',
      icon: '🌡️',
      status: params.temperatureDrift < -5 || params.powerAvailability < 40 ? 'warning' : 'nominal',
      currentAction: params.temperatureDrift < -2 ? `Counteracting temperature drift at ${effectiveTemp}°C.` : 'CO₂ and climate conditions stable.',
    },
    {
      id: 'crop',
      name: 'CROP_AGENT',
      role: 'Crop Management',
      icon: '🌱',
      status: stress > 45 ? 'warning' : 'nominal',
      currentAction: stress > 30 ? 'Reducing crop stress and protecting harvest yield.' : 'Optimizing harvest rotation for the next sol.',
    },
    {
      id: 'astro',
      name: 'ASTRO_AGENT',
      role: 'Astronaut Welfare',
      icon: '🧑‍🚀',
      status: stress > 50 ? 'warning' : 'nominal',
      currentAction: stress > 40 ? 'Monitoring crew workload and nutrition impact.' : 'Crew nutrition nominal. Meal plan updated.',
    },
    {
      id: 'resource',
      name: 'RESOURCE_AGENT',
      role: 'Resource Management',
      icon: '⚡',
      status: params.waterRecycling < 60 || params.powerAvailability < 50 ? 'warning' : 'nominal',
      currentAction:
        params.waterRecycling < 70
          ? `Water recycling at ${params.waterRecycling}%. Resource controls compensating.`
          : 'Power and water reserves sufficient.',
    },
  ];
}

export function useMissionState() {
  const [base, setBase] = useState<MarsBase>({ ...initialBase });
  const [astronauts, setAstronauts] = useState<AstronautRecord[]>(initialAstronauts);
  const [agents, setAgents] = useState<AgentStatusCard[]>(initialAgents);
  const [chatMessages, setChatMessages] = useState<ConversationMessage[]>([]);
  const [metrics, setMetrics] = useState<HumanMetrics>({ ...initialMetrics });
  const [simParams, setSimParams] = useState<SimulationParams>({ ...defaultSimParams });
  const [conversationId, setConversationId] = useState<string | undefined>();
  const [isSendingMessage, setIsSendingMessage] = useState(false);
  const [chatError, setChatError] = useState<string | null>(null);

  const dispatchMissionRequest = useCallback(
    async ({
      message,
      context,
      source,
      visibleMessage,
    }: {
      message: string;
      context: SimulationParams;
      source: 'user' | 'system';
      visibleMessage?: string;
    }) => {
      const timestamp = Math.floor(Date.now() / 1000);
      const pendingMessageId =
        source === 'user' || visibleMessage
          ? `${source}-${timestamp}`
          : null;

      setIsSendingMessage(true);
      setChatError(null);

      if (pendingMessageId) {
        setChatMessages((current) => [
          ...current,
          {
            id: pendingMessageId,
            source,
            message: visibleMessage ?? message.trim(),
            timestamp,
            type: 'info',
            pending: true,
          },
        ]);
      }

      try {
        const response = await submitChatMessage({
          message,
          conversationId,
          context,
        });

        setConversationId(response.conversationId);
        setAgents(response.agentStatuses.map(mapAgentStatus));
        setChatMessages((current) => [
          ...current.map((entry) =>
            entry.id === pendingMessageId
              ? {
                  ...entry,
                  pending: false,
                }
              : entry,
          ),
          ...response.messages.map((entry) => ({
            id: entry.id,
            source: 'agent' as const,
            agent: entry.agentId,
            agentName: entry.agentName,
            agentRole: entry.agentRole,
            message: entry.message,
            timestamp: entry.timestamp,
            type: entry.severity,
          })),
        ]);
      } catch (error) {
        const messageText = error instanceof Error ? error.message : 'Unable to reach mission control right now.';

        setChatError(messageText);
        setChatMessages((current) =>
          current.map((entry) =>
            entry.id === pendingMessageId
              ? {
                  ...entry,
                  pending: false,
                  failed: true,
                }
              : entry,
          ),
        );
      } finally {
        setIsSendingMessage(false);
      }
    },
    [conversationId],
  );

  const updateSimulation = useCallback(
    (params: SimulationParams) => {
      const stress = getStress(params);
      setSimParams(params);
      setBase(computeBaseFromParams(params));
      setAstronauts(computeAstronautsFromStress(stress));
      setAgents(computeAgents(params, stress));
      setMetrics(computeMetricsFromStress(stress));

      void dispatchMissionRequest({
        message: 'Review the latest simulation change, coordinate the specialists, and deliver a final mission resolution.',
        context: params,
        source: 'system',
        visibleMessage: 'Simulation update received. Requesting coordinated specialist review.',
      });
    },
    [dispatchMissionRequest],
  );

  const sendChat = useCallback(
    async (message: string) => {
      await dispatchMissionRequest({
        message,
        context: simParams,
        source: 'user',
      });
    },
    [dispatchMissionRequest, simParams],
  );

  const conversation = useMemo<ConversationMessage[]>(
    () => [...chatMessages].sort((left, right) => left.timestamp - right.timestamp),
    [chatMessages],
  );

  return {
    base,
    astronauts,
    agents,
    conversation,
    metrics,
    simParams,
    isSendingMessage,
    chatError,
    sendChat,
    updateSimulation,
  };
}

function mapAgentStatus(status: AgentStatusSnapshot): AgentStatusCard {
  return {
    id: status.id,
    name: status.name,
    role: status.role,
    icon: status.icon,
    status: status.status,
    currentAction: status.currentAction,
  };
}
