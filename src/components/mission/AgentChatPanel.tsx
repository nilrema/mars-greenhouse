import { FormEvent, useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import type { AgentStatusCard, ChatMessage } from './types';

const statusBg = {
  nominal: 'bg-success',
  warning: 'bg-warning',
  critical: 'bg-destructive',
};

function messageBubbleClass(message: ChatMessage) {
  if (message.role === 'user') {
    return 'ml-10 bg-primary text-primary-foreground border-primary/40';
  }

  if (message.role === 'system') {
    return 'mr-10 bg-muted/70 text-muted-foreground border-border';
  }

  return 'mr-6 bg-background/80 text-foreground border-border';
}

export function AgentChatPanel({
  agents,
  messages,
  isLoading,
  onSendMessage,
}: {
  agents: AgentStatusCard[];
  messages: ChatMessage[];
  isLoading: boolean;
  onSendMessage: (message: string) => Promise<void>;
}) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [draft, setDraft] = useState('');

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isLoading]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const nextMessage = draft.trim();
    if (!nextMessage || isLoading) {
      return;
    }

    setDraft('');
    await onSendMessage(nextMessage);
  }

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

      <div className="panel-header">Agent Chat</div>
      <div className="flex-1 overflow-hidden relative">
        <div ref={scrollRef} className="absolute inset-0 overflow-y-auto space-y-2 pr-1">
          <AnimatePresence>
            {messages.map((message) => (
              <div
                key={message.id}
                className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <motion.div
                  initial={{ opacity: 0, y: 10, scale: 0.97 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  transition={{ duration: 0.25, ease: [0.2, 0, 0, 1] }}
                  className={`max-w-[85%] rounded-md border px-3 py-2 ${messageBubbleClass(message)}`}
                >
                  <div className="flex items-center gap-1.5 mb-1">
                    <span className="text-[10px] font-semibold uppercase tracking-[0.14em]">
                      {message.author}
                    </span>
                  </div>
                  <div className="text-[11px] leading-relaxed whitespace-pre-wrap">{message.message}</div>
                </motion.div>
              </div>
            ))}
            {isLoading ? (
              <motion.div
                key="chat-loading"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex justify-start"
              >
                <div className="mr-10 rounded-md border border-border bg-muted/70 px-3 py-2 text-[11px] text-muted-foreground">
                  Orchestrator is thinking...
                </div>
              </motion.div>
            ) : null}
          </AnimatePresence>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="mt-3 flex items-center gap-2">
        <Input
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          placeholder="Ask the greenhouse agents..."
          className="h-9 text-xs"
        />
        <Button type="submit" size="sm" className="h-9 px-3 text-xs" disabled={isLoading || !draft.trim()}>
          Send
        </Button>
      </form>
    </div>
  );
}
