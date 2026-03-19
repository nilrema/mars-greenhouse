import { useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { ActivityFeedItem, AgentStatusCard } from './types';

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

export function AgentChatPanel({ agents, logs }: { agents: AgentStatusCard[]; logs: ActivityFeedItem[] }) {
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [logs]);

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
      <div className="flex-1 overflow-hidden relative">
        <div ref={scrollRef} className="absolute inset-0 overflow-y-auto space-y-2 pr-1">
          <AnimatePresence>
            {logs.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-center">
                <div className="text-[28px] mb-2">🛡️</div>
                <div className="text-[11px] text-muted-foreground mb-1">All systems nominal</div>
                <div className="text-[10px] text-muted-foreground/50">
                  Adjust simulation parameters to see agents respond
                </div>
              </div>
            ) : (
              logs.map((log, index) => (
                <motion.div
                  key={`${log.agent}-${index}`}
                  initial={{ opacity: 0, y: 10, scale: 0.97 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  transition={{ duration: 0.25, ease: [0.2, 0, 0, 1] }}
                  className={`border-l-3 ${logBorderColor[log.type]} ${logBgColor[log.type]} rounded-r-md p-2.5`}
                  style={{ borderLeftWidth: '3px' }}
                >
                  <div className="flex items-center gap-1.5 mb-1">
                    <span className="text-[10px] font-semibold text-primary">{log.agent.toUpperCase()}</span>
                    <span className="text-[9px] text-muted-foreground/50">·</span>
                    <span className="text-[9px] text-muted-foreground/50">
                      {log.type === 'critical'
                        ? '🔴'
                        : log.type === 'warning'
                          ? '🟡'
                          : log.type === 'success'
                            ? '🟢'
                            : '🔵'}{' '}
                      {log.type.toUpperCase()}
                    </span>
                  </div>
                  <div className="text-[11px] text-foreground leading-relaxed">{log.message}</div>
                </motion.div>
              ))
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
