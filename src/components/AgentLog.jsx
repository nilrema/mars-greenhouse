const SEVERITY_COLORS = {
  INFO:    '#58a6ff',
  WARNING: '#d29922',
  ERROR:   '#f85149',
  DEBUG:   '#8b949e',
};

export default function AgentLog({ events }) {
  if (!events.length) {
    return <p style={styles.empty}>No agent events yet.</p>;
  }

  return (
    <ul style={styles.list} aria-live="polite" aria-label="Agent events">
      {events.map((event) => (
        <li key={event.id} style={styles.item}>
          <span
            style={{
              ...styles.severity,
              color: SEVERITY_COLORS[event.severity?.toUpperCase()] ?? '#e6edf3',
            }}
          >
            [{event.severity ?? 'INFO'}]
          </span>
          <span style={styles.agentId}>{event.agentId}</span>
          <span style={styles.message}>{event.message}</span>
          {event.actionTaken && (
            <span style={styles.action}>→ {event.actionTaken}</span>
          )}
          <span style={styles.time}>
            {event.createdAt
              ? new Date(event.createdAt).toLocaleTimeString()
              : ''}
          </span>
        </li>
      ))}
    </ul>
  );
}

const styles = {
  list: {
    listStyle: 'none',
    margin: 0,
    padding: 0,
    display: 'flex',
    flexDirection: 'column',
    gap: '0.4rem',
    maxHeight: '320px',
    overflowY: 'auto',
  },
  item: {
    background: '#161b22',
    border: '1px solid #30363d',
    borderRadius: '6px',
    padding: '0.5rem 0.75rem',
    fontSize: '0.8rem',
    display: 'flex',
    flexWrap: 'wrap',
    gap: '0.4rem',
    alignItems: 'baseline',
  },
  severity: { fontWeight: 700, minWidth: '4rem' },
  agentId:  { color: '#3fb950', fontWeight: 600 },
  message:  { color: '#e6edf3', flex: 1 },
  action:   { color: '#d29922', fontStyle: 'italic' },
  time:     { color: '#8b949e', marginLeft: 'auto', whiteSpace: 'nowrap' },
  empty:    { color: '#8b949e', fontSize: '0.85rem' },
};
