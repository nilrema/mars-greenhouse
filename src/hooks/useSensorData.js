import { useState, useEffect, useCallback } from 'react';
import { generateClient } from 'aws-amplify/data';

const client = generateClient();

/**
 * Hook for fetching and subscribing to sensor data
 * @param {string} greenhouseId - ID of the greenhouse
 * @param {number} pollInterval - Polling interval in milliseconds (default: 30000)
 * @returns {Object} - Sensor data and loading state
 */
export const useSensorData = (greenhouseId = 'mars-greenhouse-1', pollInterval = 30000) => {
  const [latestReading, setLatestReading] = useState(null);
  const [sensorHistory, setSensorHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Fetch latest sensor reading
  const fetchLatestReading = useCallback(async () => {
    try {
      setLoading(true);
      const { data, errors } = await client.models.SensorReading.list({
        filter: { greenhouseId: { eq: greenhouseId } },
        limit: 1,
        sortDirection: 'DESC',
      });

      if (errors) {
        throw new Error(errors[0]?.message || 'Failed to fetch sensor data');
      }

      if (data && data.length > 0) {
        setLatestReading(data[0]);
      }
      setError(null);
    } catch (err) {
      console.error('Error fetching sensor data:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [greenhouseId]);

  // Fetch sensor history
  const fetchSensorHistory = useCallback(async (hours = 24) => {
    try {
      const now = new Date();
      const startTime = new Date(now.getTime() - hours * 60 * 60 * 1000);

      const { data, errors } = await client.models.SensorReading.list({
        filter: {
          greenhouseId: { eq: greenhouseId },
          timestamp: { ge: startTime.toISOString() },
        },
        limit: 100,
        sortDirection: 'ASC',
      });

      if (errors) {
        throw new Error(errors[0]?.message || 'Failed to fetch sensor history');
      }

      if (data) {
        setSensorHistory(data);
      }
    } catch (err) {
      console.error('Error fetching sensor history:', err);
    }
  }, [greenhouseId]);

  // Subscribe to new sensor readings
  useEffect(() => {
    let subscription;

    const setupSubscription = () => {
      try {
        subscription = client.models.SensorReading.observeQuery({
          filter: { greenhouseId: { eq: greenhouseId } },
          limit: 10,
          sortDirection: 'DESC',
        }).subscribe({
          next: ({ items }) => {
            if (items && items.length > 0) {
              const latest = items[0];
              setLatestReading(prev => {
                // Only update if it's actually new data
                if (!prev || prev.id !== latest.id) {
                  return latest;
                }
                return prev;
              });
            }
          },
          error: (err) => {
            console.error('Sensor subscription error:', err);
            // Try to reconnect after delay
            setTimeout(setupSubscription, 5000);
          },
        });
      } catch (err) {
        console.error('Failed to setup sensor subscription:', err);
      }
    };

    setupSubscription();

    return () => {
      if (subscription) {
        subscription.unsubscribe();
      }
    };
  }, [greenhouseId]);

  // Poll for updates (fallback for subscription issues)
  useEffect(() => {
    fetchLatestReading();
    fetchSensorHistory(24);

    const intervalId = setInterval(() => {
      fetchLatestReading();
    }, pollInterval);

    return () => clearInterval(intervalId);
  }, [fetchLatestReading, fetchSensorHistory, pollInterval]);

  // Calculate sensor statistics
  const getSensorStatistics = useCallback((metric) => {
    if (!sensorHistory.length || !metric) return null;

    const values = sensorHistory
      .map(reading => reading[metric])
      .filter(value => value != null);

    if (values.length === 0) return null;

    return {
      current: values[values.length - 1],
      min: Math.min(...values),
      max: Math.max(...values),
      average: values.reduce((sum, val) => sum + val, 0) / values.length,
      trend: values.length >= 2 ? values[values.length - 1] - values[0] : 0,
    };
  }, [sensorHistory]);

  // Check if sensor value is within optimal range
  const checkSensorStatus = useCallback((metric, value, optimalRange) => {
    if (value == null) return 'UNKNOWN';

    const { min, max } = optimalRange;
    
    if (value < min * 0.9 || value > max * 1.1) return 'CRITICAL';
    if (value < min || value > max) return 'WARNING';
    return 'NORMAL';
  }, []);

  // Get sensor alerts
  const getSensorAlerts = useCallback((thresholds = {}) => {
    if (!latestReading) return [];

    const alerts = [];
    const now = new Date().toISOString();

    Object.entries(thresholds).forEach(([metric, range]) => {
      const value = latestReading[metric];
      if (value == null) return;

      const status = checkSensorStatus(metric, value, range);
      
      if (status === 'CRITICAL') {
        alerts.push({
          id: `sensor-${metric}-${now}`,
          severity: 'CRITICAL',
          message: `${metric} is critically ${value < range.min ? 'low' : 'high'}: ${value}${range.unit || ''}`,
          details: `Optimal range: ${range.min}-${range.max}${range.unit || ''}`,
          timestamp: now,
          metric,
          value,
        });
      } else if (status === 'WARNING') {
        alerts.push({
          id: `sensor-${metric}-${now}`,
          severity: 'WARNING',
          message: `${metric} is ${value < range.min ? 'low' : 'high'}: ${value}${range.unit || ''}`,
          details: `Optimal range: ${range.min}-${range.max}${range.unit || ''}`,
          timestamp: now,
          metric,
          value,
        });
      }
    });

    return alerts;
  }, [latestReading, checkSensorStatus]);

  return {
    latestReading,
    sensorHistory,
    loading,
    error,
    refetch: fetchLatestReading,
    getSensorStatistics,
    checkSensorStatus,
    getSensorAlerts,
    fetchSensorHistory,
  };
};

export default useSensorData;