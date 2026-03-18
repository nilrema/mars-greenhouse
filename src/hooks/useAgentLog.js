import { useState, useEffect, useCallback } from 'react';
import { generateClient } from 'aws-amplify/data';

const client = generateClient();

/**
 * Hook for subscribing to AgentEvent updates in real-time
 * @param {Object} options - Configuration options
 * @param {number} options.limit - Maximum number of events to fetch
 * @param {string} options.severityFilter - Filter by severity (INFO, WARN, CRITICAL)
 * @param {string} options.agentId - Filter by agent ID
 * @returns {Object} Agent log data and state
 */
export const useAgentLog = (options = {}) => {
  const {
    limit = 50,
    severityFilter,
    agentId,
    autoRefresh = true,
    pollInterval = 10000, // 10 seconds
  } = options;

  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [subscription, setSubscription] = useState(null);

  // Fetch initial events
  const fetchEvents = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      const filter = {};
      if (severityFilter) {
        filter.severity = { eq: severityFilter };
      }
      if (agentId) {
        filter.agentId = { eq: agentId };
      }

      const { data, errors } = await client.models.AgentEvent.list({
        filter,
        limit,
        sortDirection: 'DESC',
      });

      if (errors) {
        throw new Error(errors[0]?.message || 'Failed to fetch agent events');
      }

      setEvents(data || []);
    } catch (err) {
      console.error('Error fetching agent events:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [limit, severityFilter, agentId]);

  // Set up real-time subscription
  useEffect(() => {
    if (!autoRefresh) return;

    const setupSubscription = async () => {
      try {
        // Initial fetch
        await fetchEvents();

        // Set up subscription for real-time updates
        const sub = client.models.AgentEvent.observeQuery({
          filter: {
            ...(severityFilter && { severity: { eq: severityFilter } }),
            ...(agentId && { agentId: { eq: agentId } })
          },
          sortDirection: 'DESC',
          limit: 50,
        }).subscribe({
          next: ({ items }) => {
            setEvents(items);
          },
          error: (err) => {
            console.error('Subscription error:', err);
            setError('Failed to subscribe to agent events');
          }
        });

        setSubscription(sub);
      } catch (err) {
        console.error('Subscription setup error:', err);
        setError('Failed to set up real-time subscription');
      }
    };

    setupSubscription();

    // Set up polling as a fallback
    const pollInterval = setInterval(fetchEvents, pollInterval);

    return () => {
      if (subscription) {
        subscription.unsubscribe();
      }
      clearInterval(pollInterval);
    };
  }, [fetchEvents, severityFilter, agentId, autoRefresh, pollInterval]);

  // Manual refresh
  const refresh = useCallback(async () => {
    await fetchEvents();
  }, [fetchEvents]);

  // Filter events by severity
  const filterBySeverity = useCallback((severity) => {
    return events.filter(event => event.severity === severity);
  }, [events]);

  // Get events by agent
  const getEventsByAgent = useCallback((agentId) => {
    return events.filter(event => event.agentId === agentId);
  }, [events]);

  // Get events within time range
  const getEventsInRange = useCallback((startTime, endTime = new Date()) => {
    return events.filter(event => {
      const eventTime = new Date(event.timestamp);
      return eventTime >= startTime && eventTime <= endTime;
    });
  }, [events]);

  // Get event statistics
  const getStats = useCallback(() => {
    const stats = {
      total: events.length,
      bySeverity: {
        CRITICAL: events.filter(e => e.severity === 'CRITICAL').length,
        WARNING: events.filter(e => e.severity === 'WARNING').length,
        INFO: events.filter(e => e.severity === 'INFO').length,
      },
      byAgent: events.reduce((acc, event) => {
        acc[event.agentId] = (acc[event.agentId] || 0) + 1;
        return acc;
      }, {}),
    };
    return stats;
  }, [events]);

  // Get recent events (last 24 hours)
  const getRecentEvents = useCallback((hours = 24) => {
    const cutoff = new Date();
    cutoff.setHours(cutoff.getHours() - hours);
    return events.filter(event => new Date(event.timestamp) > cutoff);
  }, [events]);

  return {
    events,
    loading,
    error,
    refresh,
    filterBySeverity,
    getEventsByAgent: getEventsByAgent,
    getEventsInRange,
    getStats: getStats,
    getRecentEvents: getRecentEvents,
    stats: getStats(),
    recentEvents: getRecentEvents(),
  };
};

export default useAgentLog;