import { useEffect, useMemo, useState } from 'react';
import { generateClient } from 'aws-amplify/data';
import MetricCard from '../components/MetricCard';
import MissionViabilityPanel from '../components/MissionViabilityPanel';
import AgentNetworkPanel from '../components/AgentNetworkPanel';
import CropTable from '../components/CropTable';
import { buildAgentViewModel } from '../lib/agentViewModel';
import { greenhouseModules } from '../lib/greenhouseModules';
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
  { key: 'waterLitres', label: 'Water', unit: 'L' },
];

const MODULE_STATUS_COLORS = {
  Stable: '#3fb950',
  Monitor: '#d29922',
  Alert: '#f85149',
};

export default function MarsOverview({
  amplifyConfigured = false,
  selectedModuleId,
  onSelectModule,
  onOpenGreenhouseDetail,
}) {
  const [latestReading, setLatestReading] = useState(null);
  const [agentEvents, setAgentEvents] = useState([]);
  const [crops, setCrops] = useState([]);
  const [loadError, setLoadError] = useState(null);

  const selectedModule =
    greenhouseModules.find((module) => module.id === selectedModuleId) ?? greenhouseModules[0];

  const selectedModuleReading = useMemo(() => {
    if (!latestReading) {
      return null;
    }

    return {
      ...latestReading,
      greenhouseId: selectedModule.id,
    };
  }, [latestReading, selectedModule.id]);

  const agentModel = buildAgentViewModel({
    latestReading: selectedModuleReading,
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

    async function loadOverview() {
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
              : 'Failed to load Mars overview data from Amplify.'
          );
        }
      }
    }

    loadOverview();

    return () => {
      cancelled = true;
      agentSubscription.unsubscribe();
    };
  }, [amplifyConfigured]);

  return (
    <div style={styles.page}>
      <section style={styles.titleRow}>
        <div>
          <p style={styles.eyebrow}>Screen 1</p>
          <h1 style={styles.heading}>Mars Overview</h1>
          <p style={styles.description}>
            Mission control view for greenhouse status, crew support, and agent coordination.
          </p>
        </div>
        <button type="button" style={styles.chaosButton}>
          Activate Chaos
        </button>
      </section>

      {loadError ? <p style={styles.error}>{loadError}</p> : null}

      <div style={styles.shell}>
        <section aria-label="3D Mars panel" style={styles.card}>
          <div style={styles.cardHeader}>
            <div>
              <p style={styles.cardEyebrow}>3D Mars Panel</p>
              <h2 style={styles.cardTitle}>Mission Network</h2>
            </div>
          </div>
          <div style={styles.moduleList}>
            {greenhouseModules.map((module) => {
              const isSelected = module.id === selectedModule.id;
              const color = MODULE_STATUS_COLORS[module.status] ?? '#8b949e';

              return (
                <button
                  key={module.id}
                  type="button"
                  onClick={() => onSelectModule(module.id)}
                  style={{
                    ...styles.moduleButton,
                    ...(isSelected ? styles.moduleButtonSelected : null),
                  }}
                >
                  <div style={styles.moduleButtonHeader}>
                    <span style={styles.moduleName}>{module.name}</span>
                    <span
                      style={{
                        ...styles.moduleStatus,
                        color,
                        borderColor: `${color}55`,
                      }}
                    >
                      {module.status}
                    </span>
                  </div>
                  <div style={styles.moduleLocation}>{module.location}</div>
                  <div style={styles.moduleAlert}>{module.alert}</div>
                </button>
              );
            })}
          </div>
        </section>

        <section aria-label="Module overview panel" style={styles.card}>
          <div style={styles.cardHeader}>
            <div>
              <p style={styles.cardEyebrow}>Module Overview Panel</p>
              <h2 style={styles.cardTitle}>{selectedModule.name}</h2>
            </div>
            <button
              type="button"
              style={styles.secondaryButton}
              onClick={() =>
                onOpenGreenhouseDetail(selectedModule.id, {
                  crops,
                  agentEventCount: agentEvents.length,
                })
              }
            >
              Open Greenhouse Detail
            </button>
          </div>
          <p style={styles.cardDescription}>
            {selectedModule.location} • {selectedModule.alert}
          </p>
          <div style={styles.metricsGrid}>
            {SENSOR_METRICS.map(({ key, label, unit }) => (
              <MetricCard
                key={key}
                label={label}
                value={selectedModuleReading?.[key] ?? '—'}
                unit={unit}
              />
            ))}
            <MetricCard
              label="Last Updated"
              value={
                selectedModuleReading?.createdAt
                  ? new Date(selectedModuleReading.createdAt).toLocaleTimeString()
                  : '—'
              }
              unit=""
            />
          </div>
          <section aria-label="Crop portfolio status" style={styles.inlineSection}>
            <h3 style={styles.inlineHeading}>Crop Portfolio Status</h3>
            <CropTable crops={crops} />
          </section>
        </section>

        <section aria-label="Chat panel" style={styles.chatPanel}>
          <div style={styles.cardHeader}>
            <div>
              <p style={styles.cardEyebrow}>Chat Panel</p>
              <h2 style={styles.cardTitle}>Agent Reasoning</h2>
            </div>
          </div>
          <AgentNetworkPanel model={agentModel} events={agentEvents} />
        </section>
      </div>

      <section aria-label="Crew strip" style={styles.crewStrip}>
        <div>
          <p style={styles.cardEyebrow}>Crew Strip</p>
          <h2 style={styles.cardTitle}>Crew Mission Health</h2>
        </div>
        <MissionViabilityPanel />
      </section>
    </div>
  );
}

