import React from 'react';

const EnvironmentPanel = ({ sensorData }) => {
  if (!sensorData) {
    return (
      <div style={styles.container}>
        <h3 style={styles.title}>Environment Panel</h3>
        <div style={styles.noData}>No sensor data available</div>
      </div>
    );
  }

  const {
    phLevel = '—',
    nutrientEc = '—',
    lightPpfd = '—',
    radiationMsv = '—',
  } = sensorData;

  // Determine status colors
  const getStatusColor = (value, min, max) => {
    if (value === '—') return '#888';
    if (value < min || value > max) return '#ff6b6b';
    if (value < min * 1.1 || value > max * 0.9) return '#ffd93d';
    return '#6bcf7f';
  };

  const phColor = getStatusColor(phLevel, 5.8, 6.8);
  const ecColor = getStatusColor(nutrientEc, 1.5, 2.8);
  const lightColor = getStatusColor(lightPpfd, 200, 600);
  const radiationColor = getStatusColor(radiationMsv, 0, 0.5);

  return (
    <div style={styles.container}>
      <h3 style={styles.title}>Environment Panel</h3>
      <div style={styles.grid}>
        <div style={styles.card}>
          <div style={styles.cardHeader}>
            <span style={styles.cardTitle}>pH Level</span>
            <span style={{ ...styles.cardValue, color: phColor }}>
              {phLevel}
            </span>
          </div>
          <div style={styles.cardSubtitle}>Optimal: 5.8–6.8</div>
          <div style={styles.progressBar}>
            <div 
              style={{ 
                ...styles.progressFill, 
                width: `${Math.min(100, ((phLevel - 4) / 4) * 100)}%`,
                backgroundColor: phColor 
              }} 
            />
          </div>
        </div>

        <div style={styles.card}>
          <div style={styles.cardHeader}>
            <span style={styles.cardTitle}>Nutrient EC</span>
            <span style={{ ...styles.cardValue, color: ecColor }}>
              {nutrientEc} mS/cm
            </span>
          </div>
          <div style={styles.cardSubtitle}>Optimal: 1.5–2.8 mS/cm</div>
          <div style={styles.progressBar}>
            <div 
              style={{ 
                ...styles.progressFill, 
                width: `${Math.min(100, (nutrientEc / 4) * 100)}%`,
                backgroundColor: ecColor 
              }} 
            />
          </div>
        </div>

        <div style={styles.card}>
          <div style={styles.cardHeader}>
            <span style={styles.cardTitle}>Light PPFD</span>
            <span style={{ ...styles.cardValue, color: lightColor }}>
              {lightPpfd} µmol/m²/s
            </span>
          </div>
          <div style={styles.cardSubtitle}>Optimal: 200–600</div>
          <div style={styles.progressBar}>
            <div 
              style={{ 
                ...styles.progressFill, 
                width: `${Math.min(100, (lightPpfd / 800) * 100)}%`,
                backgroundColor: lightColor 
              }} 
            />
          </div>
        </div>

        <div style={styles.card}>
          <div style={styles.cardHeader}>
            <span style={styles.cardTitle}>Radiation</span>
            <span style={{ ...styles.cardValue, color: radiationColor }}>
              {radiationMsv} mSv
            </span>
          </div>
          <div style={styles.cardSubtitle}>Safe: &lt;0.5 mSv</div>
          <div style={styles.progressBar}>
            <div 
              style={{ 
                ...styles.progressFill, 
                width: `${Math.min(100, (radiationMsv / 1) * 100)}%`,
                backgroundColor: radiationColor 
              }} 
            />
          </div>
        </div>
      </div>

      <div style={styles.statusSection}>
        <h4 style={styles.statusTitle}>System Status</h4>
        <div style={styles.statusGrid}>
          <div style={styles.statusItem}>
            <div style={styles.statusLabel}>pH Control</div>
            <div style={{ 
              ...styles.statusIndicator, 
              backgroundColor: phColor === '#6bcf7f' ? '#6bcf7f' : '#ff6b6b' 
            }} />
          </div>
          <div style={styles.statusItem}>
            <div style={styles.statusLabel}>Nutrient System</div>
            <div style={{ 
              ...styles.statusIndicator, 
              backgroundColor: ecColor === '#6bcf7f' ? '#6bcf7f' : '#ff6b6b' 
            }} />
          </div>
          <div style={styles.statusItem}>
            <div style={styles.statusLabel}>Lighting</div>
            <div style={{ 
              ...styles.statusIndicator, 
              backgroundColor: lightColor === '#6bcf7f' ? '#6bcf7f' : '#ff6b6b' 
            }} />
          </div>
          <div style={styles.statusItem}>
            <div style={styles.statusLabel}>Radiation Shield</div>
            <div style={{ 
              ...styles.statusIndicator, 
              backgroundColor: radiationColor === '#6bcf7f' ? '#6bcf7f' : '#ff6b6b' 
            }} />
          </div>
        </div>
      </div>
    </div>
  );
};

const styles = {
  container: {
    backgroundColor: '#1e1e1e',
    borderRadius: '8px',
    padding: '20px',
    marginBottom: '20px',
    border: '1px solid #333',
  },
  title: {
    color: '#fff',
    marginBottom: '20px',
    fontSize: '1.1rem',
    fontWeight: '500',
  },
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(2, 1fr)',
    gap: '15px',
    marginBottom: '20px',
  },
  card: {
    backgroundColor: '#252525',
    borderRadius: '6px',
    padding: '15px',
    border: '1px solid #333',
  },
  cardHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '8px',
  },
  cardTitle: {
    color: '#ccc',
    fontSize: '0.9rem',
    fontWeight: '500',
  },
  cardValue: {
    fontSize: '1.2rem',
    fontWeight: '600',
  },
  cardSubtitle: {
    color: '#888',
    fontSize: '0.8rem',
    marginBottom: '10px',
  },
  progressBar: {
    height: '6px',
    backgroundColor: '#333',
    borderRadius: '3px',
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: '3px',
  },
  statusSection: {
    marginTop: '20px',
    paddingTop: '20px',
    borderTop: '1px solid #333',
  },
  statusTitle: {
    color: '#ccc',
    fontSize: '0.9rem',
    marginBottom: '15px',
    fontWeight: '500',
  },
  statusGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(2, 1fr)',
    gap: '15px',
  },
  statusItem: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  statusLabel: {
    color: '#ccc',
    fontSize: '0.85rem',
  },
  statusIndicator: {
    width: '10px',
    height: '10px',
    borderRadius: '50%',
  },
  noData: {
    color: '#888',
    textAlign: 'center',
    padding: '40px 0',
    fontStyle: 'italic',
  },
};

export default EnvironmentPanel;