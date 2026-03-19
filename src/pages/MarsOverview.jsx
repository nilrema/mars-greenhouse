import { useEffect, useMemo, useState } from 'react';
import { generateClient } from 'aws-amplify/data';
import MetricCard from '../components/MetricCard';
import MissionViabilityPanel from '../components/MissionViabilityPanel';
import AgentNetworkPanel from '../components/AgentNetworkPanel';
import CropTable from '../components/CropTable';
import { buildAgentViewModel } from '../lib/agentViewModel';
import { greenhouseModules } from '../lib/greenhouseModules';
import { mockAgentEvents, mockCrops, mockSensorReading } from '../lib/mockData';

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

const CREW_SUMMARY_CARDS = [
  { label: 'Nutrition score', value: '92%', note: 'Calorie and protein targets trending on plan' },
  { label: 'Meal diversity', value: 'High', note: '12 active crop ingredients across the mission week' },
  { label: 'Food security', value: '41 sols', note: 'Reserve outlook remains resilient to a single-module dip' },
  { label: 'Health risk', value: 'Low', note: 'No crew cohort flagged for nutrition-related drift' },
];

const PLACEHOLDER_TRACKS = [
  '3D Mars scene and greenhouse site markers',
  'Selected module nutritional contribution summary',
  'Operator prompt input and reply composer',
];

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

  const selectedStatusColor = MODULE_STATUS_COLORS[selectedModule.status] ?? '#8b949e';
  const lastUpdatedLabel = selectedModuleReading?.createdAt
    ? new Date(selectedModuleReading.createdAt).toLocaleTimeString()
    : 'Awaiting live sync';

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
            error instanceof Error ? error.message : 'Agent event subscription failed.'
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
      <section style={styles.hero}>
        <div style={styles.heroCopy}>
          <p style={styles.eyebrow}>Screen 1</p>
          <h1 style={styles.heading}>Mars Overview</h1>
          <p style={styles.description}>
            Mission control shell for monitoring the module network, crew resilience, and agent
            coordination before drilling into a specific greenhouse.
          </p>
        </div>

        <div style={styles.heroActions}>
          <div style={styles.heroBadgeGroup}>
            <div style={styles.heroBadge}>
              <span style={styles.heroBadgeLabel}>Active module</span>
              <strong style={styles.heroBadgeValue}>{selectedModule.name}</strong>
            </div>
            <div style={styles.heroBadge}>
              <span style={styles.heroBadgeLabel}>Sync mode</span>
              <strong style={styles.heroBadgeValue}>
                {amplifyConfigured ? 'Amplify live data' : 'Mock mission feed'}
              </strong>
            </div>
          </div>

          <button type="button" style={styles.chaosButton}>
            Activate Chaos
          </button>
        </div>
      </section>

      {loadError ? <p style={styles.error}>{loadError}</p> : null}

      <section style={styles.missionBanner}>
        <div style={styles.bannerHeadingBlock}>
          <p style={styles.bannerEyebrow}>Mission shell</p>
          <h2 style={styles.bannerTitle}>Overview regions staged for Milestone 1 follow-up work</h2>
        </div>
        <div style={styles.placeholderTrackList}>
          {PLACEHOLDER_TRACKS.map((track) => (
            <div key={track} style={styles.placeholderTrack}>
              {track}
            </div>
          ))}
        </div>
      </section>

      <div className="mars-overview-shell" style={styles.shell}>
        <section aria-label="3D Mars panel" style={styles.card}>
          <div style={styles.cardHeader}>
            <div>
              <p style={styles.cardEyebrow}>3D Mars Panel</p>
              <h2 style={styles.cardTitle}>Mission Network</h2>
            </div>
            <div style={styles.inlineBadge}>Future interactive globe</div>
          </div>

          <div style={styles.sceneCard}>
            <div style={styles.sceneBackdrop}>
              <div style={styles.scenePlanet} />
              <div style={styles.sceneOrbit}>
                {greenhouseModules.map((module, index) => {
                  const isSelected = module.id === selectedModule.id;
                  const color = MODULE_STATUS_COLORS[module.status] ?? '#8b949e';

                  return (
                    <button
                      key={module.id}
                      type="button"
                      onClick={() => onSelectModule(module.id)}
                      aria-pressed={isSelected}
                      style={{
                        ...styles.sceneNode,
                        ...SCENE_NODE_POSITIONS[index],
                        borderColor: `${color}55`,
                        background: isSelected ? `${color}22` : 'rgba(13, 17, 23, 0.92)',
                        boxShadow: isSelected ? `0 0 0 1px ${color}66` : 'none',
                      }}
                    >
                      <span style={{ ...styles.sceneNodeDot, backgroundColor: color }} />
                      <span style={styles.sceneNodeLabel}>{module.name}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            <div style={styles.sceneCaptionRow}>
              <div>
                <p style={styles.inlineMetaLabel}>Selected site</p>
                <strong style={styles.inlineMetaValue}>{selectedModule.location}</strong>
              </div>
              <div>
                <p style={styles.inlineMetaLabel}>Current alert</p>
                <strong style={styles.inlineMetaValue}>{selectedModule.alert}</strong>
              </div>
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

          <div style={styles.summaryBanner}>
            <div style={styles.summaryHeadline}>
              <span
                style={{
                  ...styles.statusDot,
                  backgroundColor: selectedStatusColor,
                  boxShadow: `0 0 0 6px ${selectedStatusColor}22`,
                }}
              />
              <div>
                <p style={styles.summaryLabel}>Selected greenhouse</p>
                <h3 style={styles.summaryTitle}>{selectedModule.location}</h3>
              </div>
            </div>
            <div style={styles.summaryMeta}>
              <div style={styles.summaryMetaItem}>
                <span style={styles.summaryMetaLabel}>Alert state</span>
                <strong style={styles.summaryMetaValue}>{selectedModule.alert}</strong>
              </div>
              <div style={styles.summaryMetaItem}>
                <span style={styles.summaryMetaLabel}>Last updated</span>
                <strong style={styles.summaryMetaValue}>{lastUpdatedLabel}</strong>
              </div>
            </div>
          </div>

          <div className="mars-overview-summary-grid" style={styles.metricsGrid}>
            {SENSOR_METRICS.map(({ key, label, unit }) => (
              <MetricCard
                key={key}
                label={label}
                value={selectedModuleReading?.[key] ?? '—'}
                unit={unit}
              />
            ))}
            <MetricCard label="Water recovery" value="96" unit="%" />
            <MetricCard label="Energy state" value="Nominal" unit="" />
          </div>

          <div style={styles.placeholderCard}>
            <div style={styles.placeholderHeader}>
              <h3 style={styles.inlineHeading}>Nutritional Contribution Region</h3>
              <span style={styles.inlineBadge}>Shell only</span>
            </div>
            <p style={styles.cardDescription}>
              Reserved for crop-mix impact, crew coverage, and module contribution summaries in the
              next pass.
            </p>
          </div>

          <section aria-label="Crop portfolio status" style={styles.inlineSection}>
            <div style={styles.placeholderHeader}>
              <h3 style={styles.inlineHeading}>Crop Portfolio Status</h3>
              <span style={styles.inlineMetaValue}>{crops.length} tracked crops</span>
            </div>
            <CropTable crops={crops} />
          </section>
        </section>

        <section aria-label="Chat panel" style={styles.card}>
          <div style={styles.cardHeader}>
            <div>
              <p style={styles.cardEyebrow}>Chat Panel</p>
              <h2 style={styles.cardTitle}>Agent Reasoning</h2>
            </div>
            <div style={styles.inlineBadge}>Context follows selected module</div>
          </div>

          <div style={styles.chatComposerPlaceholder}>
            <div>
              <p style={styles.inlineMetaLabel}>Operator input region</p>
              <strong style={styles.inlineMetaValue}>Prompt composer placeholder</strong>
            </div>
            <div style={styles.composerGhost}>
              Ask why water recovery dipped in Elysium Hub...
            </div>
          </div>

          <AgentNetworkPanel model={agentModel} events={agentEvents} />
        </section>
      </div>

      <section aria-label="Crew strip" style={styles.crewStrip}>
        <div style={styles.cardHeader}>
          <div>
            <p style={styles.cardEyebrow}>Crew Strip</p>
            <h2 style={styles.cardTitle}>Crew Mission Health</h2>
          </div>
          <div style={styles.inlineBadge}>Bottom strip prepared for richer crew cards</div>
        </div>

        <div className="mars-overview-crew-grid" style={styles.crewGrid}>
          <MissionViabilityPanel />
          <div style={styles.crewCardRail}>
            {CREW_SUMMARY_CARDS.map((card) => (
              <article key={card.label} style={styles.crewCard}>
                <p style={styles.crewCardLabel}>{card.label}</p>
                <div style={styles.crewCardValue}>{card.value}</div>
                <p style={styles.crewCardNote}>{card.note}</p>
              </article>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}

const SCENE_NODE_POSITIONS = [
  { top: '20%', left: '14%' },
  { top: '56%', left: '54%' },
  { top: '28%', right: '8%' },
];

const styles = {
  page: {
    display: 'flex',
    flexDirection: 'column',
    gap: '1.5rem',
  },
  hero: {
    display: 'flex',
    justifyContent: 'space-between',
    gap: '1.5rem',
    alignItems: 'flex-start',
    flexWrap: 'wrap',
    background:
      'radial-gradient(circle at top left, rgba(88, 166, 255, 0.16), transparent 38%), #11161d',
    border: '1px solid #30363d',
    borderRadius: '20px',
    padding: '1.35rem',
  },
  heroCopy: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.45rem',
    maxWidth: '48rem',
  },
  heroActions: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'flex-end',
    gap: '0.85rem',
    flex: '1 1 280px',
  },
  heroBadgeGroup: {
    display: 'flex',
    gap: '0.75rem',
    flexWrap: 'wrap',
    justifyContent: 'flex-end',
  },
  heroBadge: {
    minWidth: '180px',
    background: 'rgba(13, 17, 23, 0.82)',
    border: '1px solid #30363d',
    borderRadius: '14px',
    padding: '0.8rem 0.95rem',
    display: 'flex',
    flexDirection: 'column',
    gap: '0.28rem',
  },
  heroBadgeLabel: {
    fontSize: '0.74rem',
    textTransform: 'uppercase',
    letterSpacing: '0.08em',
    color: '#8b949e',
  },
  heroBadgeValue: {
    color: '#f0f6fc',
    fontSize: '0.92rem',
  },
  eyebrow: {
    margin: 0,
    fontSize: '0.78rem',
    textTransform: 'uppercase',
    letterSpacing: '0.12em',
    color: '#8b949e',
  },
  heading: {
    margin: 0,
    fontSize: '2rem',
    color: '#f0f6fc',
  },
  description: {
    margin: 0,
    color: '#8b949e',
    lineHeight: 1.5,
  },
  chaosButton: {
    border: '1px solid #f85149',
    background: 'linear-gradient(180deg, rgba(248, 81, 73, 0.2), rgba(248, 81, 73, 0.08))',
    color: '#ffb3ad',
    padding: '0.9rem 1.1rem',
    borderRadius: '999px',
    fontWeight: 700,
    cursor: 'pointer',
    whiteSpace: 'nowrap',
  },
  missionBanner: {
    display: 'flex',
    justifyContent: 'space-between',
    gap: '1rem',
    flexWrap: 'wrap',
    background: '#0f141b',
    border: '1px solid #21262d',
    borderRadius: '18px',
    padding: '1rem 1.15rem',
  },
  bannerHeadingBlock: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.3rem',
  },
  bannerEyebrow: {
    margin: 0,
    fontSize: '0.72rem',
    textTransform: 'uppercase',
    letterSpacing: '0.08em',
    color: '#58a6ff',
  },
  bannerTitle: {
    margin: 0,
    color: '#f0f6fc',
    fontSize: '1.02rem',
  },
  placeholderTrackList: {
    display: 'flex',
    gap: '0.6rem',
    flexWrap: 'wrap',
    alignItems: 'center',
  },
  placeholderTrack: {
    border: '1px dashed #30363d',
    borderRadius: '999px',
    padding: '0.42rem 0.75rem',
    color: '#c9d1d9',
    fontSize: '0.8rem',
    background: 'rgba(13, 17, 23, 0.7)',
  },
  shell: {
    display: 'grid',
    gridTemplateColumns: 'minmax(300px, 1.08fr) minmax(320px, 1fr) minmax(340px, 1.12fr)',
    gap: '1rem',
    alignItems: 'start',
  },
  card: {
    background: '#161b22',
    border: '1px solid #30363d',
    borderRadius: '18px',
    padding: '1rem',
    display: 'flex',
    flexDirection: 'column',
    gap: '1rem',
    minHeight: '100%',
  },
  cardHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    gap: '1rem',
    alignItems: 'flex-start',
    flexWrap: 'wrap',
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
    margin: 0,
    color: '#8b949e',
    lineHeight: 1.45,
  },
  inlineBadge: {
    border: '1px solid #30363d',
    borderRadius: '999px',
    padding: '0.38rem 0.7rem',
    fontSize: '0.74rem',
    color: '#8b949e',
    background: '#0d1117',
  },
  sceneCard: {
    background:
      'radial-gradient(circle at top left, rgba(88, 166, 255, 0.12), transparent 32%), #0d1117',
    border: '1px solid #30363d',
    borderRadius: '16px',
    padding: '1rem',
    display: 'flex',
    flexDirection: 'column',
    gap: '1rem',
  },
  sceneBackdrop: {
    position: 'relative',
    minHeight: '240px',
    borderRadius: '14px',
    overflow: 'hidden',
    border: '1px dashed #30363d',
    background:
      'linear-gradient(180deg, rgba(13, 17, 23, 0.82), rgba(13, 17, 23, 0.98)), radial-gradient(circle at 30% 30%, rgba(248, 81, 73, 0.18), transparent 34%)',
  },
  scenePlanet: {
    position: 'absolute',
    width: '170px',
    height: '170px',
    borderRadius: '50%',
    left: 'calc(50% - 85px)',
    top: 'calc(50% - 85px)',
    background:
      'radial-gradient(circle at 35% 35%, #ffb77c 0%, #d97a43 28%, #8a3a1f 68%, #4f1d14 100%)',
    boxShadow: '0 0 80px rgba(217, 122, 67, 0.2)',
    opacity: 0.92,
  },
  sceneOrbit: {
    position: 'absolute',
    inset: 0,
  },
  sceneNode: {
    position: 'absolute',
    display: 'inline-flex',
    alignItems: 'center',
    gap: '0.45rem',
    padding: '0.42rem 0.65rem',
    borderRadius: '999px',
    border: '1px solid #30363d',
    color: '#f0f6fc',
    cursor: 'pointer',
    fontSize: '0.78rem',
  },
  sceneNodeDot: {
    width: '0.55rem',
    height: '0.55rem',
    borderRadius: '50%',
    flexShrink: 0,
  },
  sceneNodeLabel: {
    whiteSpace: 'nowrap',
  },
  sceneCaptionRow: {
    display: 'grid',
    gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
    gap: '0.75rem',
  },
  inlineMetaLabel: {
    margin: 0,
    fontSize: '0.72rem',
    textTransform: 'uppercase',
    letterSpacing: '0.06em',
    color: '#8b949e',
  },
  inlineMetaValue: {
    color: '#c9d1d9',
    fontSize: '0.86rem',
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
  summaryBanner: {
    background: 'linear-gradient(180deg, rgba(88, 166, 255, 0.08), rgba(88, 166, 255, 0.02))',
    border: '1px solid rgba(88, 166, 255, 0.18)',
    borderRadius: '16px',
    padding: '1rem',
    display: 'flex',
    flexDirection: 'column',
    gap: '1rem',
  },
  summaryHeadline: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.9rem',
  },
  statusDot: {
    width: '0.8rem',
    height: '0.8rem',
    borderRadius: '50%',
    flexShrink: 0,
  },
  summaryLabel: {
    margin: 0,
    fontSize: '0.72rem',
    textTransform: 'uppercase',
    letterSpacing: '0.08em',
    color: '#8b949e',
  },
  summaryTitle: {
    margin: '0.35rem 0 0',
    color: '#f0f6fc',
    fontSize: '1.02rem',
  },
  summaryMeta: {
    display: 'grid',
    gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
    gap: '0.75rem',
  },
  summaryMetaItem: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.28rem',
  },
  summaryMetaLabel: {
    fontSize: '0.72rem',
    textTransform: 'uppercase',
    letterSpacing: '0.06em',
    color: '#8b949e',
  },
  summaryMetaValue: {
    color: '#c9d1d9',
    lineHeight: 1.45,
  },
  metricsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
    gap: '0.85rem',
  },
  placeholderCard: {
    border: '1px dashed #30363d',
    borderRadius: '16px',
    padding: '0.95rem',
    background: '#10151c',
    display: 'flex',
    flexDirection: 'column',
    gap: '0.55rem',
  },
  placeholderHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    gap: '0.75rem',
    alignItems: 'center',
    flexWrap: 'wrap',
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
  chatComposerPlaceholder: {
    background: '#0d1117',
    border: '1px dashed #30363d',
    borderRadius: '16px',
    padding: '0.95rem',
    display: 'flex',
    flexDirection: 'column',
    gap: '0.75rem',
  },
  composerGhost: {
    border: '1px solid #21262d',
    borderRadius: '999px',
    padding: '0.75rem 0.95rem',
    color: '#6e7681',
    background: '#11161d',
    fontSize: '0.9rem',
  },
  crewStrip: {
    background: '#161b22',
    border: '1px solid #30363d',
    borderRadius: '18px',
    padding: '1rem',
    display: 'flex',
    flexDirection: 'column',
    gap: '1rem',
  },
  crewGrid: {
    display: 'grid',
    gridTemplateColumns: 'minmax(0, 1.2fr) minmax(0, 0.9fr)',
    gap: '1rem',
    alignItems: 'start',
  },
  crewCardRail: {
    display: 'grid',
    gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
    gap: '0.85rem',
  },
  crewCard: {
    background: '#0d1117',
    border: '1px solid #30363d',
    borderRadius: '16px',
    padding: '1rem',
    display: 'flex',
    flexDirection: 'column',
    gap: '0.55rem',
    minHeight: '100%',
  },
  crewCardLabel: {
    margin: 0,
    color: '#8b949e',
    fontSize: '0.76rem',
    textTransform: 'uppercase',
    letterSpacing: '0.06em',
  },
  crewCardValue: {
    color: '#f0f6fc',
    fontSize: '1.35rem',
    fontWeight: 700,
  },
  crewCardNote: {
    margin: 0,
    color: '#c9d1d9',
    lineHeight: 1.45,
    fontSize: '0.88rem',
  },
  error: {
    color: '#f85149',
    margin: 0,
  },
};
