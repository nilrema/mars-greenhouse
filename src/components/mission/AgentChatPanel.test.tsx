import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { AgentChatPanel } from './AgentChatPanel';
import type { AgentInteraction, AgentStatusCard, ChatMessage } from './types';

const agents: AgentStatusCard[] = [
  { id: 'environment', name: 'ENV_AGENT', role: 'Environment Control', icon: 'ENV', status: 'nominal', currentAction: 'Stable.' },
  { id: 'crop', name: 'CROP_AGENT', role: 'Crop Management', icon: 'CRP', status: 'nominal', currentAction: 'Stable.' },
  { id: 'astro', name: 'ASTRO_AGENT', role: 'Astronaut Welfare', icon: 'CREW', status: 'nominal', currentAction: 'Stable.' },
  { id: 'resource', name: 'RESOURCE_AGENT', role: 'Resource Management', icon: 'RSC', status: 'nominal', currentAction: 'Stable.' },
];

const messages: ChatMessage[] = [
  { id: 'system-1', role: 'system', author: 'system', agent: 'system', message: 'Mars greenhouse agents online.' },
  { id: 'user-1', role: 'user', author: 'operator', agent: 'user', message: 'How are the crops doing?' },
  {
    id: 'agent-1',
    role: 'agent',
    author: 'agent system',
    agent: 'orchestrator',
    message: '- Turn on the heating because the temperature is 16.00°C',
    toolCalls: [
      {
        id: 'turn_on_heater-1',
        type: 'turn_on_heater',
        label: 'Heater',
        summary: 'Turn on the heating because the temperature is 16.00°C',
        agent: 'environment',
      },
    ],
  },
];

const interactions: AgentInteraction[] = [
  { id: 'i-1', agent: 'orchestrator', message: 'Routing operator request.', status: 'complete', timestamp: Date.now() },
  { id: 'i-2', agent: 'crop', message: 'Checking crop stress.', status: 'active', timestamp: Date.now() + 1 },
];

describe('AgentChatPanel', () => {
  it('renders user and agent messages and submits new chat turns', async () => {
    const onSendMessage = vi.fn().mockResolvedValue(undefined);

    render(
      <AgentChatPanel
        agents={agents}
        interactions={interactions}
        messages={messages}
        isLoading={false}
        onSendMessage={onSendMessage}
      />
    );

    expect(screen.getByText('How are the crops doing?')).toBeInTheDocument();
    expect(screen.getByText('Turn on the heating because the temperature is 16.00°C')).toBeInTheDocument();
    expect(screen.getByText('Working')).toBeInTheDocument();

    fireEvent.change(screen.getByPlaceholderText(/greenhouse operations assessment/i), {
      target: { value: 'Power is dropping' },
    });
    fireEvent.click(screen.getByRole('button', { name: /Send/i }));

    await waitFor(() => {
      expect(onSendMessage).toHaveBeenCalledWith('Power is dropping');
    });
  });

  it('shows a loading state while the backend is responding', () => {
    render(
      <AgentChatPanel
        agents={agents}
        interactions={interactions}
        messages={messages}
        isLoading
        onSendMessage={vi.fn().mockResolvedValue(undefined)}
      />
    );

    expect(screen.getByText(/coordinating the next response/i)).toBeInTheDocument();
  });
});
