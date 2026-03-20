import amplifyOutputs from '../../../amplify_outputs.json';

const dataConfig = (amplifyOutputs as { data?: { url?: string; api_key?: string } }).data ?? {};

const graphQlEndpoint = dataConfig.url;
const apiKey = dataConfig.api_key;

const SENSOR_QUERY = `
query ListSensorReadingsByGreenhouseAndTimestamp(
  $greenhouseId: String!
  $sortDirection: ModelSortDirection
  $limit: Int
) {
  listSensorReadingsByGreenhouseAndTimestamp(
    greenhouseId: $greenhouseId
    sortDirection: $sortDirection
    limit: $limit
  ) {
    items {
      id
      greenhouseId
      timestamp
      temperature
      humidity
      co2Ppm
      lightPpfd
      phLevel
      nutrientEc
      waterLitres
      radiationMsv
      pressureKpa
      oxygenPercent
      rootZoneOxygenPct
      recycleRatePercent
      powerKw
      cropStressIndex
      foodSecurityDays
      sol
      activeEvent
      controlMode
      targetProfile
      notes
      createdAt
      updatedAt
    }
  }
}
`;

const LEGACY_SENSOR_QUERY = `
query ListSensorReadings($filter: ModelSensorReadingFilterInput, $limit: Int) {
  listSensorReadings(filter: $filter, limit: $limit) {
    items {
      id
      greenhouseId
      timestamp
      temperature
      humidity
      co2Ppm
      lightPpfd
      phLevel
      nutrientEc
      waterLitres
      radiationMsv
      pressureKpa
      oxygenPercent
      rootZoneOxygenPct
      recycleRatePercent
      powerKw
      cropStressIndex
      foodSecurityDays
      sol
      activeEvent
      controlMode
      targetProfile
      notes
      createdAt
      updatedAt
    }
  }
}
`;

const CROP_QUERY = `
query ListCropRecords($limit: Int) {
  listCropRecords(limit: $limit) {
    items {
      id
      cropId
      name
      variety
      plantedAt
      growthStage
      daysToHarvest
      healthStatus
      zone
      cropType
      missionRole
      growthCycleDays
      harvestIndex
      caloriesPer100g
      proteinPer100g
      expectedYieldKgM2
      waterDemandLevel
      stressSensitivity
      targetTempMinC
      targetTempMaxC
      targetHumidityMinPct
      targetHumidityMaxPct
      targetCo2MinPpm
      targetCo2MaxPpm
      targetPpfdMin
      targetPpfdMax
      targetPhMin
      targetPhMax
      targetEcMin
      targetEcMax
      createdAt
      updatedAt
    }
  }
}
`;

const ASTRONAUT_QUERY = `
query ListAstronautProfiles($limit: Int) {
  listAstronautProfiles(limit: $limit) {
    items {
      id
      astronautId
      name
      role
      dailyCalorieTarget
      dailyProteinTargetG
      dailyHydrationTargetL
      dailyKcalIntake
      dailyProteinIntakeG
      dailyHydrationIntakeL
      micronutrientRisk
      fatigueScore
      workloadIndex
      healthStatus
      notes
      lastAssessmentAt
      createdAt
      updatedAt
    }
  }
}
`;

const AGENT_EVENT_QUERY = `
query ListAgentEvents($limit: Int) {
  listAgentEvents(limit: $limit) {
    items {
      id
      agentId
      timestamp
      severity
      message
      actionTaken
      greenhouseId
      confidence
      createdAt
      updatedAt
    }
  }
}
`;

const ACTUATOR_QUERY = `
query ListActuatorCommands($limit: Int) {
  listActuatorCommands(limit: $limit) {
    items {
      id
      commandId
      type
      targetValue
      zone
      unit
      durationSeconds
      status
      executedAt
      result
      requestedBy
      rationale
      confidence
      safetyCheckPassed
      createdAt
      updatedAt
    }
  }
}
`;

interface GraphQlEnvelope<T> {
  data?: T;
  errors?: Array<{ message?: string }>;
}

