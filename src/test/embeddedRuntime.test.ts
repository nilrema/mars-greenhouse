import { describe, expect, it } from 'vitest';
import { buildEmbeddedRuntimeResponse } from '../../amplify/functions/chatResponder/embeddedRuntime';

describe('buildEmbeddedRuntimeResponse', () => {
  it('produces a coordinated multi-agent exchange with orchestrator synthesis', () => {
    const response = buildEmbeddedRuntimeResponse({
      message: 'We have low water recycling, lower power, and cold drift. Coordinate the agents and give me the plan.',
      context: {
        temperatureDrift: -7,
        waterRecycling: 54,
        powerAvailability: 60,
      },
    });

    expect(response.messages).toHaveLength(6);
    expect(response.messages[0]?.agentId).toBe('orchestrator');
    expect(response.messages[1]?.message).toContain('Request:');
    expect(response.messages[2]?.message).toMatch(/is setting the tempo for this cycle/);
    expect(response.messages[5]?.message).toContain('Course of action:');
    expect(response.messages[5]?.message).toContain('Success condition:');
    expect(response.messages[5]?.message).toMatch(/Water Pressure|Dust Storm \/ Power Constraint|Disease Suspicion/);
  });

  it('keeps a nominal conversation grounded without forcing a crisis scenario', () => {
    const response = buildEmbeddedRuntimeResponse({
      message: 'Give me a normal system status update.',
      context: {
        temperatureDrift: 0,
        waterRecycling: 98,
        powerAvailability: 96,
      },
    });

    expect(response.messages[0]?.message).toContain('Nominal Day');
    expect(response.messages.at(-1)?.message).toContain('Success condition:');
    expect(response.agentStatuses.every((status) => status.currentAction.length > 0)).toBe(true);
  });
});
