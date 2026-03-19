import { FormEvent, KeyboardEvent, useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { AgentStatusCard, ConversationMessage } from './types';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';

const logBorderColor = {
  info: 'border-l-primary',
  warning: 'border-l-warning',
  critical: 'border-l-destructive',
  success: 'border-l-success',
};

const logBgColor = {
  info: 'bg-primary/5',
  warning: 'bg-warning/5',
  critical: 'bg-destructive/5',
  success: 'bg-success/5',
};

const statusBg = {
  nominal: 'bg-success',
  warning: 'bg-warning',
  critical: 'bg-destructive',
};

interface AgentChatPanelProps {
  agents: AgentStatusCard[];
  messages: ConversationMessage[];
  isSendingMessage: boolean;
  errorMessage: string | null;
  onSendMessage: (message: string) => Promise<void>;
}

export function AgentChatPanel({
  agents,
  messages,
  isSendingMessage,
  errorMessage,
  onSendMessage,
}: AgentChatPanelProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [draft, setDraft] = useState('');

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSubmit = async (event?: FormEvent) => {
    event?.preventDefault();

    if (!draft.trim() || isSendingMessage) {
      return;
    }

    const nextDraft = draft;
    setDraft('');
    await onSendMessage(nextDraft);
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      void handleSubmit();
    }
  };

  return (
    <div className="panel h-full flex flex-col">
      <div className="panel-header">Resilient Agent System</div>

      <div className="flex flex-wrap gap-1.5 mb-3">
        {agents.map((agent) => (
          <div key={agent.id} className="flex items-center gap-1.5 px-2 py-1 border border-border rounded bg-background/50 text-[10px]">
            <div className={`status-led ${statusBg[agent.status]}`} />
            <span className="font-medium text-foreground">{agent.icon}</span>
            <span className="text-muted-foreground">{agent.name}</span>
          </div>
        ))}
      </div>

      <div className="panel-header">Agent Communication Feed</div>
      <div className="flex-1 overflow-hidden relative min-h-0">
        <div ref={scrollRef} className="absolute inset-0 overflow-y-auto space-y-2 pr-1">
          <AnimatePresence>
            {messages.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-center">
                <div className="text-[28px] mb-2">🛡️</div>
                <div className="text-[11px] text-muted-foreground mb-1">All systems nominal</div>
                <div className="text-[10px] text-muted-foreground/50">
                  Start a simulation or ask mission control for a live response
                </div>
              </div>
            ) : (
              messages.map((message, index) => (
                <motion.div
                  key={`${message.id}-${index}`}
                  initial={{ opacity: 0, y: 10, scale: 0.97 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  transition={{ duration: 0.25, ease: [0.2, 0, 0, 1] }}
                  className={
                    message.source === 'user'
                      ? 'ml-8 rounded-md bg-primary/10 border border-primary/20 p-2.5'
                      : `mr-4 border-l-3 ${logBorderColor[message.type]} ${logBgColor[message.type]} rounded-r-md p-2.5`
                  }
                  style={message.source === 'user' ? undefined : { borderLeftWidth: '3px' }}
                >
                  <div className="flex items-center gap-1.5 mb-1">
                    <span className="text-[10px] font-semibold text-primary">
                      {message.source === 'user' ? 'OPERATOR' : message.agentName || message.agent?.toUpperCase()}
                    </span>
                    {message.source !== 'user' && (
                      <>
                        <span className="text-[9px] text-muted-foreground/50">·</span>
                        <span className="text-[9px] text-muted-foreground/50">
                          {message.type === 'critical'
                            ? '🔴'
                            : message.type === 'warning'
                              ? '🟡'
                              : message.type === 'success'
                                ? '🟢'
                                : '🔵'}{' '}
                          {message.type.toUpperCase()}
                        </span>
                      </>
                    )}
                    {message.pending && <span className="text-[9px] text-muted-foreground/70">Sending…</span>}
                    {message.failed && <span className="text-[9px] text-destructive">Delivery failed</span>}
                  </div>
                  {message.agentRole && message.source !== 'user' && (
                    <div className="text-[9px] uppercase tracking-[0.18em] text-muted-foreground/70 mb-1">
                      {message.agentRole}
                    </div>
                  )}
                  <div className="text-[11px] text-foreground leading-relaxed">{message.message}</div>
                </motion.div>
              ))
            )}
          </AnimatePresence>
        </div>
      </div>

      <form className="mt-3 border-t border-border pt-3 space-y-2" onSubmit={(event) => void handleSubmit(event)}>
        <Textarea
          aria-label="Mission control chat input"
          className="min-h-[92px] resize-none bg-background/60 text-[12px]"
          disabled={isSendingMessage}
          onChange={(event) => setDraft(event.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Ask the greenhouse agents for status, mitigation, or next steps..."
          value={draft}
        />
        <div className="flex items-center justify-between gap-2">
          <div className="text-[10px] text-muted-foreground">
            {isSendingMessage ? 'Awaiting backend agent response…' : 'Enter to send, Shift+Enter for a new line'}
          </div>
          <Button disabled={isSendingMessage || !draft.trim()} size="sm" type="submit">
            {isSendingMessage ? 'Sending…' : 'Send'}
          </Button>
        </div>
        {errorMessage && <div className="text-[10px] text-destructive">{errorMessage}</div>}
      </form>
    </div>
  );
}
