import { describe, expect, it } from 'vitest';
import { buildChatResponse } from '../../amplify/functions/chatResponder/chatEngine';

describe('buildChatResponse', () => {
  it('returns a full specialist coordination cycle and final orchestrator resolution', () => {
    const response = buildChatResponse({
      message: 'What is the water and power situation right now?',
      context: {
        temperatureDrift: -4,
        waterRecycling: 52,
        powerAvailability: 61,
      },
    });

    expect(response.conversationId).toMatch(/^conv-/);
    expect(response.requestId).toMatch(/^req-/);
    expect(response.messages).toHaveLength(6);
    expect(response.messages[0]?.agentId).toBe('orchestrator');
    expect(response.messages.at(-1)?.agentId).toBe('orchestrator');
    expect(response.messages.some((message) => message.agentId === 'environment')).toBe(true);
    expect(response.messages.some((message) => message.agentId === 'crop')).toBe(true);
    expect(response.messages.some((message) => message.agentId === 'astro')).toBe(true);
    expect(response.messages.some((message) => message.agentId === 'resource')).toBe(true);
    expect(response.messages.at(-1)?.message).toContain('Orchestrator resolution:');
    expect(response.agentStatuses.some((status) => status.id === 'orchestrator')).toBe(true);
  });

  it('rejects blank chat messages', () => {
    expect(() =>
      buildChatResponse({
        message: '   ',
      }),
    ).toThrow('Message is required.');
  });
});
