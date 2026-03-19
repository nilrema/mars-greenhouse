import { describe, expect, it } from 'vitest';
import { buildChatResponse } from '../../amplify/functions/chatResponder/chatEngine';

describe('buildChatResponse', () => {
  it('returns structured agent messages and statuses for a valid request', () => {
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
    expect(response.messages.length).toBeGreaterThan(0);
    expect(response.messages[0]?.agentId).toBe('resource');
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
