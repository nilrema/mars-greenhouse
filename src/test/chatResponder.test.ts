import { describe, expect, it, vi } from 'vitest';
import { buildChatResponse } from '../../amplify/functions/chatResponder/chatEngine';

const runChatRuntimeMock = vi.fn();

vi.mock('../../amplify/functions/chatResponder/chatRuntimeBridge', () => ({
  runChatRuntime: (...args: unknown[]) => runChatRuntimeMock(...args),
}));

describe('buildChatResponse', () => {
  it('delegates to the retained agent runtime bridge', async () => {
    runChatRuntimeMock.mockResolvedValue({
      conversationId: 'conv-123',
      requestId: 'req-123',
      agentStatuses: [
        {
          id: 'orchestrator',
          name: 'ORCH_AGENT',
          role: 'Mission Orchestration',
          icon: '🧭',
          status: 'warning',
          currentAction: 'Protect the most mature crop lanes first',
        },
      ],
      messages: [
        {
          id: 'msg-1',
          agentId: 'orchestrator',
          agentName: 'ORCH_AGENT',
          agentRole: 'Mission Orchestration',
          severity: 'warning',
          message: 'Orchestrator resolution: retained runtime complete.',
          timestamp: Date.now(),
        },
      ],
    });

    const response = await buildChatResponse({
      message: 'What is the water and power situation right now?',
      context: {
        temperatureDrift: -4,
        waterRecycling: 52,
        powerAvailability: 61,
      },
    });

    expect(runChatRuntimeMock).toHaveBeenCalledWith({
      message: 'What is the water and power situation right now?',
      context: {
        temperatureDrift: -4,
        waterRecycling: 52,
        powerAvailability: 61,
      },
    });
    expect(response.conversationId).toBe('conv-123');
    expect(response.messages.at(-1)?.agentId).toBe('orchestrator');
    expect(response.messages.at(-1)?.message).toContain('Orchestrator resolution:');
  });

  it('rejects blank chat messages', async () => {
    await expect(() =>
      buildChatResponse({
        message: '   ',
      }),
    ).rejects.toThrow('Message is required.');
  });

  it('accepts null optional GraphQL arguments from AppSync', async () => {
    runChatRuntimeMock.mockResolvedValue({
      conversationId: 'conv-null',
      requestId: 'req-null',
      agentStatuses: [],
      messages: [
        {
          id: 'msg-null',
          agentId: 'orchestrator',
          agentName: 'ORCH_AGENT',
          agentRole: 'Mission Orchestration',
          severity: 'success',
          message: 'Orchestrator resolution: nominal status update.',
          timestamp: Date.now(),
        },
      ],
    });

    const response = await buildChatResponse({
      conversationId: null,
      context: null,
      message: 'Give me a nominal status update.',
    });

    expect(runChatRuntimeMock).toHaveBeenCalledWith({
      conversationId: null,
      context: null,
      message: 'Give me a nominal status update.',
    });
    expect(response.messages.at(-1)?.message).toContain('Orchestrator resolution:');
  });
});
