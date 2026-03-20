import { act, renderHook } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

const { sendChatQueryMock } = vi.hoisted(() => ({
  sendChatQueryMock: vi.fn().mockResolvedValue({
    steps: [{ agent: 'environment', message: 'Using environment_agent to evaluate climate and power stress.' }],
    toolCalls: [
      {
        id: 'turn_on_heater-1',
        type: 'turn_on_heater',
        label: 'Heater',
        summary: 'Turn on the heating because the temperature is 16.00°C',
        agent: 'environment',
        metadata: { targetTemperature: 22 },
      },
    ],
    response: '- Turn on the heating because the temperature is 16.00°C',
  }),
}));

vi.mock('./chatApi', () => ({
  sendChatQuery: sendChatQueryMock,
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
  it('deduplicates rail tiles by tool type and skips operator action tiles', async () => {
    sendChatQueryMock.mockResolvedValueOnce({
      steps: [{ agent: 'environment', message: 'Using environment_agent to evaluate climate and power stress.' }],
      toolCalls: [
        {
          id: 'turn_on_heater-1',
          type: 'turn_on_heater',
          label: 'Heater',
          summary: 'Turn on the heating because the temperature is 16.00°C',
          agent: 'environment',
          metadata: { targetTemperature: 22 },
        },
        {
          id: 'operator_action-2',
          type: 'operator_action',
          label: 'Action',
          summary: 'Harvest the lettuce now',
          agent: 'orchestrator',
          metadata: {},
        },
        {
          id: 'turn_on_heater-3',
          type: 'turn_on_heater',
          label: 'Heater',
          summary: 'Turn on the heating because the temperature is 15.40°C',
          agent: 'environment',
          metadata: { targetTemperature: 22 },
        },
      ],
      response: '- Turn on the heating because the temperature is 15.40°C\n- Harvest the lettuce now',
    });

    const { result } = renderHook(() => useMissionState());

    await act(async () => {
      await result.current.sendChatMessage('Temperature is dropping in the simulation.');
    });

    expect(result.current.agentInteractions.map((interaction) => interaction.agent)).toEqual(['environment']);
    expect(result.current.toolCallTiles).toHaveLength(1);
    expect(result.current.toolCallTiles[0].type).toBe('turn_on_heater');
    expect(result.current.toolCallTiles[0].summary).toContain('15.40');
  });

  it('applies tool-call-driven state changes gradually after a simulation response', async () => {
    vi.useFakeTimers();
    const { result } = renderHook(() => useMissionState());

    await act(async () => {
      const simulationPromise = result.current.runSimulation({
        temperature: 16,
        waterRecycling: 60,
        powerAvailability: 30,
      });
      await vi.advanceTimersByTimeAsync(1);
      await simulationPromise;
    });

    expect(result.current.toolCallTiles.some((tile) => tile.type === 'turn_on_heater')).toBe(true);
    expect(result.current.chatMessages.some((message) => message.toolCalls?.[0]?.type === 'turn_on_heater')).toBe(true);

    const initialTemperature = result.current.base.environment.temperature;

    await act(async () => {
      await vi.advanceTimersByTimeAsync(160);
    });

    expect(result.current.base.environment.temperature).toBeGreaterThan(initialTemperature);
    vi.useRealTimers();
  });

  it('uses the live animated telemetry values for follow-up agent requests', async () => {
    vi.useFakeTimers();
    const { result } = renderHook(() => useMissionState());

    await act(async () => {
      const simulationPromise = result.current.runSimulation({
        temperature: 16,
        waterRecycling: 60,
        powerAvailability: 30,
      });
      await vi.advanceTimersByTimeAsync(1);
      await simulationPromise;
    });

    await act(async () => {
      await vi.advanceTimersByTimeAsync(160);
    });

    const liveTemperature = result.current.base.environment.temperature;
    const liveWaterRecycling = result.current.base.environment.water;
    const livePowerAvailability = result.current.base.environment.light;

    await act(async () => {
      await result.current.sendChatMessage('What should we do next?');
    });

    expect(sendChatQueryMock).toHaveBeenLastCalledWith(
      'What should we do next?',
      expect.objectContaining({
        operatorTelemetry: expect.objectContaining({
          temperature: liveTemperature,
          humidity: result.current.base.environment.humidity,
          waterRecycling: liveWaterRecycling,
          powerAvailability: livePowerAvailability,
          cropStressIndex: expect.any(Number),
          healthScore: expect.any(Number),
        }),
      })
    );

    vi.useRealTimers();
  });

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
    expect(result.current.chatMessages.some((message) => message.toolCalls?.[0]?.type === 'turn_on_heater')).toBe(true);
    expect(sendChatQueryMock).toHaveBeenCalledWith(
      expect.stringContaining('Temperature: 16°C'),
      expect.objectContaining({
        operatorTelemetry: {
          timestamp: expect.any(String),
          temperature: 16,
          humidity: expect.any(Number),
          waterRecycling: 60,
          powerAvailability: 30,
          cropStressIndex: expect.any(Number),
          healthScore: expect.any(Number),
        },
      })
    );
  });
});
