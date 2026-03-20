import { useCallback, useEffect, useState } from 'react';
import { sendChatQuery } from './chatApi';
import {
  GREENHOUSE_ID,
  createSensorReading,
  createUiInputEvent,
  fetchLatestSensorReading,
  waitForSensorFreshness,
  type SensorReading,
} from './telemetryApi';
import type {
  ActivityFeedItem,
  AgentInteraction,
  AgentStatusCard,
  AstronautRecord,
  ChatMessage,
  HumanMetrics,
  MarsBase,
  SimulationParams,
} from './types';

const NOMINAL_TEMPERATURE = 24;
const DEFAULT_TEMPERATURE_RANGE: [number, number] = [6, 32];

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
  environment: { temperature: 24, humidity: 68, co2: 1200, light: 100, water: 85 },
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
  temperature: NOMINAL_TEMPERATURE,
  waterRecycling: 100,
  powerAvailability: 100,
};

const AGENT_STEP_REVEAL_MS = import.meta.env.MODE === 'test' ? 0 : 260;

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

function createDelay(ms: number) {
  return new Promise((resolve) => {
    window.setTimeout(resolve, ms);
  });
}

function buildSimulationAgentPrompt(params: SimulationParams) {
  return [
    'Analyze this Mars greenhouse simulation update and explain the operational impact.',
    `Temperature: ${params.temperature}°C`,
    `Water recycling: ${params.waterRecycling}%`,
    `Power availability: ${params.powerAvailability}%`,
    'Use the current greenhouse telemetry plus your specialist agents to explain what is happening and what actions matter most right now.',
  ].join('\n');
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function parseDateToSol(timestamp: string) {
  const date = new Date(timestamp);
  if (Number.isNaN(date.getTime())) {
    return 0;
  }

  const start = Date.UTC(2035, 0, 1);
  const elapsedDays = Math.floor((date.getTime() - start) / (1000 * 60 * 60 * 24));
  return Math.max(0, elapsedDays);
}

function deriveParamsFromSensor(sensor: SensorReading): SimulationParams {
  const temperature = sensor.temperature ?? NOMINAL_TEMPERATURE;
  const recycle = sensor.recycleRatePercent ?? 100;
  const powerKw = sensor.powerKw ?? 9.2;

  return {
    temperature: Math.round(temperature * 10) / 10,
    waterRecycling: clamp(Math.round(recycle), 0, 100),
    powerAvailability: clamp(Math.round((powerKw / 9.2) * 100), 0, 100),
  };
}

function deriveTemperatureRange(sensor: SensorReading | null): [number, number] {
  if (!sensor?.targetProfile) {
    return DEFAULT_TEMPERATURE_RANGE;
  }

  let profile: Record<string, unknown> | null = null;
  if (typeof sensor.targetProfile === 'string') {
    try {
      profile = JSON.parse(sensor.targetProfile) as Record<string, unknown>;
    } catch {
      profile = null;
    }
  } else {
    profile = sensor.targetProfile;
  }

  const raw = profile?.temperatureC;
  if (!Array.isArray(raw) || raw.length < 2) {
    return DEFAULT_TEMPERATURE_RANGE;
  }

  const min = Number(raw[0]);
  const max = Number(raw[1]);
  if (!Number.isFinite(min) || !Number.isFinite(max) || min >= max) {
    return DEFAULT_TEMPERATURE_RANGE;
  }

  return [Math.floor(min), Math.ceil(max)];
}

function createSensorReadingInput(params: SimulationParams, timestamp: string): SensorReading {
  const effectiveTemp = params.temperature;
  const humidity = Math.max(20, 68 - Math.round(Math.max(0, (15 - effectiveTemp) * 0.5)) + Math.round((100 - params.waterRecycling) * 0.1));
  const stress = getStress(params);

  return {
    greenhouseId: GREENHOUSE_ID,
    timestamp,
    temperature: effectiveTemp,
    humidity,
    co2Ppm: 1200,
    lightPpfd: Math.round(params.powerAvailability * 9.2),
    phLevel: 6.2,
    nutrientEc: 1.8,
    waterLitres: Math.round((params.waterRecycling / 100) * 4200),
    radiationMsv: 0.7,
    pressureKpa: 101.3,
    oxygenPercent: 21.0,
    rootZoneOxygenPct: 19.4,
    recycleRatePercent: params.waterRecycling,
    powerKw: Math.round((params.powerAvailability / 100) * 9.2 * 100) / 100,
    cropStressIndex: Math.round(stress),
    foodSecurityDays: Math.max(20, Math.round(142 - stress * 1.2)),
    sol: parseDateToSol(timestamp),
    activeEvent:
      params.temperature <= 18
        ? 'HEATER_MALFUNCTION'
        : params.waterRecycling < 50
          ? 'WATER_PUMP_FAILURE'
          : params.powerAvailability < 45
            ? 'DUST_STORM'
            : 'NONE',
    controlMode: 'MANUAL',
    targetProfile: {
      temperatureC: [15, 22],
      humidityPct: [50, 70],
      co2Ppm: [800, 1200],
    },
    notes: 'UI simulation input persisted before agent analysis.',
  };
}

function computeHardware(params: SimulationParams) {
  const effectiveTemp = params.temperature;
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
  const effectiveTemp = params.temperature;
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
  const effectiveTemp = params.temperature;
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
      light: params.powerAvailability,
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
  const effectiveTemp = params.temperature;
  const entries: ActivityFeedItem[] = [];

  if (params.temperature < 22) {
    entries.push({
      agent: 'environment',
      message: `Temperature drop detected at ${effectiveTemp}°C. Adjusting greenhouse climate controls and protecting the crop envelope.`,
      timestamp: now,
      type: params.temperature < 18 ? 'critical' : 'warning',
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
  const effectiveTemp = params.temperature;
  return [
    {
      id: 'environment',
      name: 'ENV_AGENT',
      role: 'Environment Control',
      icon: 'ENV',
      status: params.temperature < 18 || params.powerAvailability < 40 ? 'warning' : 'nominal',
      currentAction: params.temperature < 22 ? `Stabilizing greenhouse temperature at ${effectiveTemp}°C.` : 'CO₂ and climate conditions stable.',
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
  const [agentInteractions, setAgentInteractions] = useState<AgentInteraction[]>([]);
  const [isChatLoading, setIsChatLoading] = useState(false);
  const [metrics, setMetrics] = useState<HumanMetrics>({ ...initialMetrics });
  const [simParams, setSimParams] = useState<SimulationParams>({ ...defaultSimParams });
  const [temperatureRange, setTemperatureRange] = useState<[number, number]>(DEFAULT_TEMPERATURE_RANGE);
  const [latestOperatorTelemetry, setLatestOperatorTelemetry] = useState<{
    timestamp: string;
    temperature: number;
    waterRecycling: number;
    powerAvailability: number;
  } | null>(null);

  const updateSimulation = useCallback((params: SimulationParams) => {
    const stress = getStress(params);
    setSimParams(params);
    setBase(computeBaseFromParams(params));
    setAstronauts(computeAstronautsFromStress(stress));
    setAgents(computeAgents(params, stress));
    setMetrics(computeMetricsFromStress(stress));
    setLogs(createLogs(params, stress));
  }, []);

  useEffect(() => {
    let cancelled = false;

    const bootstrapFromBackend = async () => {
      try {
        const latest = await fetchLatestSensorReading(GREENHOUSE_ID);
        if (!latest || cancelled) {
          return;
        }

        updateSimulation(deriveParamsFromSensor(latest));
        setLatestOperatorTelemetry({
          timestamp: latest.timestamp,
          temperature: deriveParamsFromSensor(latest).temperature,
          waterRecycling: deriveParamsFromSensor(latest).waterRecycling,
          powerAvailability: deriveParamsFromSensor(latest).powerAvailability,
        });
        setTemperatureRange(deriveTemperatureRange(latest));
      } catch {
        // Keep local defaults if backend is temporarily unreachable.
      }
    };

    void bootstrapFromBackend();

    return () => {
      cancelled = true;
    };
  }, [updateSimulation]);

  const requestAgentResponse = useCallback(async (
    query: string,
    freshAfterTimestamp?: string,
    operatorTelemetryOverride?: {
      timestamp: string;
      temperature: number;
      waterRecycling: number;
      powerAvailability: number;
    }
  ) => {
    const payload = await sendChatQuery(query, {
      greenhouseId: GREENHOUSE_ID,
      freshAfterTimestamp,
      operatorTelemetry: operatorTelemetryOverride ?? latestOperatorTelemetry ?? undefined,
    });
    const nextInteractions: AgentInteraction[] = payload.steps.map((step, index) => ({
      id: createChatMessageId(`interaction-${step.agent}`),
      agent: step.agent as AgentInteraction['agent'],
      message: step.message,
      status: index === 0 ? 'active' : 'queued',
      timestamp: Date.now() + index,
    }));

    if (nextInteractions.length > 0) {
      setAgentInteractions(nextInteractions);

      for (let index = 0; index < nextInteractions.length; index += 1) {
        const interaction = nextInteractions[index];
        setAgentInteractions((current) =>
          current.map((item, itemIndex) => {
            if (item.id === interaction.id) {
              return { ...item, status: 'active' };
            }
            if (itemIndex < index) {
              return { ...item, status: 'complete' };
            }
            return item;
          })
        );
        setChatMessages((currentMessages) => [
          ...currentMessages,
          {
            id: createChatMessageId(interaction.agent),
            role: 'system',
            author: interaction.agent === 'orchestrator' ? 'orchestrator' : 'system',
            agent: interaction.agent,
            message: interaction.message,
          },
        ]);
        await createDelay(AGENT_STEP_REVEAL_MS);
      }

      setAgentInteractions((current) => current.map((item) => ({ ...item, status: 'complete' })));
    } else {
      setAgentInteractions([]);
    }

    setChatMessages((currentMessages) => [
      ...currentMessages,
      {
        id: createChatMessageId('agent'),
        role: 'agent',
        author: 'agent system',
        agent: 'orchestrator',
        message: payload.response,
      },
    ]);
  }, [latestOperatorTelemetry]);

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
    setAgentInteractions([
      {
        id: createChatMessageId('orchestrator-live'),
        agent: 'orchestrator',
        message: 'Parsing operator request and selecting the right specialists.',
        status: 'active',
        timestamp: Date.now(),
      },
    ]);
    setIsChatLoading(true);

    try {
      const timestamp = new Date().toISOString();
      await createUiInputEvent({
        timestamp,
        greenhouseId: GREENHOUSE_ID,
        message: `Operator chat input: ${cleanedQuery}`,
        evidence: { kind: 'chat-input' },
      });
      await requestAgentResponse(cleanedQuery, timestamp);
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
      setAgentInteractions([]);
    } finally {
      setIsChatLoading(false);
    }
  }, [isChatLoading, requestAgentResponse]);

  const runSimulation = useCallback(async (params: SimulationParams) => {
    setChatMessages((currentMessages) => [
      ...currentMessages,
      {
        id: createChatMessageId('simulation'),
        role: 'system',
        author: 'simulation',
        agent: 'system',
        message: `Simulation started: temperature ${params.temperature}°C, water recycling ${params.waterRecycling}%, power availability ${params.powerAvailability}%.`,
      },
    ]);
    setAgentInteractions([
      {
        id: createChatMessageId('orchestrator-live'),
        agent: 'orchestrator',
        message: 'Simulation received. Waiting for fresh telemetry and coordinating specialist review.',
        status: 'active',
        timestamp: Date.now(),
      },
    ]);
    setIsChatLoading(true);

    try {
      const timestamp = new Date().toISOString();
      const inputRow = createSensorReadingInput(params, timestamp);

      const createdReading = await createSensorReading(inputRow);
      await createUiInputEvent({
        timestamp,
        greenhouseId: GREENHOUSE_ID,
        message: 'Operator applied simulation controls from UI.',
        evidence: {
          kind: 'simulation-input',
          params,
        },
      });

      const confirmedLatest = await waitForSensorFreshness({
        greenhouseId: GREENHOUSE_ID,
        freshAfterTimestamp: timestamp,
        createdReadingId: createdReading?.id,
      });

      const syncedParams = deriveParamsFromSensor(confirmedLatest);
      updateSimulation(syncedParams);
      setLatestOperatorTelemetry({
        timestamp: confirmedLatest.timestamp,
        temperature: syncedParams.temperature,
        waterRecycling: syncedParams.waterRecycling,
        powerAvailability: syncedParams.powerAvailability,
      });
      setTemperatureRange(deriveTemperatureRange(confirmedLatest));
      await requestAgentResponse(buildSimulationAgentPrompt(syncedParams), timestamp, {
        timestamp: confirmedLatest.timestamp,
        temperature: syncedParams.temperature,
        waterRecycling: syncedParams.waterRecycling,
        powerAvailability: syncedParams.powerAvailability,
      });
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
      setAgentInteractions([]);
    } finally {
      setIsChatLoading(false);
    }
  }, [requestAgentResponse, updateSimulation]);

  return {
    base,
    astronauts,
    agentInteractions,
    agents,
    chatMessages,
    isChatLoading,
    logs,
    metrics,
    runSimulation,
    simParams,
    temperatureRange,
    sendChatMessage,
    updateSimulation,
  };
}
