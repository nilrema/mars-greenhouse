import { useCallback, useState } from 'react';
import { sendChatQuery } from './chatApi';
import type {
  ActivityFeedItem,
  AgentStatusCard,
  AstronautRecord,
  ChatMessage,
  HumanMetrics,
  MarsBase,
  SimulationParams,
} from './types';

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
    avatar: 'CV',
    role: 'Mission Commander',
    calories: { current: 1820, target: 2200 },
    protein: { current: 72, target: 90 },
    micronutrientScore: 88,
    hydration: 'optimal',
    health: 'nominal',
  },
  {
    name: 'Dr. Okafor',
    avatar: 'DO',
    role: 'Botanist',
    calories: { current: 1950, target: 2100 },
    protein: { current: 85, target: 85 },
    micronutrientScore: 92,
    hydration: 'optimal',
    health: 'nominal',
  },
  {
    name: 'Lt. Park',
    avatar: 'LP',
    role: 'Systems Engineer',
    calories: { current: 1600, target: 2300 },
    protein: { current: 58, target: 95 },
    micronutrientScore: 64,
    hydration: 'low',
    health: 'warning',
  },
  {
    name: 'Sgt. Ivanova',
    avatar: 'SI',
    role: 'Mechanical Specialist',
    calories: { current: 2100, target: 2400 },
    protein: { current: 91, target: 100 },
    micronutrientScore: 79,
    hydration: 'adequate',
    health: 'nominal',
  },
];

