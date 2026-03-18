export default function MetricCard({ label, value, unit }) {
  return (
    <div style={styles.card}>
      <span style={styles.label}>{label}</span>
      <span style={styles.value}>
        {typeof value === 'number' ? value.toFixed(2) : value}
        {unit && <span style={styles.unit}> {unit}</span>}
      </span>
    </div>
  );
}

const styles = {
  card: {
    background: '#161b22',
    border: '1px solid #30363d',
    borderRadius: '8px',
    padding: '1rem',
    display: 'flex',
    flexDirection: 'column',
    gap: '0.4rem',
  },
  label: {
    fontSize: '0.75rem',
    color: '#8b949e',
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
  },
  value: {
    fontSize: '1.5rem',
    fontWeight: 600,
    color: '#58a6ff',
  },
  unit: {
    fontSize: '0.85rem',
    color: '#8b949e',
    fontWeight: 400,
  },
};