const styles = {
  page: {
    display: 'flex',
    flexDirection: 'column',
    gap: '1.5rem',
  },
  titleRow: {
    display: 'flex',
    justifyContent: 'space-between',
    gap: '1rem',
    alignItems: 'flex-start',
  },
  eyebrow: {
    margin: 0,
    fontSize: '0.78rem',
    textTransform: 'uppercase',
    letterSpacing: '0.12em',
    color: '#8b949e',
  },
  heading: {
    margin: '0.35rem 0 0.45rem',
    fontSize: '2rem',
    color: '#f0f6fc',
  },
  description: {
    margin: 0,
    maxWidth: '52rem',
    color: '#8b949e',
    lineHeight: 1.5,
  },
  shell: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
    gap: '1rem',
    alignItems: 'start',
  },
  card: {
    background: '#161b22',
    border: '1px solid #30363d',
    borderRadius: '16px',
    padding: '1rem',
    display: 'flex',
    flexDirection: 'column',
    gap: '1rem',
    minHeight: '100%',
  },
  chatPanel: {
    display: 'flex',
    flexDirection: 'column',
    gap: '1rem',
  },
  cardHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    gap: '1rem',
    alignItems: 'flex-start',
  },
  cardEyebrow: {
    margin: 0,
    fontSize: '0.74rem',
    textTransform: 'uppercase',
    letterSpacing: '0.08em',
    color: '#8b949e',
  },
  cardTitle: {
    margin: '0.35rem 0 0',
    fontSize: '1.15rem',
    color: '#f0f6fc',
  },
  cardDescription: {
    margin: '-0.35rem 0 0',
    color: '#8b949e',
    lineHeight: 1.45,
  },
  chaosButton: {
    border: '1px solid #f85149',
    background: 'rgba(248, 81, 73, 0.12)',
    color: '#ffb3ad',
    padding: '0.8rem 1rem',
    borderRadius: '999px',
    fontWeight: 700,
    cursor: 'pointer',
  },
  secondaryButton: {
    border: '1px solid #58a6ff',
    background: 'rgba(88, 166, 255, 0.12)',
    color: '#dceeff',
    padding: '0.7rem 0.9rem',
    borderRadius: '999px',
    fontWeight: 600,
    cursor: 'pointer',
    whiteSpace: 'nowrap',
  },
  moduleList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.75rem',
  },
  moduleButton: {
    border: '1px solid #30363d',
    borderRadius: '14px',
    background: '#0d1117',
    padding: '0.9rem',
    textAlign: 'left',
    cursor: 'pointer',
    color: '#e6edf3',
  },
  moduleButtonSelected: {
    borderColor: '#58a6ff',
    boxShadow: '0 0 0 1px rgba(88, 166, 255, 0.3)',
  },
  moduleButtonHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    gap: '0.5rem',
    alignItems: 'center',
  },
  moduleName: {
    fontWeight: 700,
    color: '#f0f6fc',
  },
  moduleStatus: {
    border: '1px solid #30363d',
    borderRadius: '999px',
    padding: '0.2rem 0.55rem',
    fontSize: '0.72rem',
    fontWeight: 700,
  },
  moduleLocation: {
    marginTop: '0.55rem',
    color: '#8b949e',
    fontSize: '0.84rem',
  },
  moduleAlert: {
    marginTop: '0.45rem',
    color: '#c9d1d9',
    fontSize: '0.86rem',
    lineHeight: 1.4,
  },
  metricsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
    gap: '0.85rem',
  },
  inlineSection: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.75rem',
  },
  inlineHeading: {
    margin: 0,
    fontSize: '0.82rem',
    textTransform: 'uppercase',
    letterSpacing: '0.06em',
    color: '#8b949e',
  },
  crewStrip: {
    background: '#161b22',
    border: '1px solid #30363d',
    borderRadius: '16px',
    padding: '1rem',
    display: 'flex',
    flexDirection: 'column',
    gap: '1rem',
  },
  error: {
    color: '#f85149',
    margin: 0,
  },
};
