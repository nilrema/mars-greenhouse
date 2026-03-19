import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import Index from '@/pages/Index';

const submitChatMessageMock = vi.fn();

vi.mock('@/components/mission/chatApi', () => ({
  submitChatMessage: (...args: unknown[]) => submitChatMessageMock(...args),
}));

describe('chat integration', () => {
  beforeEach(() => {
    submitChatMessageMock.mockReset();
  });

  it('shows loading feedback and renders the backend response', async () => {
    let resolveRequest: ((value: unknown) => void) | undefined;

    submitChatMessageMock.mockImplementation(
      () =>
        new Promise((resolve) => {
          resolveRequest = resolve;
        }),
    );

    render(<Index />);

    fireEvent.change(screen.getByLabelText('Mission control chat input'), {
      target: { value: 'Give me a mission summary.' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Send' }));

    expect(screen.getByRole('button', { name: 'Sending…' })).toBeDisabled();
    expect(screen.getByText('Give me a mission summary.')).toBeInTheDocument();

    resolveRequest?.({
      conversationId: 'conv-123',
      requestId: 'req-123',
      agentStatuses: [
        {
          id: 'orchestrator',
          name: 'ORCH_AGENT',
          role: 'Mission Orchestration',
          icon: '🧭',
          status: 'nominal',
          currentAction: 'Coordinating specialist responses.',
        },
      ],
      messages: [
        {
          id: 'msg-1',
          agentId: 'orchestrator',
          agentName: 'ORCH_AGENT',
          agentRole: 'Mission Orchestration',
          severity: 'info',
          message: 'Mission summary ready from the backend.',
          timestamp: Date.now(),
        },
      ],
    });

    await waitFor(() => {
      expect(screen.getByText('Mission summary ready from the backend.')).toBeInTheDocument();
    });

    expect(screen.queryByText('Awaiting backend agent response…')).not.toBeInTheDocument();
  });

  it('keeps chat state intact when the backend request fails', async () => {
    submitChatMessageMock.mockRejectedValue(new Error('Mission control is temporarily unavailable.'));

    render(<Index />);

    fireEvent.change(screen.getByLabelText('Mission control chat input'), {
      target: { value: 'Do we have a problem?' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Send' }));

    await waitFor(() => {
      expect(screen.getByText('Mission control is temporarily unavailable.')).toBeInTheDocument();
    });

    expect(screen.getByText('Do we have a problem?')).toBeInTheDocument();
    expect(screen.getByText('Delivery failed')).toBeInTheDocument();
  });
});
