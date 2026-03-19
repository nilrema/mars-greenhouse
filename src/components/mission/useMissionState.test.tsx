import { act, renderHook } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

vi.mock('./chatApi', () => ({
  sendChatQuery: vi.fn().mockResolvedValue({
    steps: [{ agent: 'environment', message: 'Using environment_agent to evaluate climate and power stress.' }],
    response: 'Agent analysis complete.',
  }),
}));

vi.mock('./telemetryApi', () => ({
  GREENHOUSE_ID: 'mars-greenhouse-1',
  createSensorReading: vi.fn().mockResolvedValue({}),
  createUiInputEvent: vi.fn().mockResolvedValue({}),
  fetchLatestSensorReading: vi.fn().mockResolvedValue({
    greenhouseId: 'mars-greenhouse-1',
    timestamp: new Date().toISOString(),
    temperature: 24,
    recycleRatePercent: 100,
    powerKw: 9.2,
  }),
  waitForSensorFreshness: vi.fn().mockImplementation(async ({ freshAfterTimestamp }: { freshAfterTimestamp: string }) => ({
    greenhouseId: 'mars-greenhouse-1',
    timestamp: freshAfterTimestamp,
    temperature: 16,
    recycleRatePercent: 60,
    powerKw: 2.76,
  })),
}));

import { useMissionState } from './useMissionState';

describe('useMissionState', () => {
  it('triggers the backend agent flow when a simulation is started', async () => {
    const { result } = renderHook(() => useMissionState());

    await act(async () => {
      await result.current.runSimulation({
          temperature: 16,
        waterRecycling: 60,
        powerAvailability: 30,
      });
    });

    expect(result.current.chatMessages.some((message) => message.author === 'simulation')).toBe(true);
    expect(result.current.chatMessages.some((message) => message.message.includes('Using environment_agent'))).toBe(true);
    expect(result.current.chatMessages.some((message) => message.message.includes('Agent analysis complete.'))).toBe(true);
  });
});