const initialAgents: AgentStatusCard[] = [
  { id: 'environment', name: 'ENV_AGENT', role: 'Environment Control', icon: 'ENV', status: 'nominal', currentAction: 'Climate stable. Temperature 24°C, humidity 68%.' },
  { id: 'crop', name: 'CROP_AGENT', role: 'Crop Management', icon: 'CRP', status: 'nominal', currentAction: 'Harvest windows remain on schedule.' },
  { id: 'astro', name: 'ASTRO_AGENT', role: 'Astronaut Welfare', icon: 'CREW', status: 'nominal', currentAction: 'Crew nutrition and workload nominal.' },
  { id: 'resource', name: 'RESOURCE_AGENT', role: 'Resource Management', icon: 'RSC', status: 'nominal', currentAction: 'Water and power reserves sufficient.' },
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

const initialChatMessages: ChatMessage[] = [
  {
    id: 'system-welcome',
    role: 'system',
    author: 'system',
    agent: 'system',
    message: 'Mars greenhouse agents online. Ask about climate, crops, crew impact, or resource constraints.',
  },
];

function createChatMessageId(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function buildSimulationAgentPrompt(params: SimulationParams) {
  return [
    'Analyze this Mars greenhouse simulation update and explain the operational impact.',
    `Temperature drift: ${params.temperatureDrift}°C`,
    `Water recycling: ${params.waterRecycling}%`,
    `Power availability: ${params.powerAvailability}%`,
    'Use the current greenhouse telemetry plus your specialist agents to explain what is happening and what actions matter most right now.',
  ].join('\n');
}

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

function createLogs(params: SimulationParams, stress: number): ActivityFeedItem[] {
  const now = Date.now();
  const effectiveTemp = BASELINE_TEMP + params.temperatureDrift;
  const entries: ActivityFeedItem[] = [];

  if (params.temperatureDrift < -2) {
    entries.push({
      agent: 'environment',
      message: `Temperature drift detected at ${effectiveTemp}°C. Adjusting greenhouse climate controls and protecting the crop envelope.`,
      timestamp: now,
      type: params.temperatureDrift < -5 ? 'critical' : 'warning',
    });
  }

  if (params.waterRecycling < 70) {
    entries.push({
      agent: 'resource',
      message: `Water recycling dropped to ${params.waterRecycling}%. Rebalancing irrigation flow and prioritizing critical bays.`,
      timestamp: now + 1,
      type: params.waterRecycling < 40 ? 'critical' : 'warning',
    });
  }

  if (params.powerAvailability < 80) {
    entries.push({
      agent: 'crop',
      message: `Power availability is ${params.powerAvailability}%. Monitoring yield impact and delaying low-priority harvest activity.`,
      timestamp: now + 2,
      type: params.powerAvailability < 50 ? 'warning' : 'info',
    });
  }

  entries.push({
    agent: 'astro',
    message:
      stress > 45
        ? 'Crew workload elevated. Recommending manual inspection and tighter meal planning until greenhouse conditions recover.'
        : 'Crew outlook remains stable. No intervention required beyond routine monitoring.',
    timestamp: now + 3,
    type: stress > 45 ? 'warning' : 'success',
  });

  if (stress > 20) {
    entries.push({
      agent: 'orchestrator',
      message: 'Specialists aligned. Immediate focus is greenhouse stabilization, then crew-impact review.',
      timestamp: now + 4,
      type: stress > 50 ? 'critical' : 'info',
    });
  }

  return entries;
}

function computeAgents(params: SimulationParams, stress: number): AgentStatusCard[] {
  const effectiveTemp = BASELINE_TEMP + params.temperatureDrift;
  return [
    {
      id: 'environment',
      name: 'ENV_AGENT',
      role: 'Environment Control',
      icon: 'ENV',
      status: params.temperatureDrift < -5 || params.powerAvailability < 40 ? 'warning' : 'nominal',
      currentAction: params.temperatureDrift < -2 ? `Counteracting temperature drift at ${effectiveTemp}°C.` : 'CO₂ and climate conditions stable.',
    },
    {
      id: 'crop',
      name: 'CROP_AGENT',
      role: 'Crop Management',
      icon: 'CRP',
      status: stress > 45 ? 'warning' : 'nominal',
      currentAction: stress > 30 ? 'Reducing crop stress and protecting harvest yield.' : 'Optimizing harvest rotation for the next sol.',
    },
    {
      id: 'astro',
      name: 'ASTRO_AGENT',
      role: 'Astronaut Welfare',
      icon: 'CREW',
      status: stress > 50 ? 'warning' : 'nominal',
      currentAction: stress > 40 ? 'Monitoring crew workload and nutrition impact.' : 'Crew nutrition nominal. Meal plan updated.',
    },
    {
      id: 'resource',
      name: 'RESOURCE_AGENT',
      role: 'Resource Management',
      icon: 'RSC',
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
  const [logs, setLogs] = useState<ActivityFeedItem[]>([]);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>(initialChatMessages);
  const [isChatLoading, setIsChatLoading] = useState(false);
  const [metrics, setMetrics] = useState<HumanMetrics>({ ...initialMetrics });
  const [simParams, setSimParams] = useState<SimulationParams>({ ...defaultSimParams });

  const updateSimulation = useCallback((params: SimulationParams) => {
    const stress = getStress(params);
    setSimParams(params);
    setBase(computeBaseFromParams(params));
    setAstronauts(computeAstronautsFromStress(stress));
    setAgents(computeAgents(params, stress));
    setMetrics(computeMetricsFromStress(stress));
    setLogs(createLogs(params, stress));
  }, []);

  const requestAgentResponse = useCallback(async (query: string) => {
    const payload = await sendChatQuery(query);
    setChatMessages((currentMessages) => [
      ...currentMessages,
      ...payload.steps.map((step) => ({
        id: createChatMessageId(step.agent),
        role: 'system' as const,
        author: step.agent === 'orchestrator' ? 'orchestrator' : 'system',
        agent: step.agent === 'orchestrator' ? 'orchestrator' : (step.agent as 'environment' | 'crop' | 'astro' | 'resource'),
        message: step.message,
      })),
      {
        id: createChatMessageId('agent'),
        role: 'agent' as const,
        author: 'agent system',
        agent: 'orchestrator',
        message: payload.response,
      },
    ]);
  }, []);

  const sendChatMessage = useCallback(async (query: string) => {
    const cleanedQuery = query.trim();
    if (!cleanedQuery || isChatLoading) {
      return;
    }

    setChatMessages((currentMessages) => [
      ...currentMessages,
      {
        id: createChatMessageId('user'),
        role: 'user',
        author: 'operator',
        agent: 'user',
        message: cleanedQuery,
      },
    ]);
    setIsChatLoading(true);

    try {
      await requestAgentResponse(cleanedQuery);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'The backend chat bridge is unavailable.';
      setChatMessages((currentMessages) => [
        ...currentMessages,
        {
          id: createChatMessageId('error'),
          role: 'system',
          author: 'system',
          agent: 'system',
          message,
        },
      ]);
    } finally {
      setIsChatLoading(false);
    }
  }, [isChatLoading, requestAgentResponse]);

  const runSimulation = useCallback(async (params: SimulationParams) => {
    updateSimulation(params);
    setChatMessages((currentMessages) => [
      ...currentMessages,
      {
        id: createChatMessageId('simulation'),
        role: 'system',
        author: 'simulation',
        agent: 'system',
        message: `Simulation started: temperature drift ${params.temperatureDrift}°C, water recycling ${params.waterRecycling}%, power availability ${params.powerAvailability}%.`,
      },
    ]);
    setIsChatLoading(true);

    try {
      await requestAgentResponse(buildSimulationAgentPrompt(params));
    } catch (error) {
      const message = error instanceof Error ? error.message : 'The backend chat bridge is unavailable.';
      setChatMessages((currentMessages) => [
        ...currentMessages,
        {
          id: createChatMessageId('simulation-error'),
          role: 'system',
          author: 'system',
          agent: 'system',
          message,
        },
      ]);
    } finally {
      setIsChatLoading(false);
    }
  }, [requestAgentResponse, updateSimulation]);

  return {
    base,
    astronauts,
    agents,
    chatMessages,
    isChatLoading,
    logs,
    metrics,
    runSimulation,
    simParams,
    sendChatMessage,
    updateSimulation,
  };
}
