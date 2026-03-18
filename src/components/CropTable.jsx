const HEALTH_COLORS = {
  healthy:   '#3fb950',
  stressed:  '#d29922',
  critical:  '#f85149',
};

export default function CropTable({ crops }) {
  if (!crops.length) {
    return <p style={styles.empty}>No crop records found.</p>;
  }

  return (
    <div style={styles.wrapper}>
      <table style={styles.table} aria-label="Crop records">
        <thead>
          <tr>
            {['Name', 'Variety', 'Growth Stage', 'Health Status'].map((h) => (
              <th key={h} style={styles.th}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {crops.map((crop) => {
            const healthKey = crop.healthStatus?.toLowerCase();
            return (
              <tr key={crop.id} style={styles.tr}>
                <td style={styles.td}>{crop.name}</td>
                <td style={styles.td}>{crop.variety ?? '—'}</td>
                <td style={styles.td}>{crop.growthStage ?? '—'}</td>
                <td style={styles.td}>
                  <span
                    style={{
                      ...styles.badge,
                      background: HEALTH_COLORS[healthKey] ?? '#8b949e',
                    }}
                  >
                    {crop.healthStatus ?? 'Unknown'}
                  </span>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

const styles = {
  wrapper: { overflowX: 'auto' },
  table: {
    width: '100%',
    borderCollapse: 'collapse',
    fontSize: '0.85rem',
  },
  th: {
    textAlign: 'left',
    padding: '0.5rem 0.75rem',
    color: '#8b949e',
    textTransform: 'uppercase',
    fontSize: '0.7rem',
    letterSpacing: '0.05em',
    borderBottom: '1px solid #30363d',
  },
  tr: { borderBottom: '1px solid #21262d' },
  td: { padding: '0.6rem 0.75rem', color: '#e6edf3' },
  badge: {
    display: 'inline-block',
    padding: '0.15rem 0.5rem',
    borderRadius: '999px',
    color: '#0d1117',
    fontWeight: 600,
    fontSize: '0.75rem',
  },
  empty: { color: '#8b949e', fontSize: '0.85rem' },
};
