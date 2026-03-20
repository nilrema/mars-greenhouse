interface DataApiConfig {
  url?: string;
  api_key?: string;
}

export function resolveDataApiConfig(modules: Record<string, unknown>): DataApiConfig {
  const amplifyOutputs = Object.values(modules)[0] as { data?: DataApiConfig } | undefined;
  return amplifyOutputs?.data ?? {};
}

const amplifyOutputsModules = import.meta.glob('../../../amplify_outputs.json', {
  eager: true,
  import: 'default',
});
const dataConfig = resolveDataApiConfig(amplifyOutputsModules);
const graphQlEndpoint = dataConfig.url;
const apiKey = dataConfig.api_key;

const GREENHOUSE_ID = 'mars-greenhouse-1';

const LATEST_SENSOR_QUERY = `
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
      targetProfile
      notes
      createdAt
      updatedAt
    }
  }
}
`;

const LEGACY_LATEST_SENSOR_QUERY = `
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
      targetProfile
      notes
      createdAt
      updatedAt
    }
  }
}
`;

const CREATE_SENSOR_MUTATION = `
mutation CreateSensorReading($input: CreateSensorReadingInput!) {
  createSensorReading(input: $input) {
    id
    greenhouseId
    timestamp
  }
}
`;

const GET_SENSOR_BY_ID_QUERY = `
query GetSensorReading($id: ID!) {
  getSensorReading(id: $id) {
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
    targetProfile
    notes
    createdAt
    updatedAt
  }
}
`;

const CREATE_AGENT_EVENT_MUTATION = `
mutation CreateAgentEvent($input: CreateAgentEventInput!) {
  createAgentEvent(input: $input) {
    id
    agentId
    timestamp
    message
  }
}
`;

export interface SensorReading {
  id?: string;
  greenhouseId: string;
  timestamp: string;
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
  activeEvent?: 'NONE' | 'DUST_STORM' | 'CO2_SCRUBBER_FAULT' | 'WATER_PUMP_FAILURE' | 'HEATER_MALFUNCTION';
  controlMode?: 'AUTO' | 'MANUAL' | 'SAFE_MODE';
  targetProfile?: Record<string, unknown> | string;
  notes?: string;
}

interface GraphQlResponse<TData> {
  data?: TData;
  errors?: Array<{ message?: string }>;
}

function assertDataApiConfig() {
  if (!graphQlEndpoint || !apiKey) {
    throw new Error('Amplify data URL or API key missing in amplify_outputs.json.');
  }
}

async function executeGraphQl<TData>(query: string, variables: Record<string, unknown>): Promise<TData> {
  assertDataApiConfig();

  const response = await fetch(graphQlEndpoint as string, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey as string,
    },
    body: JSON.stringify({ query, variables }),
  });

  const payload = (await response.json()) as GraphQlResponse<TData>;
  if (!response.ok || payload.errors?.length) {
    throw new Error(payload.errors?.[0]?.message || 'GraphQL request failed.');
  }

  if (!payload.data) {
    throw new Error('GraphQL response did not include data.');
  }

  return payload.data;
}

function parseDate(value?: string) {
  if (!value) {
    return Number.NEGATIVE_INFINITY;
  }

  const parsed = Date.parse(value);
  return Number.isNaN(parsed) ? Number.NEGATIVE_INFINITY : parsed;
}

function sortByTimestampDesc(readings: SensorReading[]) {
  return [...readings].sort((a, b) => parseDate(b.timestamp) - parseDate(a.timestamp));
}

function asAwsJson(value: unknown) {
  if (value === undefined || value === null) {
    return undefined;
  }

  return JSON.stringify(value);
}

