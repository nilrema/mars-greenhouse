import type { AgentToolCall } from './types';

export interface ChatStep {
  agent: string;
  message: string;
}

export interface ChatResponsePayload {
  steps: ChatStep[];
  response: string;
  toolCalls: AgentToolCall[];
}

export interface ChatQueryOptions {
  greenhouseId?: string;
  freshAfterTimestamp?: string;
  operatorTelemetry?: {
    timestamp: string;
    temperature: number;
    humidity: number;
    waterRecycling: number;
    powerAvailability: number;
    cropStressIndex: number;
    healthScore: number;
  };
}

export async function sendChatQuery(query: string, options: ChatQueryOptions = {}): Promise<ChatResponsePayload> {
  const response = await fetch('/api/chat', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      query,
      greenhouseId: options.greenhouseId,
      freshAfterTimestamp: options.freshAfterTimestamp,
      operatorTelemetry: options.operatorTelemetry,
    }),
  });

  const payload = (await response.json()) as Partial<ChatResponsePayload> & { error?: string };
  if (!response.ok) {
    throw new Error(payload.error || 'Chat request failed.');
  }

  return {
    steps: payload.steps ?? [],
    toolCalls: payload.toolCalls ?? [],
    response: payload.response ?? 'No response received from the agent system.',
  };
}
