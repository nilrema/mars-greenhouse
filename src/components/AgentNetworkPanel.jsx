import AgentLog from './AgentLog';

const STATUS_COLORS = {
  STABLE: '#3fb950',
  MONITOR: '#d29922',
  WARN: '#d29922',
  CRITICAL: '#f85149',
  IDLE: '#8b949e',
  WAITING: '#8b949e',
  HIGH: '#f85149',
};

function AgentRoleCard({ agent }) {
  return (
    <article style={styles.card}>
      <div style={styles.cardHeader}>
        <h3 style={styles.cardTitle}>{agent.label}</h3>
        <span
          style={{
            ...styles.status,
            color: STATUS_COLORS[agent.status] ?? '#e6edf3',
            borderColor: `${STATUS_COLORS[agent.status] ?? '#30363d'}66`,
          }}
        >
          {agent.status}
        </span>
      </div>
      <p style={styles.summary}>{agent.summary}</p>
      <p style={styles.detail}>{agent.detail}</p>
      <div style={styles.actionRow}>
        {agent.actions?.slice(0, 2).map((action) => (
          <span key={action} style={styles.pill}>
            {action}
          </span>
        ))}
      </div>
      {agent.metrics ? (
        <div style={styles.metrics}>
          <span>Nutrition {agent.metrics.nutritionScore}</span>
          <span>Diversity {agent.metrics.mealDiversity}</span>
          <span>Security {agent.metrics.foodSecurity}</span>
          <span>Risk {agent.metrics.crewHealthRisk}</span>
        </div>
      ) : null}
    </article>
  );
}

export default function AgentNetworkPanel({ model, events }) {
  return (
    <section style={styles.panel} aria-label="Agent network">
      <div style={styles.panelHeader}>
        <div>
          <h2 style={styles.heading}>Agent Network</h2>
          <p style={styles.subheading}>Live coordination between the mission orchestrator and specialist agents.</p>
        </div>
        <div style={styles.orchestratorBox}>
          <div style={styles.orchestratorLabel}>Mission Orchestrator</div>
          <div style={styles.orchestratorLead}>Lead: {model.orchestrator.lead}</div>
          <div style={styles.orchestratorChat}>{model.orchestrator.chatResponse}</div>
        </div>
      </div>

      <div style={styles.flow}>
        {model.flow.map((step) => (
          <div key={step.title} style={styles.flowStep}>
            <div style={styles.flowTitle}>{step.title}</div>
            <div
              style={{
                ...styles.flowStatus,
                color: STATUS_COLORS[step.status] ?? '#e6edf3',
              }}
            >
              {step.status}
            </div>
            <div style={styles.flowText}>{step.text}</div>
          </div>
        ))}
      </div>

      <div style={styles.grid}>
        {model.specialists.map((agent) => (
          <AgentRoleCard key={agent.id} agent={agent} />
        ))}
      </div>

      <div style={styles.logWrap}>
        <h3 style={styles.logHeading}>Recent Agent Events</h3>
        <AgentLog events={events} />
      </div>
    </section>
  );
}

const styles = {
  panel: {
    display: 'flex',
    flexDirection: 'column',
    gap: '1rem',
    background: 'linear-gradient(180deg, #161b22 0%, #11161d 100%)',
    border: '1px solid #30363d',
    borderRadius: '16px',
    padding: '1rem',
  },
  panelHeader: {
    display: 'grid',
    gridTemplateColumns: '1.2fr 1fr',
    gap: '1rem',
    alignItems: 'start',
  },
  heading: {
    margin: 0,
    fontSize: '1.1rem',
    color: '#f0f6fc',
  },
  subheading: {
    margin: '0.3rem 0 0',
    color: '#8b949e',
    fontSize: '0.9rem',
  },
  orchestratorBox: {
    background: 'rgba(88, 166, 255, 0.08)',
    border: '1px solid rgba(88, 166, 255, 0.2)',
    borderRadius: '14px',
    padding: '0.9rem 1rem',
  },
  orchestratorLabel: {
    color: '#58a6ff',
    fontSize: '0.78rem',
    textTransform: 'uppercase',
    letterSpacing: '0.08em',
    marginBottom: '0.45rem',
  },
  orchestratorLead: {
    fontWeight: 700,
    color: '#f0f6fc',
    marginBottom: '0.4rem',
  },
  orchestratorChat: {
    color: '#c9d1d9',
    fontSize: '0.92rem',
    lineHeight: 1.45,
  },
  flow: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
    gap: '0.75rem',
  },
  flowStep: {
    border: '1px solid #30363d',
    borderRadius: '12px',
    padding: '0.85rem',
    background: '#0d1117',
  },
  flowTitle: {
    color: '#e6edf3',
    fontSize: '0.88rem',
    fontWeight: 600,
    marginBottom: '0.35rem',
  },
  flowStatus: {
    fontSize: '0.78rem',
    fontWeight: 700,
    marginBottom: '0.4rem',
  },
  flowText: {
    color: '#8b949e',
    fontSize: '0.84rem',
    lineHeight: 1.45,
  },
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(230px, 1fr))',
    gap: '0.85rem',
  },
  card: {
    background: '#0d1117',
    border: '1px solid #30363d',
    borderRadius: '14px',
    padding: '0.9rem',
    display: 'flex',
    flexDirection: 'column',
    gap: '0.55rem',
  },
  cardHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    gap: '0.75rem',
    alignItems: 'center',
  },
  cardTitle: {
    margin: 0,
    fontSize: '0.95rem',
    color: '#f0f6fc',
  },
  status: {
    border: '1px solid #30363d',
    borderRadius: '999px',
    padding: '0.2rem 0.55rem',
    fontSize: '0.72rem',
    fontWeight: 700,
  },
  summary: {
    margin: 0,
    color: '#e6edf3',
    fontSize: '0.88rem',
  },
  detail: {
    margin: 0,
    color: '#8b949e',
    fontSize: '0.82rem',
    lineHeight: 1.45,
  },
  actionRow: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: '0.4rem',
  },
  pill: {
    background: '#161b22',
    border: '1px solid #30363d',
    borderRadius: '999px',
    padding: '0.22rem 0.5rem',
    color: '#c9d1d9',
    fontSize: '0.73rem',
  },
  metrics: {
    display: 'grid',
    gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
    gap: '0.35rem 0.6rem',
    color: '#8b949e',
    fontSize: '0.76rem',
  },
  logWrap: {
    borderTop: '1px solid #30363d',
    paddingTop: '0.9rem',
  },
  logHeading: {
    margin: '0 0 0.7rem',
    color: '#8b949e',
    fontSize: '0.9rem',
    textTransform: 'uppercase',
    letterSpacing: '0.06em',
  },
};
