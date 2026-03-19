import CropTable from '../components/CropTable';

const SECTION_CARDS = [
  {
    id: 'section-a',
    title: 'Section A',
    crop: 'Leafy Greens',
    status: 'Nominal irrigation rhythm',
  },
  {
    id: 'section-b',
    title: 'Section B',
    crop: 'Fruit Bearing',
    status: 'Inspection placeholder',
  },
  {
    id: 'section-c',
    title: 'Section C',
    crop: 'Protein Crops',
    status: 'Sensor drill-down placeholder',
  },
];

export default function GreenhouseDetail({
  module,
  crops,
  agentEventCount,
  onBackToOverview,
}) {
  return (
    <div style={styles.page}>
      <section style={styles.header}>
        <div>
          <p style={styles.eyebrow}>Screen 2</p>
          <h1 style={styles.heading}>Greenhouse Detail</h1>
          <p style={styles.description}>
            Deep operational view for {module.name}, with room for map inspection, section analysis,
            and agent-assisted interventions.
          </p>
        </div>
        <button type="button" style={styles.backButton} onClick={onBackToOverview}>
          Back to Mars Overview
        </button>
      </section>

      <div style={styles.layout}>
        <section aria-label="Greenhouse summary panel" style={styles.panel}>
          <p style={styles.panelEyebrow}>Summary Panel</p>
          <h2 style={styles.panelTitle}>{module.name}</h2>
          <p style={styles.detailLine}>{module.location}</p>
          <p style={styles.detailLine}>Status: {module.status}</p>
          <p style={styles.detailLine}>Current alert: {module.alert}</p>
          <div style={styles.metricStack}>
            <div style={styles.metricCard}>
              <span style={styles.metricLabel}>Operational Risk</span>
              <strong style={styles.metricValue}>{module.status}</strong>
            </div>
            <div style={styles.metricCard}>
              <span style={styles.metricLabel}>Agent Activity</span>
              <strong style={styles.metricValue}>{agentEventCount} recent updates</strong>
            </div>
          </div>
          <div>
            <h3 style={styles.subheading}>Crop Portfolio</h3>
            <CropTable crops={crops} />
          </div>
        </section>

        <section aria-label="Greenhouse map panel" style={styles.mapPanel}>
          <div>
            <p style={styles.panelEyebrow}>Bird's-Eye Greenhouse Map</p>
            <h2 style={styles.panelTitle}>Section View Placeholder</h2>
            <p style={styles.description}>
              This screen boundary is ready for the later 2D map, zoom, and crop inspection work.
            </p>
          </div>
          <div style={styles.sectionGrid}>
            {SECTION_CARDS.map((section) => (
              <article key={section.id} style={styles.sectionCard}>
                <div style={styles.sectionTitle}>{section.title}</div>
                <div style={styles.sectionCrop}>{section.crop}</div>
                <div style={styles.sectionStatus}>{section.status}</div>
              </article>
            ))}
          </div>
        </section>

        <section aria-label="Analysis and chat panel" style={styles.panel}>
          <p style={styles.panelEyebrow}>Analysis & Chat Panel</p>
          <h2 style={styles.panelTitle}>Inspection Placeholder</h2>
          <p style={styles.description}>
            Reserved for section-level analysis, anomaly detail, operator chat, and image inspection.
          </p>
          <div style={styles.placeholderList}>
            <div style={styles.placeholderItem}>Section analysis state</div>
            <div style={styles.placeholderItem}>Sensor drill-down</div>
            <div style={styles.placeholderItem}>Agent conversation context</div>
            <div style={styles.placeholderItem}>Astronaut action requests</div>
          </div>
        </section>
      </div>
    </div>
  );
}

const styles = {
  page: {
    display: 'flex',
    flexDirection: 'column',
    gap: '1.5rem',
  },
  header: {
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
    color: '#8b949e',
    lineHeight: 1.5,
  },
  layout: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
    gap: '1rem',
  },
  panel: {
    background: '#161b22',
    border: '1px solid #30363d',
    borderRadius: '16px',
    padding: '1rem',
    display: 'flex',
    flexDirection: 'column',
    gap: '1rem',
  },
  mapPanel: {
    background: '#161b22',
    border: '1px solid #30363d',
    borderRadius: '16px',
    padding: '1rem',
    display: 'flex',
    flexDirection: 'column',
    gap: '1rem',
    minHeight: '540px',
  },
  panelEyebrow: {
    margin: 0,
    fontSize: '0.74rem',
    textTransform: 'uppercase',
    letterSpacing: '0.08em',
    color: '#8b949e',
  },
  panelTitle: {
    margin: '0.35rem 0 0',
    fontSize: '1.15rem',
    color: '#f0f6fc',
  },
  backButton: {
    border: '1px solid #58a6ff',
    background: 'rgba(88, 166, 255, 0.12)',
    color: '#dceeff',
    padding: '0.8rem 1rem',
    borderRadius: '999px',
    fontWeight: 600,
    cursor: 'pointer',
  },
  detailLine: {
    margin: 0,
    color: '#c9d1d9',
    lineHeight: 1.5,
  },
  metricStack: {
    display: 'grid',
    gap: '0.75rem',
  },
  metricCard: {
    background: '#0d1117',
    border: '1px solid #30363d',
    borderRadius: '12px',
    padding: '0.9rem',
    display: 'flex',
    flexDirection: 'column',
    gap: '0.35rem',
  },
  metricLabel: {
    fontSize: '0.76rem',
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
    color: '#8b949e',
  },
  metricValue: {
    color: '#f0f6fc',
  },
  subheading: {
    margin: '0 0 0.75rem',
    fontSize: '0.82rem',
    textTransform: 'uppercase',
    letterSpacing: '0.06em',
    color: '#8b949e',
  },
  sectionGrid: {
    flex: 1,
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
    gap: '0.85rem',
    alignContent: 'start',
  },
  sectionCard: {
    background: '#0d1117',
    border: '1px solid #30363d',
    borderRadius: '16px',
    padding: '1rem',
    minHeight: '150px',
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'space-between',
    gap: '0.75rem',
  },
  sectionTitle: {
    color: '#f0f6fc',
    fontWeight: 700,
  },
  sectionCrop: {
    color: '#58a6ff',
  },
  sectionStatus: {
    color: '#8b949e',
    lineHeight: 1.45,
  },
  placeholderList: {
    display: 'grid',
    gap: '0.75rem',
  },
  placeholderItem: {
    background: '#0d1117',
    border: '1px dashed #30363d',
    borderRadius: '12px',
    padding: '0.9rem',
    color: '#c9d1d9',
  },
};
