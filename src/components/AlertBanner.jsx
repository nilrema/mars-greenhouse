import React, { useState, useEffect } from 'react';

const AlertBanner = ({ alerts = [], onDismiss }) => {
  const [visibleAlerts, setVisibleAlerts] = useState(alerts);

  useEffect(() => {
    setVisibleAlerts(alerts);
  }, [alerts]);

  const handleDismiss = (alertId) => {
    setVisibleAlerts(prev => prev.filter(alert => alert.id !== alertId));
    if (onDismiss) {
      onDismiss(alertId);
    }
  };

  if (visibleAlerts.length === 0) {
    return null;
  }

  // Sort alerts by severity: CRITICAL > WARNING > INFO
  const sortedAlerts = [...visibleAlerts].sort((a, b) => {
    const severityOrder = { CRITICAL: 3, WARNING: 2, INFO: 1 };
    return (severityOrder[b.severity] || 0) - (severityOrder[a.severity] || 0);
  });

  // Get the highest severity for banner color
  const highestSeverity = sortedAlerts[0]?.severity || 'INFO';

  const getSeverityColor = (severity) => {
    switch (severity) {
      case 'CRITICAL':
        return '#dc3545';
      case 'WARNING':
        return '#ffc107';
      case 'INFO':
        return '#17a2b8';
      default:
        return '#6c757d';
    }
  };

  const getSeverityIcon = (severity) => {
    switch (severity) {
      case 'CRITICAL':
        return '⚠️';
      case 'WARNING':
        return '⚠️';
      case 'INFO':
        return 'ℹ️';
      default:
        return '📋';
    }
  };

  const bannerColor = getSeverityColor(highestSeverity);

  return (
    <div style={{ ...styles.container, borderLeftColor: bannerColor }}>
      <div style={styles.header}>
        <div style={styles.titleSection}>
          <span style={styles.icon}>{getSeverityIcon(highestSeverity)}</span>
          <h3 style={styles.title}>
            {visibleAlerts.length} Alert{visibleAlerts.length !== 1 ? 's' : ''}
          </h3>
          {highestSeverity === 'CRITICAL' && (
            <span style={styles.criticalBadge}>CRITICAL</span>
          )}
        </div>
        {visibleAlerts.length > 1 && (
          <div style={styles.countBadge}>
            {visibleAlerts.length}
          </div>
        )}
      </div>

      <div style={styles.alertsList}>
        {sortedAlerts.map((alert) => (
          <div 
            key={alert.id} 
            style={{ 
              ...styles.alertItem,
              borderLeftColor: getSeverityColor(alert.severity)
            }}
          >
            <div style={styles.alertHeader}>
              <span style={styles.alertSeverity}>
                {getSeverityIcon(alert.severity)} {alert.severity}
              </span>
              <span style={styles.alertTime}>
                {alert.timestamp ? new Date(alert.timestamp).toLocaleTimeString() : 'Just now'}
              </span>
            </div>
            <div style={styles.alertMessage}>{alert.message}</div>
            {alert.details && (
              <div style={styles.alertDetails}>{alert.details}</div>
            )}
            {alert.action && (
              <div style={styles.alertAction}>
                <strong>Action:</strong> {alert.action}
              </div>
            )}
            <button
              onClick={() => handleDismiss(alert.id)}
              style={styles.dismissButton}
              aria-label="Dismiss alert"
            >
              ×
            </button>
          </div>
        ))}
      </div>

      {visibleAlerts.length > 3 && (
        <div style={styles.footer}>
          <span style={styles.moreAlerts}>
            +{visibleAlerts.length - 3} more alert{visibleAlerts.length - 3 !== 1 ? 's' : ''}
          </span>
        </div>
      )}
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
    borderLeftWidth: '4px',
    borderLeftStyle: 'solid',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '15px',
  },
  titleSection: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
  },
  icon: {
    fontSize: '1.2rem',
  },
  title: {
    color: '#fff',
    margin: 0,
    fontSize: '1.1rem',
    fontWeight: '500',
  },
  criticalBadge: {
    backgroundColor: '#dc3545',
    color: '#fff',
    padding: '2px 8px',
    borderRadius: '12px',
    fontSize: '0.7rem',
    fontWeight: 'bold',
    textTransform: 'uppercase',
  },
  countBadge: {
    backgroundColor: '#333',
    color: '#ccc',
    padding: '4px 10px',
    borderRadius: '12px',
    fontSize: '0.8rem',
    fontWeight: 'bold',
  },
  alertsList: {
    maxHeight: '300px',
    overflowY: 'auto',
  },
  alertItem: {
    backgroundColor: '#252525',
    borderRadius: '6px',
    padding: '15px',
    marginBottom: '10px',
    border: '1px solid #333',
    borderLeftWidth: '3px',
    borderLeftStyle: 'solid',
    position: 'relative',
  },
  alertHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '8px',
  },
  alertSeverity: {
    color: '#fff',
    fontSize: '0.85rem',
    fontWeight: '500',
  },
  alertTime: {
    color: '#888',
    fontSize: '0.8rem',
  },
  alertMessage: {
    color: '#ccc',
    fontSize: '0.9rem',
    marginBottom: '5px',
  },
  alertDetails: {
    color: '#aaa',
    fontSize: '0.85rem',
    marginTop: '5px',
    fontStyle: 'italic',
  },
  alertAction: {
    color: '#6bcf7f',
    fontSize: '0.85rem',
    marginTop: '8px',
    padding: '5px 10px',
    backgroundColor: 'rgba(107, 207, 127, 0.1)',
    borderRadius: '4px',
    borderLeft: '2px solid #6bcf7f',
  },
  dismissButton: {
    position: 'absolute',
    top: '10px',
    right: '10px',
    background: 'none',
    border: 'none',
    color: '#888',
    fontSize: '1.2rem',
    cursor: 'pointer',
    padding: '0',
    width: '20px',
    height: '20px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: '50%',
  },
  footer: {
    marginTop: '15px',
    paddingTop: '15px',
    borderTop: '1px solid #333',
    textAlign: 'center',
  },
  moreAlerts: {
    color: '#888',
    fontSize: '0.85rem',
    cursor: 'pointer',
  },
  noData: {
    color: '#888',
    textAlign: 'center',
    padding: '20px 0',
    fontStyle: 'italic',
  },
};

export default AlertBanner;