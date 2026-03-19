import { useEffect, useState } from 'react';
import { generateClient } from 'aws-amplify/data';
import MetricCard from '../components/MetricCard';
import MissionViabilityPanel from '../components/MissionViabilityPanel';
import AgentNetworkPanel from '../components/AgentNetworkPanel';
import CropTable from '../components/CropTable';
import { buildAgentViewModel } from '../lib/agentViewModel';
import {
  mockAgentEvents,
  mockCrops,
  mockSensorReading,
} from '../lib/mockData';

const SENSOR_METRICS = [
  { key: 'temperature', label: 'Temperature', unit: '°C' },
  { key: 'humidity', label: 'Humidity', unit: '%' },
  { key: 'co2Ppm', label: 'CO₂', unit: 'ppm' },
  { key: 'lightPpfd', label: 'Light PPFD', unit: 'µmol/m²/s' },
  { key: 'phLevel', label: 'pH Level', unit: 'pH' },
  { key: 'nutrientEc', label: 'Nutrient EC', unit: 'mS/cm' },
  { key: 'waterLitres', label: 'Water', unit: 'L' },
];

export default function Dashboard({ amplifyConfigured = false }) {
  const [latestReading, setLatestReading] = useState(null);
  const [agentEvents, setAgentEvents] = useState([]);
  const [crops, setCrops] = useState([]);
  const [loadError, setLoadError] = useState(null);
  const agentModel = buildAgentViewModel({
    latestReading,
    crops,
    agentEvents,
  });

  useEffect(() => {
    if (!amplifyConfigured) {
      setLatestReading(mockSensorReading);
      setAgentEvents(mockAgentEvents);
      setCrops(mockCrops);
      setLoadError(null);
      return undefined;
    }

    const client = generateClient();
    let cancelled = false;

    const agentSubscription = client.models.AgentEvent.observeQuery({
      authMode: 'apiKey',
      limit: 50,
      sortDirection: 'DESC',
    }).subscribe({
      next: ({ items }) => {
        if (!cancelled) {
          setAgentEvents(items);
        }
      },
      error: (error) => {
        if (!cancelled) {
          setLoadError(
            error instanceof Error
              ? error.message
              : 'Agent event subscription failed.'
          );
        }
      },
    });

    async function loadDashboard() {
      try {
        const [sensorResult, cropResult] = await Promise.all([
          client.models.SensorReading.list({
            authMode: 'apiKey',
            limit: 1,
            sortDirection: 'DESC',
          }),
          client.models.CropRecord.list({
            authMode: 'apiKey',
          }),
        ]);

        if (!cancelled) {
          setLatestReading(sensorResult.data?.[0] ?? null);
          setCrops(cropResult.data ?? []);
          setLoadError(null);
        }
      } catch (error) {
        if (!cancelled) {
          setLoadError(
            error instanceof Error
              ? error.message
              : 'Failed to load dashboard data from Amplify.'
          );
        }
      }
    }

    loadDashboard();

    return () => {
      cancelled = true;
      agentSubscription.unsubscribe();
    };
  }, [amplifyConfigured]);

  return (
    <div style={styles.page}>
      <h1 style={styles.heading}>Mars Greenhouse Dashboard</h1>
      {loadError ? <p style={styles.error}>{loadError}</p> : null}

      <MissionViabilityPanel />

      <section aria-label="Sensor Readings" style={styles.grid}>
        {SENSOR_METRICS.map(({ key, label, unit }) => (
          <MetricCard
            key={key}
            label={label}
            value={latestReading?.[key] ?? '—'}
            unit={unit}
          />
        ))}
        <MetricCard
          label="Last Updated"
          value={
            latestReading?.createdAt
              ? new Date(latestReading.createdAt).toLocaleTimeString()
              : '—'
          }
          unit=""
        />
      </section>

      <AgentNetworkPanel model={agentModel} events={agentEvents} />

      <div style={styles.lower}>
        <section aria-label="Crop Records" style={styles.tableSection}>
          <h2 style={styles.sectionHeading}>Crops</h2>
          <CropTable crops={crops} />
        </section>
      </div>
    </div>
  );
}

const styles = {
  page: {
    fontFamily: 'system-ui, sans-serif',
    padding: '1.5rem',
    background: '#0d1117',
    minHeight: '100vh',
    color: '#e6edf3',
  },
  heading: {
    fontSize: '1.5rem',
    marginBottom: '1.25rem',
    color: '#58a6ff',
  },
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(4, 1fr)',
    gridTemplateRows: 'repeat(2, auto)',
    gap: '1rem',
    marginBottom: '1.5rem',
  },
  lower: {
    display: 'grid',
    gridTemplateColumns: '1fr',
    gap: '1rem',
  },
  tableSection: { display: 'flex', flexDirection: 'column' },
  sectionHeading: {
    fontSize: '1rem',
    marginBottom: '0.5rem',
    color: '#8b949e',
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
  },
  error: {
    color: '#f85149',
    marginBottom: '1rem',
  },
};
