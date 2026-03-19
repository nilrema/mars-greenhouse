export interface ChatStep {
  agent: string;
  message: string;
}

export interface ChatResponsePayload {
  steps: ChatStep[];
  response: string;
}

export async function sendChatQuery(query: string): Promise<ChatResponsePayload> {
  const response = await fetch('/api/chat', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ query }),
  });

  const payload = (await response.json()) as Partial<ChatResponsePayload> & { error?: string };
  if (!response.ok) {
    throw new Error(payload.error || 'Chat request failed.');
  }

  return {
    steps: payload.steps ?? [],
    response: payload.response ?? 'No response received from the agent system.',
  };
}
