import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, PutCommand, GetCommand } from '@aws-sdk/lib-dynamodb';
import { randomUUID } from 'crypto';

const client = DynamoDBDocumentClient.from(new DynamoDBClient({}));

// ── State table for drift & sol tracking ─────────────────────────────────────

const STATE_TABLE = process.env.STATE_TABLE_NAME;

interface SimState {
  sol: number;
  tempDrift: number;
  humidityDrift: number;
  co2Drift: number;
  ppfdDrift: number;
  waterReserve: number;
  activeEvent: string | null;
  eventSolsRemaining: number;
}

const DEFAULT_STATE: SimState = {
  sol: 1,
  tempDrift: 0,
  humidityDrift: 0,
  co2Drift: 0,
  ppfdDrift: 0,
  waterReserve: 150,
  activeEvent: null,
  eventSolsRemaining: 0,
};

// ── Gaussian-like jitter ─────────────────────────────────────────────────────

function jitter(range: number): number {
  return (Math.random() + Math.random() + Math.random() - 1.5) * range;
}

function round(val: number, decimals = 2): number {
  return Math.round(val * 10 ** decimals) / 10 ** decimals;
}

function clamp(val: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, val));
}

// ── Martian failure scenarios ────────────────────────────────────────────────

interface MartianEvent {
  name: string;
  probability: number;  // per invocation (~every 5 min)
  durationSols: number;
  apply: (state: SimState) => void;
}

const MARTIAN_EVENTS: MartianEvent[] = [
  {
    name: 'dust_storm',
    probability: 0.005,  // ~0.5% per reading
    durationSols: 7,
    apply: (s) => {
      s.ppfdDrift -= 250;     // massive light reduction
      s.tempDrift -= 4;       // temperature drop from reduced solar
    },
  },
  {
    name: 'co2_scrubber_fault',
    probability: 0.003,
    durationSols: 2,
    apply: (s) => {
      s.co2Drift += 400;     // CO₂ builds up fast
    },
  },
  {
    name: 'water_pump_failure',
    probability: 0.002,
    durationSols: 1,
    apply: (s) => {
      s.waterReserve -= 20;  // water level drops without circulation
    },
  },
  {
    name: 'heater_malfunction',
    probability: 0.002,
    durationSols: 2,
    apply: (s) => {
      s.tempDrift -= 8;
    },
  },
];

// ── Natural drift model ──────────────────────────────────────────────────────

function applyNaturalDrift(state: SimState): void {
  // Each metric drifts slowly (random walk), simulating imperfect control systems
  state.tempDrift += jitter(0.3);
  state.humidityDrift += jitter(0.5);
  state.co2Drift += jitter(15);
  state.ppfdDrift += jitter(5);

  // Mean reversion — drifts tend back towards zero over time
  state.tempDrift *= 0.95;
  state.humidityDrift *= 0.95;
  state.co2Drift *= 0.95;
  state.ppfdDrift *= 0.95;

  // Water slowly consumed and partially recycled
  state.waterReserve -= 0.3 + jitter(0.1);
  state.waterReserve = Math.max(50, state.waterReserve);
}

// ── Handler ──────────────────────────────────────────────────────────────────

export const handler = async (): Promise<void> => {
  const tableName = process.env.SENSOR_READING_TABLE_NAME;
  if (!tableName) throw new Error('SENSOR_READING_TABLE_NAME env var not set');

  // Load or initialise state
  let state: SimState = { ...DEFAULT_STATE };
  if (STATE_TABLE) {
    try {
      const existing = await client.send(
        new GetCommand({ TableName: STATE_TABLE, Key: { id: 'sim-state' } })
      );
      if (existing.Item) {
        state = existing.Item as unknown as SimState;
      }
    } catch {
      // First run — use defaults
    }
  }

  // ── Advance sol counter (every ~288 invocations = 1 sol at 5-min intervals) ──
  // For demo: advance sol every 12 invocations (~1 hour = 1 sol)
  state.sol = Math.min(450, state.sol + (1 / 12));

  // ── Natural drift ──
  applyNaturalDrift(state);

  // ── Roll for Martian events ──
  if (!state.activeEvent) {
    for (const event of MARTIAN_EVENTS) {
      if (Math.random() < event.probability) {
        state.activeEvent = event.name;
        state.eventSolsRemaining = event.durationSols * 12; // in invocation counts
        console.log(`🚨 Martian event: ${event.name} (${event.durationSols} sols)`);
        break;
      }
    }
  }

  // ── Apply active event ──
  if (state.activeEvent) {
    const event = MARTIAN_EVENTS.find((e) => e.name === state.activeEvent);
    if (event) {
      event.apply(state);
    }
    state.eventSolsRemaining -= 1;
    if (state.eventSolsRemaining <= 0) {
      console.log(`✅ Event ended: ${state.activeEvent}`);
      state.activeEvent = null;
      state.eventSolsRemaining = 0;
    }
  }

  const now = new Date().toISOString();
  const currentSol = Math.floor(state.sol);

  const reading = {
    id: randomUUID(),
    greenhouseId: 'mars-greenhouse-1',
    timestamp: now,
    // Base targets + drift + jitter
    temperature:  round(clamp(22 + state.tempDrift + jitter(0.5), 5, 40)),
    humidity:     round(clamp(65 + state.humidityDrift + jitter(1.5), 10, 98)),
    co2Ppm:       Math.round(clamp(1200 + state.co2Drift + jitter(30), 300, 5000)),
    lightPpfd:    round(clamp(400 + state.ppfdDrift + jitter(10), 0, 900)),
    phLevel:      round(clamp(6.2 + jitter(0.15), 4.0, 9.0)),
    nutrientEc:   round(clamp(2.1 + jitter(0.15), 0.2, 5.0)),
    waterLitres:  round(clamp(state.waterReserve + jitter(2), 20, 250)),
    radiationMsv: round(0.07 + jitter(0.01), 3),
    // Extra metadata
    sol: currentSol,
    activeEvent: state.activeEvent || 'none',
    createdAt: now,
    updatedAt: now,
    __typename: 'SensorReading',
  };

  await client.send(
    new PutCommand({ TableName: tableName, Item: reading })
  );

  // ── Persist state ──
  if (STATE_TABLE) {
    try {
      await client.send(
        new PutCommand({
          TableName: STATE_TABLE,
          Item: { id: 'sim-state', ...state },
        })
      );
    } catch (err) {
      console.warn('Could not persist sim state:', err);
    }
  }

  console.log(
    `Sol ${currentSol} | Event: ${state.activeEvent || 'none'} | ` +
    `T:${reading.temperature}°C H:${reading.humidity}% CO₂:${reading.co2Ppm}ppm ` +
    `PPFD:${reading.lightPpfd} Water:${reading.waterLitres}L`
  );
};
