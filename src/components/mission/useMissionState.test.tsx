import { act, renderHook } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

vi.mock('./chatApi', () => ({
  sendChatQuery: vi.fn().mockResolvedValue({
    steps: [{ agent: 'environment', message: 'Using environment_agent to evaluate climate and power stress.' }],
    response: 'Agent analysis complete.',
  }),
}));

import { useMissionState } from './useMissionState';

describe('useMissionState', () => {
  it('triggers the backend agent flow when a simulation is started', async () => {
    const { result } = renderHook(() => useMissionState());

    await act(async () => {
      await result.current.runSimulation({
        temperatureDrift: -8,
        waterRecycling: 60,
        powerAvailability: 30,
      });
    });

    expect(result.current.chatMessages.some((message) => message.author === 'simulation')).toBe(true);
    expect(result.current.chatMessages.some((message) => message.message.includes('Using environment_agent'))).toBe(true);
    expect(result.current.chatMessages.some((message) => message.message.includes('Agent analysis complete.'))).toBe(true);
  });
});