export async function fetchLatestSensorReading(greenhouseId: string = GREENHOUSE_ID): Promise<SensorReading | null> {
  try {
    const data = await executeGraphQl<{
      listSensorReadingsByGreenhouseAndTimestamp?: { items?: Array<SensorReading | null> };
    }>(LATEST_SENSOR_QUERY, {
      greenhouseId,
      sortDirection: 'DESC',
      limit: 1,
    });

    const items = (data.listSensorReadingsByGreenhouseAndTimestamp?.items ?? []).filter(
      (item): item is SensorReading => Boolean(item)
    );
    return items[0] ?? null;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (!message.includes("Field 'listSensorReadingsByGreenhouseAndTimestamp'")) {
      throw error;
    }

    const data = await executeGraphQl<{
      listSensorReadings?: { items?: Array<SensorReading | null> };
    }>(LEGACY_LATEST_SENSOR_QUERY, {
      filter: { greenhouseId: { eq: greenhouseId } },
      limit: 50,
    });

    const items = (data.listSensorReadings?.items ?? []).filter((item): item is SensorReading => Boolean(item));
    const sorted = sortByTimestampDesc(items);
    return sorted[0] ?? null;
  }
}

export async function createSensorReading(reading: SensorReading) {
  const input = {
    greenhouseId: reading.greenhouseId,
    timestamp: reading.timestamp,
    temperature: reading.temperature,
    humidity: reading.humidity,
    co2Ppm: reading.co2Ppm,
    lightPpfd: reading.lightPpfd,
    phLevel: reading.phLevel,
    nutrientEc: reading.nutrientEc,
    waterLitres: reading.waterLitres,
    radiationMsv: reading.radiationMsv,
    pressureKpa: reading.pressureKpa,
    oxygenPercent: reading.oxygenPercent,
    rootZoneOxygenPct: reading.rootZoneOxygenPct,
    recycleRatePercent: reading.recycleRatePercent,
    powerKw: reading.powerKw,
    cropStressIndex: reading.cropStressIndex,
    foodSecurityDays: reading.foodSecurityDays,
    sol: reading.sol,
    activeEvent: reading.activeEvent,
    controlMode: reading.controlMode,
    targetProfile: asAwsJson(reading.targetProfile),
    notes: reading.notes,
  };

  const data = await executeGraphQl<{
    createSensorReading?: SensorReading | null;
  }>(CREATE_SENSOR_MUTATION, { input });

  return data.createSensorReading ?? null;
}

async function fetchSensorReadingById(id: string): Promise<SensorReading | null> {
  const data = await executeGraphQl<{
    getSensorReading?: SensorReading | null;
  }>(GET_SENSOR_BY_ID_QUERY, { id });
  return data.getSensorReading ?? null;
}

export async function createUiInputEvent(input: {
  timestamp: string;
  message: string;
  severity?: 'INFO' | 'WARN' | 'CRITICAL';
  greenhouseId?: string;
  evidence?: Record<string, unknown>;
}) {
  return executeGraphQl(CREATE_AGENT_EVENT_MUTATION, {
    input: {
      agentId: 'ui',
      timestamp: input.timestamp,
      severity: input.severity ?? 'INFO',
      message: input.message,
      greenhouseId: input.greenhouseId ?? GREENHOUSE_ID,
      evidence: asAwsJson(input.evidence),
    },
  });
}

export async function waitForSensorFreshness(options: {
  greenhouseId?: string;
  freshAfterTimestamp: string;
  createdReadingId?: string;
  retries?: number;
  intervalMs?: number;
}) {
  const retries = options.retries ?? 24;
  const intervalMs = options.intervalMs ?? 500;
  const expectedRaw = parseDate(options.freshAfterTimestamp);
  // AppSync/DynamoDB date serialization may truncate sub-second precision.
  const expected = Number.isFinite(expectedRaw) ? expectedRaw - 1500 : expectedRaw;

  for (let attempt = 0; attempt < retries; attempt += 1) {
    if (options.createdReadingId) {
      const byId = await fetchSensorReadingById(options.createdReadingId);
      if (byId && parseDate(byId.timestamp) >= expected) {
        return byId;
      }
    }

    const latest = await fetchLatestSensorReading(options.greenhouseId ?? GREENHOUSE_ID);
    if (latest && parseDate(latest.timestamp) >= expected) {
      return latest;
    }

    await new Promise((resolve) => setTimeout(resolve, intervalMs));
  }

  throw new Error('Timed out while waiting for latest sensor reading to become available.');
}

export { GREENHOUSE_ID };
