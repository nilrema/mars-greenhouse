import { beforeEach, describe, expect, it, vi } from 'vitest';

const spawnMock = vi.fn();

vi.mock('node:child_process', async (importOriginal) => {
  const actual = await importOriginal<typeof import('node:child_process')>();
  return {
    ...actual,
    spawn: (...args: unknown[]) => spawnMock(...args),
  };
});

describe('runChatRuntime', () => {
  beforeEach(() => {
    spawnMock.mockReset();
  });

  it('falls back to the embedded retained runtime when python executables are missing', async () => {
    spawnMock.mockImplementation(() => {
      const listeners = new Map<string, ((error?: Error | number) => void)[]>();
      queueMicrotask(() => {
        const error = new Error('spawn python ENOENT') as Error & { code: string };
        error.code = 'ENOENT';
        listeners.get('error')?.forEach((listener) => listener(error));
      });
      return {
        stdout: { on: vi.fn() },
        stderr: { on: vi.fn() },
        stdin: { end: vi.fn() },
        on: (event: string, listener: (value?: Error | number) => void) => {
          listeners.set(event, [...(listeners.get(event) ?? []), listener]);
        },
      };
    });

    const { runChatRuntime } = await import('../../amplify/functions/chatResponder/chatRuntimeBridge');
    const response = await runChatRuntime({
      message: 'Review the latest simulation change.',
      context: {
        temperatureDrift: -5,
        waterRecycling: 57,
        powerAvailability: 62,
      },
    });

    expect(response.messages[0]?.agentId).toBe('orchestrator');
    expect(response.messages.at(-1)?.message).toContain('Orchestrator resolution:');
    expect(response.agentStatuses.some((status) => status.id === 'environment')).toBe(true);
  });
});
