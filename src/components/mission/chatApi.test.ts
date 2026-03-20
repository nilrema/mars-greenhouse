import { describe, expect, it, vi } from 'vitest';
import { sendChatQuery } from './chatApi';

describe('sendChatQuery', () => {
  it('posts the user query to the backend bridge and returns the parsed payload', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        steps: [{ agent: 'environment', message: 'Using environment_agent...' }],
        toolCalls: [{ id: 'turn_on_heater-1', type: 'turn_on_heater', label: 'Heater', summary: 'Turn on the heating', agent: 'environment' }],
        response: 'Stabilization started.',
      }),
    });
    vi.stubGlobal('fetch', fetchMock);

    const result = await sendChatQuery('Temperature is dropping');

    expect(fetchMock).toHaveBeenCalledWith('/api/chat', expect.objectContaining({
      method: 'POST',
    }));
    expect(result).toEqual({
      steps: [{ agent: 'environment', message: 'Using environment_agent...' }],
      toolCalls: [{ id: 'turn_on_heater-1', type: 'turn_on_heater', label: 'Heater', summary: 'Turn on the heating', agent: 'environment' }],
      response: 'Stabilization started.',
    });
  });

  it('includes operator telemetry when provided', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        steps: [],
        toolCalls: [],
        response: 'Stabilization started.',
      }),
    });
    vi.stubGlobal('fetch', fetchMock);

    await sendChatQuery('What is the current temperature?', {
      operatorTelemetry: {
        timestamp: '2026-03-20T10:01:00Z',
        temperature: 16,
        humidity: 62,
        waterRecycling: 60,
        powerAvailability: 30,
        cropStressIndex: 34,
        healthScore: 66,
      },
    });

    expect(fetchMock).toHaveBeenCalledWith('/api/chat', expect.objectContaining({
      body: JSON.stringify({
        query: 'What is the current temperature?',
        greenhouseId: undefined,
        freshAfterTimestamp: undefined,
        operatorTelemetry: {
          timestamp: '2026-03-20T10:01:00Z',
          temperature: 16,
          humidity: 62,
          waterRecycling: 60,
          powerAvailability: 30,
          cropStressIndex: 34,
          healthScore: 66,
        },
      }),
    }));
  });
});
