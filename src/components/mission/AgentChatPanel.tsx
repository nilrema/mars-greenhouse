import { FormEvent, useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { SendHorizonal } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { ChatMarkdown } from './ChatMarkdown';
import type { AgentInteraction, AgentStatusCard, ChatMessage } from './types';

const statusBg = {
  nominal: 'bg-success',
  warning: 'bg-warning',
  critical: 'bg-destructive',
};

const agentCapabilityMap: Record<AgentStatusCard['id'], { summary: string; capabilities: string[] }> = {
  environment: {
    summary: 'Monitors greenhouse climate stability and recommends fast recovery actions when temperature, humidity, airflow, or power conditions drift.',
    capabilities: [
      'Temperature and humidity stabilization',
      'Ventilation and lighting control guidance',
      'Power-stress awareness for climate systems',
    ],
  },
  crop: {
    summary: 'Assesses crop health, harvest timing, and production risk using the latest greenhouse telemetry and crop state.',
    capabilities: [
      'Crop stress and yield impact assessment',
      'Harvest and growth-stage interpretation',
      'Plant-health prioritization under adverse conditions',
    ],
  },
  astro: {
    summary: 'Translates greenhouse disruptions into crew-facing effects such as food availability, nutrition pressure, and operational workload.',
    capabilities: [
      'Crew nutrition and food-security impact',
      'Workload and human-operations interpretation',
      'Astronaut welfare tradeoff analysis',
    ],
  },
  resource: {
    summary: 'Focuses on water recycling, power allocation, and operational tradeoffs needed to protect the greenhouse under scarce-resource conditions.',
    capabilities: [
      'Water recycling and reserve management',
      'Power allocation and consumption tradeoffs',
      'Resource-protection mitigation planning',
    ],
  },
  orchestrator: {
    summary: 'Routes operator questions, coordinates specialists, and assembles the final control-room response.',
    capabilities: [
      'Question routing across specialists',
      'Multi-agent coordination',
      'Final response synthesis',
    ],
  },
};

function messageBubbleClass(message: ChatMessage) {
  if (message.role === 'user') {
    return 'ml-10 bg-[linear-gradient(135deg,rgba(20,83,45,0.95),rgba(17,94,89,0.92))] text-white border-emerald-800/20';
  }

  if (message.role === 'system') {
    return 'mr-10 bg-[linear-gradient(180deg,rgba(15,23,42,0.96),rgba(30,41,59,0.92))] text-slate-200 border-slate-700/30';
  }

  return 'mr-4 border-emerald-900/10 bg-white/88 text-foreground';
}

function authorLabel(message: ChatMessage) {
  if (message.role === 'user') return 'Operator';
  if (message.role === 'agent') return 'Agent System';
  return message.author;
}

function compactAgentName(agent: AgentStatusCard) {
  return agent.name.replace('_AGENT', '');
}

function activeAgentIds(interactions: AgentInteraction[]) {
  return new Set(
    interactions
      .filter((interaction) => interaction.agent !== 'orchestrator' && interaction.status !== 'complete')
      .map((interaction) => interaction.agent)
  );
}

export function AgentChatPanel({
  agents,
  interactions,
  messages,
  isLoading,
  onSendMessage,
}: {
  agents: AgentStatusCard[];
  interactions: AgentInteraction[];
  messages: ChatMessage[];
  isLoading: boolean;
  onSendMessage: (message: string) => Promise<void>;
}) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [draft, setDraft] = useState('');
  const workingAgents = activeAgentIds(interactions);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, interactions, isLoading]);

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
    <div className="panel relative h-full overflow-hidden border-white/40 bg-[linear-gradient(180deg,rgba(255,255,255,0.9),rgba(244,248,245,0.86))] p-0">
      <div className="absolute inset-0 pointer-events-none bg-[radial-gradient(circle_at_top_right,rgba(16,185,129,0.14),transparent_28%),radial-gradient(circle_at_bottom_left,rgba(14,116,144,0.12),transparent_32%)]" />

      <div className="relative flex h-full flex-col">
        <div className="border-b border-white/60 px-4 pb-3 pt-3">
          <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
            {agents.map((agent) => (
              <Dialog key={agent.id}>
                <DialogTrigger asChild>
                  <button
                    type="button"
                    className={cn(
                      'relative flex min-w-0 items-center gap-2 rounded-2xl border px-3 py-2 text-left text-[11px] transition-transform duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-300/50',
                      workingAgents.has(agent.id)
                        ? 'border-emerald-300/70 bg-[linear-gradient(180deg,rgba(6,95,70,0.98),rgba(15,118,110,0.94))] shadow-[0_0_0_1px_rgba(110,231,183,0.35),0_18px_34px_rgba(5,46,22,0.28)] hover:-translate-y-0.5'
                        : 'border-white/50 bg-[linear-gradient(180deg,rgba(17,24,39,0.95),rgba(30,41,59,0.9))] shadow-[0_14px_30px_rgba(15,23,42,0.16)] hover:-translate-y-0.5 hover:border-emerald-300/30'
                    )}
                    data-working={workingAgents.has(agent.id) ? 'true' : 'false'}
                  >
                    {workingAgents.has(agent.id) ? (
                      <motion.div
                        className="absolute inset-0 rounded-2xl border border-emerald-200/60"
                        animate={{ opacity: [0.95, 0.35, 0.95] }}
                        transition={{ duration: 1.2, repeat: Infinity }}
                      />
                    ) : null}
                    <div className={`status-led ${statusBg[agent.status]}`} />
                    <span
                      className={cn(
                        'inline-flex h-7 min-w-7 items-center justify-center rounded-full px-1.5 font-mono text-[10px] font-semibold text-white',
                        workingAgents.has(agent.id)
                          ? 'border border-emerald-100/50 bg-white/20 shadow-[0_0_16px_rgba(110,231,183,0.28)]'
                          : 'border border-white/10 bg-white/10'
                      )}
                    >
                      {agent.icon}
                    </span>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <div className="truncate text-[10px] font-semibold uppercase tracking-[0.16em] text-white/90">
                          {compactAgentName(agent)}
                        </div>
                        {workingAgents.has(agent.id) ? (
                          <span className="rounded-full border border-emerald-100/45 bg-white/20 px-1.5 py-px text-[7px] font-semibold uppercase tracking-[0.14em] text-emerald-50">
                            Working
                          </span>
                        ) : null}
                      </div>
                      <div className={cn('truncate text-[10px]', workingAgents.has(agent.id) ? 'text-emerald-50/90' : 'text-slate-300')}>
                        {agent.currentAction}
                      </div>
                    </div>
                  </button>
                </DialogTrigger>
                <DialogContent className="border-white/40 bg-[linear-gradient(180deg,rgba(255,255,255,0.97),rgba(244,248,245,0.95))] sm:max-w-[460px]">
                  <DialogHeader>
                    <div className="inline-flex w-fit items-center gap-2 rounded-full border border-emerald-900/10 bg-emerald-900/5 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-emerald-900/70">
                      <span className={`status-led ${statusBg[agent.status]}`} />
                      {agent.role}
                    </div>
                    <DialogTitle className="mt-3 text-xl tracking-tight text-slate-950">
                      {agent.name}
                    </DialogTitle>
                    <DialogDescription className="text-sm leading-6 text-slate-600">
                      {agentCapabilityMap[agent.id].summary}
                    </DialogDescription>
                  </DialogHeader>
                  <div className="rounded-2xl border border-slate-900/8 bg-white/70 p-4">
                    <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                      Capabilities
                    </div>
                    <ul className="mt-3 space-y-2">
                      {agentCapabilityMap[agent.id].capabilities.map((capability) => (
                        <li key={capability} className="flex gap-2 text-sm leading-6 text-slate-800">
                          <span className="mt-2 h-1.5 w-1.5 rounded-full bg-emerald-700/70" />
                          <span>{capability}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </DialogContent>
              </Dialog>
            ))}
          </div>
        </div>

        <div className="min-h-0 flex-1 px-4 pb-4 pt-3">
          <div className="h-full min-h-0 rounded-[1.8rem] border border-white/60 bg-[linear-gradient(180deg,rgba(253,254,253,0.92),rgba(247,250,248,0.92))] p-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.75)]">
            <div className="mb-3 flex items-center justify-between">
              <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-600">Operations Feed</div>
              <div className="text-[10px] uppercase tracking-[0.18em] text-slate-400">{messages.length} entries</div>
            </div>
            <div className="relative h-[calc(100%-2rem)] overflow-hidden">
              <div ref={scrollRef} className="absolute inset-0 overflow-y-auto pr-1">
                <div className="space-y-3">
                  <AnimatePresence initial={false}>
                    {messages.map((message) => (
                      <div
                        key={message.id}
                        className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
                      >
                        <motion.div
                          initial={{ opacity: 0, y: 10, scale: 0.985 }}
                          animate={{ opacity: 1, y: 0, scale: 1 }}
                          transition={{ duration: 0.22, ease: [0.2, 0, 0, 1] }}
                          className={cn(
                            'max-w-[82%] rounded-[1.35rem] border px-3.5 py-2.5 shadow-[0_10px_20px_rgba(38,60,45,0.06)]',
                            messageBubbleClass(message)
                          )}
                        >
                          <div className="mb-1.5 flex items-center gap-2">
                            <span className="text-[10px] font-semibold uppercase tracking-[0.18em] opacity-75">
                              {authorLabel(message)}
                            </span>
                            {message.agent && message.agent !== 'user' && message.agent !== 'system' ? (
                              <span className="rounded-full border border-current/10 px-2 py-0.5 text-[9px] uppercase tracking-[0.16em] opacity-60">
                                {message.agent}
                              </span>
                            ) : null}
                          </div>
                          {message.role === 'agent' ? (
                            message.toolCalls && message.toolCalls.length > 0 ? (
                              <ul className="space-y-2 text-[12px] leading-relaxed">
                                {message.toolCalls.map((toolCall) => (
                                  <li key={toolCall.id} className="flex gap-2">
                                    <span className="mt-[0.45rem] h-1.5 w-1.5 rounded-full bg-current/70" />
                                    <span>{toolCall.summary}</span>
                                  </li>
                                ))}
                              </ul>
                            ) : (
                              <ChatMarkdown content={message.message} />
                            )
                          ) : (
                            <div className={cn(
                              'text-[12px] leading-relaxed whitespace-pre-wrap',
                              message.role === 'system' ? 'text-slate-200' : ''
                            )}>
                              {message.message}
                            </div>
                          )}
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
                        <div className="mr-10 rounded-[1.2rem] border border-emerald-800/10 bg-[linear-gradient(180deg,rgba(240,253,250,0.96),rgba(220,252,231,0.9))] px-3.5 py-2.5 text-[12px] text-emerald-950 shadow-[0_12px_22px_rgba(16,185,129,0.08)]">
                          <div className="flex items-center gap-2">
                            <span className="inline-flex h-2.5 w-2.5 rounded-full bg-emerald-500 animate-pulse" />
                            Orchestrator is coordinating the next response...
                          </div>
                        </div>
                      </motion.div>
                    ) : null}
                  </AnimatePresence>
                </div>
              </div>
            </div>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="border-t border-white/60 px-4 pb-4 pt-3">
          <div className="flex items-center gap-2 rounded-[1.8rem] border border-white/60 bg-white/60 p-2 shadow-[inset_0_1px_0_rgba(255,255,255,0.8)]">
            <Input
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              placeholder="Ask for a greenhouse operations assessment..."
              className="h-11 rounded-[1.2rem] border-transparent bg-transparent px-3 text-[13px] shadow-none focus-visible:ring-0"
            />
            <Button
              type="submit"
              size="sm"
              className="h-11 rounded-[1.2rem] bg-[linear-gradient(135deg,rgba(20,83,45,0.98),rgba(15,118,110,0.96))] px-4 text-[11px] font-semibold uppercase tracking-[0.16em] shadow-[0_12px_24px_rgba(6,78,59,0.28)]"
              disabled={isLoading || !draft.trim()}
            >
              <SendHorizonal className="mr-1 h-3.5 w-3.5" />
              Send
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
