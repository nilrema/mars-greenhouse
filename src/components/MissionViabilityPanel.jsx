import { useState, useEffect, useMemo } from 'react';

/**
 * Mission Viability Panel
 * Shows caloric projection across 450 sols — green/amber/red based on mission status.
 *
 * Props:
 *  - simulationData: optional full simulation results (from simulation_results.json)
 *  - currentSol: optional current sol override
 */

const MISSION_DURATION = 450;
const ASTRONAUTS = 4;
const KCAL_PER_DAY = 2300;
const TOTAL_KCAL = MISSION_DURATION * ASTRONAUTS * KCAL_PER_DAY;

// Generate mock timeline if no simulation data is provided
function generateMockTimeline() {
  const timeline = [];
  let produced = 0;
  for (let sol = 0; sol <= MISSION_DURATION; sol += 10) {
    const needed = (MISSION_DURATION - sol) * ASTRONAUTS * KCAL_PER_DAY;
    // Simulate gradual production with some variance
    produced += (8500 + (Math.random() - 0.3) * 2000) * 10;
    const available = produced;
    timeline.push({
      sol,
      kcal_needed_remaining: needed,
      kcal_total_available: available,
      viability_status:
        available >= needed
          ? 'ON_TRACK'
          : available >= needed * 0.9
            ? 'MARGINAL'
            : available >= needed * 0.6
              ? 'AT_RISK'
              : 'CRITICAL',
      days_of_food_remaining: available / (ASTRONAUTS * KCAL_PER_DAY),
    });
  }
  return timeline;
}

const STATUS_COLORS = {
  ON_TRACK: '#3fb950',
  MARGINAL: '#d29922',
  AT_RISK: '#db6d28',
  CRITICAL: '#f85149',
};

const STATUS_LABELS = {
  ON_TRACK: 'On Track',
  MARGINAL: 'Marginal',
  AT_RISK: 'At Risk',
  CRITICAL: 'Critical',
};

