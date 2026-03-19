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
    return 'ml-10 bg-primary text-primary-foreground border-primary/35';
  }

  if (message.role === 'system') {
    return 'mr-10 bg-slate-900 text-slate-300 border-slate-800/30';
  }

  return 'mr-6 bg-slate-50/88 text-foreground border-border';
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
      <div className="mb-3">
        <div className="panel-header mb-1">Agent Coordination</div>
        <div className="text-[12px] text-muted-foreground">Operational briefings and specialist reasoning across the greenhouse stack.</div>
      </div>

      <div className="mb-4 flex flex-wrap gap-2">
        {agents.map((agent) => (
          <div key={agent.id} className="flex items-center gap-2 rounded-full border border-slate-800/10 bg-slate-900 px-3 py-2 text-[11px] shadow-[0_10px_20px_rgba(15,23,42,0.12)]">
            <div className={`status-led ${statusBg[agent.status]}`} />
            <span className="inline-flex h-6 min-w-6 items-center justify-center rounded-full bg-white/10 px-1.5 font-mono text-[10px] font-semibold text-white">
              {agent.icon}
            </span>
            <span className="text-slate-300">{agent.name}</span>
          </div>
        ))}
      </div>

      <div className="panel-header">Operations Feed</div>
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
                  className={`max-w-[85%] rounded-2xl border px-3.5 py-3 shadow-[0_10px_24px_rgba(38,60,45,0.05)] ${messageBubbleClass(message)}`}
                >
                  <div className="mb-1 flex items-center gap-1.5">
                    <span className="text-[11px] font-semibold uppercase tracking-[0.16em]">
                      {message.author}
                    </span>
                  </div>
                  <div className="text-[13px] leading-relaxed whitespace-pre-wrap">{message.message}</div>
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
                <div className="mr-10 rounded-2xl border border-slate-800/30 bg-slate-900 px-3.5 py-3 text-[13px] text-slate-300">
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
          placeholder="Ask for a greenhouse operations assessment..."
          className="h-12 rounded-full border-slate-300/80 bg-slate-50/85 px-4 text-[13px]"
        />
        <Button type="submit" size="sm" className="h-12 rounded-full px-4 text-[11px] font-semibold uppercase tracking-[0.14em]" disabled={isLoading || !draft.trim()}>
          Send
        </Button>
      </form>
    </div>
  );
}
