import { describe, expect, it, vi } from 'vitest';
import { sendChatQuery } from './chatApi';

describe('sendChatQuery', () => {
  it('posts the user query to the backend bridge and returns the parsed payload', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        steps: [{ agent: 'environment', message: 'Using environment_agent...' }],
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
      response: 'Stabilization started.',
    });
  });
});
