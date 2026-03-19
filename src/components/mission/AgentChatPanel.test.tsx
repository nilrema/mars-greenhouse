import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { AgentChatPanel } from './AgentChatPanel';
import type { AgentStatusCard, ChatMessage } from './types';

const agents: AgentStatusCard[] = [
  { id: 'environment', name: 'ENV_AGENT', role: 'Environment Control', icon: '🌡️', status: 'nominal', currentAction: 'Stable.' },
  { id: 'crop', name: 'CROP_AGENT', role: 'Crop Management', icon: '🌱', status: 'nominal', currentAction: 'Stable.' },
  { id: 'astro', name: 'ASTRO_AGENT', role: 'Astronaut Welfare', icon: '🧑‍🚀', status: 'nominal', currentAction: 'Stable.' },
  { id: 'resource', name: 'RESOURCE_AGENT', role: 'Resource Management', icon: '⚡', status: 'nominal', currentAction: 'Stable.' },
];

const messages: ChatMessage[] = [
  { id: 'system-1', role: 'system', author: 'system', agent: 'system', message: 'Mars greenhouse agents online.' },
  { id: 'user-1', role: 'user', author: 'operator', agent: 'user', message: 'How are the crops doing?' },
  { id: 'agent-1', role: 'agent', author: 'agent system', agent: 'orchestrator', message: 'Crop conditions are stable.' },
];

describe('AgentChatPanel', () => {
  it('renders user and agent messages and submits new chat turns', async () => {
    const onSendMessage = vi.fn().mockResolvedValue(undefined);

    render(
      <AgentChatPanel
        agents={agents}
        messages={messages}
        isLoading={false}
        onSendMessage={onSendMessage}
      />
    );

    expect(screen.getByText('How are the crops doing?')).toBeInTheDocument();
    expect(screen.getByText('Crop conditions are stable.')).toBeInTheDocument();

    fireEvent.change(screen.getByPlaceholderText(/Ask the greenhouse agents/i), {
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
        messages={messages}
        isLoading
        onSendMessage={vi.fn().mockResolvedValue(undefined)}
      />
    );

    expect(screen.getByText(/Orchestrator is thinking/i)).toBeInTheDocument();
  });
});