export interface SensorReadingRecord {
  id: string;
  greenhouseId: string;
  timestamp?: string;
  temperature?: number;
  humidity?: number;
  co2Ppm?: number;
  lightPpfd?: number;
  phLevel?: number;
  nutrientEc?: number;
  waterLitres?: number;
  radiationMsv?: number;
  pressureKpa?: number;
  oxygenPercent?: number;
  rootZoneOxygenPct?: number;
  recycleRatePercent?: number;
  powerKw?: number;
  cropStressIndex?: number;
  foodSecurityDays?: number;
  sol?: number;
  activeEvent?: string;
  controlMode?: string;
  targetProfile?: Record<string, unknown>;
  notes?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface CropRecord {
  id: string;
  cropId?: string;
  name?: string;
  variety?: string;
  plantedAt?: string;
  growthStage?: number;
  daysToHarvest?: number;
  healthStatus?: string;
  zone?: string;
  cropType?: string;
  missionRole?: string;
  growthCycleDays?: number;
  harvestIndex?: number;
  caloriesPer100g?: number;
  proteinPer100g?: number;
  expectedYieldKgM2?: number;
  waterDemandLevel?: string;
  stressSensitivity?: unknown;
}

export interface AstronautProfileRecord {
  id: string;
  astronautId?: string;
  name?: string;
  role?: string;
  dailyCalorieTarget?: number;
  dailyProteinTargetG?: number;
  dailyHydrationTargetL?: number;
  dailyKcalIntake?: number;
  dailyProteinIntakeG?: number;
  dailyHydrationIntakeL?: number;
  micronutrientRisk?: string;
  fatigueScore?: number;
  workloadIndex?: number;
  healthStatus?: string;
  notes?: string;
}

export interface AgentEventRecord {
  id: string;
  agentId?: string;
  timestamp?: string;
  severity?: string;
  message?: string;
  actionTaken?: string;
  greenhouseId?: string;
  confidence?: number;
  createdAt?: string;
}

export interface ActuatorCommandRecord {
  id: string;
  commandId?: string;
  type?: string;
  targetValue?: number;
  zone?: string;
  unit?: string;
  durationSeconds?: number;
  status?: string;
  executedAt?: string;
  result?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface BackendMissionSnapshot {
  sensorReadings: SensorReadingRecord[];
  cropRecords: CropRecord[];
  astronautProfiles: AstronautProfileRecord[];
  agentEvents: AgentEventRecord[];
  actuatorCommands: ActuatorCommandRecord[];
}

function normalizeItems<T>(items: Array<T | null | undefined> | null | undefined): T[] {
  return (items ?? []).filter((item): item is T => Boolean(item));
}

async function executeGraphQl<TData>(
  query: string,
  variables: Record<string, unknown> = {}
): Promise<TData> {
  if (!graphQlEndpoint || !apiKey) {
    throw new Error('Amplify GraphQL endpoint is not configured.');
  }

  const response = await fetch(graphQlEndpoint, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-api-key': apiKey,
    },
    body: JSON.stringify({ query, variables }),
  });

  if (!response.ok) {
    throw new Error(`GraphQL request failed with status ${response.status}.`);
  }

  const payload = (await response.json()) as GraphQlEnvelope<TData>;
  if (payload.errors?.length) {
    const message = payload.errors.map((error) => error.message).filter(Boolean).join('; ');
    throw new Error(message || 'GraphQL returned errors.');
  }

  if (!payload.data) {
    throw new Error('GraphQL response contained no data.');
  }

  return payload.data;
}

export function isBackendConfigured(): boolean {
  return Boolean(graphQlEndpoint && apiKey);
}

export async function fetchMissionBackendSnapshot(
  greenhouseId = 'mars-greenhouse-1'
): Promise<BackendMissionSnapshot> {
  const sensorPromise = executeGraphQl<{
    listSensorReadingsByGreenhouseAndTimestamp?: { items?: Array<SensorReadingRecord | null> | null };
  }>(SENSOR_QUERY, {
    greenhouseId,
    sortDirection: 'DESC',
    limit: 120,
  }).catch(async (error) => {
    const message = error instanceof Error ? error.message : String(error);
    if (!message.includes("Field 'listSensorReadingsByGreenhouseAndTimestamp'")) {
      throw error;
    }

    return executeGraphQl<{ listSensorReadings?: { items?: Array<SensorReadingRecord | null> | null } }>(
      LEGACY_SENSOR_QUERY,
      { filter: { greenhouseId: { eq: greenhouseId } }, limit: 120 }
    );
  });

  const [sensorData, cropData, astronautData, eventData, actuatorData] = await Promise.all([
    sensorPromise,
    executeGraphQl<{ listCropRecords?: { items?: Array<CropRecord | null> | null } }>(CROP_QUERY, { limit: 100 }),
    executeGraphQl<{ listAstronautProfiles?: { items?: Array<AstronautProfileRecord | null> | null } }>(
      ASTRONAUT_QUERY,
      { limit: 30 }
    ),
    executeGraphQl<{ listAgentEvents?: { items?: Array<AgentEventRecord | null> | null } }>(AGENT_EVENT_QUERY, {
      limit: 80,
    }),
    executeGraphQl<{ listActuatorCommands?: { items?: Array<ActuatorCommandRecord | null> | null } }>(
      ACTUATOR_QUERY,
      { limit: 80 }
    ),
  ]);

  return {
    sensorReadings: normalizeItems(
      'listSensorReadingsByGreenhouseAndTimestamp' in sensorData
        ? sensorData.listSensorReadingsByGreenhouseAndTimestamp?.items
        : sensorData.listSensorReadings?.items
    ),
    cropRecords: normalizeItems(cropData.listCropRecords?.items),
    astronautProfiles: normalizeItems(astronautData.listAstronautProfiles?.items),
    agentEvents: normalizeItems(eventData.listAgentEvents?.items),
    actuatorCommands: normalizeItems(actuatorData.listActuatorCommands?.items),
  };
}