export default function MissionViabilityPanel({ simulationData = null, currentSol = null }) {
  const timeline = useMemo(() => {
    if (simulationData?.nutrition_timeline?.length) {
      return simulationData.nutrition_timeline;
    }
    return generateMockTimeline();
  }, [simulationData]);

  const latest = timeline[timeline.length - 1] || {};
  const status = latest.viability_status || 'ON_TRACK';
  const statusColor = STATUS_COLORS[status] || STATUS_COLORS.ON_TRACK;
  const sol = currentSol || latest.sol || 0;

  // Calculate chart dimensions
  const chartWidth = 100; // percentage
  const maxKcal = Math.max(
    ...timeline.map((t) => Math.max(t.kcal_needed_remaining || 0, t.kcal_total_available || 0)),
    1
  );

  return (
    <div style={styles.panel}>
      <div style={styles.header}>
        <h2 style={styles.title}>Mission Viability</h2>
        <div style={{ ...styles.statusBadge, backgroundColor: statusColor + '22', color: statusColor, borderColor: statusColor }}>
          {STATUS_LABELS[status] || status}
        </div>
      </div>

      {/* Key metrics row */}
      <div style={styles.metricsRow}>
        <div style={styles.metric}>
          <span style={styles.metricLabel}>Current Sol</span>
          <span style={styles.metricValue}>{Math.floor(sol)}</span>
          <span style={styles.metricSub}>of {MISSION_DURATION}</span>
        </div>
        <div style={styles.metric}>
          <span style={styles.metricLabel}>Days of Food</span>
          <span style={{ ...styles.metricValue, color: statusColor }}>
            {Math.floor(latest.days_of_food_remaining || 0)}
          </span>
          <span style={styles.metricSub}>remaining</span>
        </div>
        <div style={styles.metric}>
          <span style={styles.metricLabel}>kcal Produced</span>
          <span style={styles.metricValue}>
            {((latest.kcal_total_available || 0) / 1000000).toFixed(1)}M
          </span>
          <span style={styles.metricSub}>of {(TOTAL_KCAL / 1000000).toFixed(1)}M needed</span>
        </div>
        <div style={styles.metric}>
          <span style={styles.metricLabel}>
            {latest.deficit_kcal > 0 ? 'Deficit' : 'Surplus'}
          </span>
          <span style={{ ...styles.metricValue, color: latest.deficit_kcal > 0 ? '#f85149' : '#3fb950' }}>
            {(((latest.deficit_kcal || latest.surplus_kcal || 0)) / 1000).toFixed(0)}k
          </span>
          <span style={styles.metricSub}>kcal</span>
        </div>
      </div>

      {/* Progress bar */}
      <div style={styles.progressContainer}>
        <div style={styles.progressLabel}>
          <span>Sol 0</span>
          <span>Mission Progress: {((sol / MISSION_DURATION) * 100).toFixed(0)}%</span>
          <span>Sol {MISSION_DURATION}</span>
        </div>
        <div style={styles.progressBar}>
          <div
            style={{
              ...styles.progressFill,
              width: `${(sol / MISSION_DURATION) * 100}%`,
              background: `linear-gradient(90deg, ${statusColor}88, ${statusColor})`,
            }}
          />
        </div>
      </div>

      {/* Mini chart — simplified bar chart of viability over time */}
      <div style={styles.chartContainer}>
        <div style={styles.chartTitle}>Caloric Projection Timeline</div>
        <div style={styles.chart}>
          {timeline.map((point, i) => {
            const ratio =
              point.kcal_needed_remaining > 0
                ? point.kcal_total_available / point.kcal_needed_remaining
                : 1;
            const barHeight = Math.min(100, Math.max(5, ratio * 60));
            const barColor = STATUS_COLORS[point.viability_status] || '#3fb950';

            return (
              <div key={i} style={styles.barCol} title={`Sol ${point.sol}: ${point.viability_status}`}>
                <div
                  style={{
                    ...styles.bar,
                    height: `${barHeight}%`,
                    backgroundColor: barColor,
                    opacity: point.sol <= sol ? 1 : 0.3,
                  }}
                />
                {i % 5 === 0 && <span style={styles.barLabel}>{point.sol}</span>}
              </div>
            );
          })}
        </div>
        <div style={styles.chartLegend}>
          {Object.entries(STATUS_COLORS).map(([key, color]) => (
            <span key={key} style={styles.legendItem}>
              <span style={{ ...styles.legendDot, backgroundColor: color }} />
              {STATUS_LABELS[key]}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}

const styles = {
  panel: {
    backgroundColor: '#161b22',
    border: '1px solid #30363d',
    borderRadius: '12px',
    padding: '1.25rem',
    marginBottom: '1.5rem',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '1rem',
  },
  title: {
    margin: 0,
    fontSize: '1.1rem',
    color: '#e6edf3',
    fontWeight: '600',
  },
  statusBadge: {
    padding: '0.3rem 0.8rem',
    borderRadius: '999px',
    fontSize: '0.8rem',
    fontWeight: '600',
    border: '1px solid',
  },
  metricsRow: {
    display: 'grid',
    gridTemplateColumns: 'repeat(4, 1fr)',
    gap: '0.75rem',
    marginBottom: '1rem',
  },
  metric: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    padding: '0.6rem',
    backgroundColor: '#0d1117',
    borderRadius: '8px',
    border: '1px solid #21262d',
  },
  metricLabel: {
    fontSize: '0.7rem',
    color: '#8b949e',
    textTransform: 'uppercase',
    letterSpacing: '0.04em',
    marginBottom: '0.2rem',
  },
  metricValue: {
    fontSize: '1.4rem',
    fontWeight: '700',
    color: '#e6edf3',
    lineHeight: 1.2,
  },
  metricSub: {
    fontSize: '0.65rem',
    color: '#6e7681',
    marginTop: '0.1rem',
  },
  progressContainer: {
    marginBottom: '1rem',
  },
  progressLabel: {
    display: 'flex',
    justifyContent: 'space-between',
    fontSize: '0.7rem',
    color: '#8b949e',
    marginBottom: '0.3rem',
  },
  progressBar: {
    width: '100%',
    height: '6px',
    backgroundColor: '#21262d',
    borderRadius: '3px',
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: '3px',
    transition: 'width 0.5s ease',
  },
  chartContainer: {
    marginTop: '0.5rem',
  },
  chartTitle: {
    fontSize: '0.75rem',
    color: '#8b949e',
    marginBottom: '0.5rem',
    textTransform: 'uppercase',
    letterSpacing: '0.04em',
  },
  chart: {
    display: 'flex',
    alignItems: 'flex-end',
    height: '80px',
    gap: '2px',
    padding: '0 0 1.2rem 0',
    position: 'relative',
  },
  barCol: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    position: 'relative',
    height: '100%',
    justifyContent: 'flex-end',
  },
  bar: {
    width: '100%',
    borderRadius: '2px 2px 0 0',
    minHeight: '3px',
    transition: 'height 0.3s ease',
  },
  barLabel: {
    fontSize: '0.55rem',
    color: '#6e7681',
    position: 'absolute',
    bottom: '-1rem',
  },
  chartLegend: {
    display: 'flex',
    gap: '1rem',
    marginTop: '0.5rem',
    justifyContent: 'center',
  },
  legendItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.3rem',
    fontSize: '0.65rem',
    color: '#8b949e',
  },
  legendDot: {
    width: '8px',
    height: '8px',
    borderRadius: '50%',
    display: 'inline-block',
  },
};
