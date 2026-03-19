import { motion, AnimatePresence } from 'framer-motion';
import type { Agent, ReasoningLog } from './types';

const statusBar = {
  nominal: 'bg-success',
  warning: 'bg-warning',
  critical: 'bg-destructive',
};

const logTypeColor = {
  info: 'text-foreground',
  warning: 'text-warning',
  critical: 'text-destructive',
  success: 'text-success',
};

export function AgentPanel({ agents, logs }: { agents: Agent[]; logs: ReasoningLog[] }) {
  return (
    <div className="panel h-full flex flex-col">
      <div className="panel-header">AI Agent Coordination</div>
      
      <div className="space-y-1.5 mb-3">
        {agents.map(agent => (
          <div key={agent.id} className="flex border border-border rounded bg-background/50">
            <div className={`w-1 shrink-0 rounded-l ${statusBar[agent.status]}`} />
            <div className="flex-1 px-2.5 py-1.5 min-w-0">
              <div className="flex items-center gap-1.5 mb-0.5">
                <span className="text-xs">{agent.icon}</span>
                <span className="text-[11px] text-primary font-medium">
                  {agent.name}
                </span>
                <span className="text-[9px] text-muted-foreground ml-auto">{agent.role}</span>
              </div>
              <div className="text-[10px] text-muted-foreground truncate">
                {agent.currentAction}
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="panel-header">Agent Reasoning Feed</div>
      <div className="flex-1 overflow-hidden relative">
        <div className="absolute inset-0 overflow-y-auto">
          <AnimatePresence>
            {logs.length === 0 ? (
              <div className="text-[10px] text-muted-foreground/50 text-center py-4">
                Awaiting signal…
              </div>
            ) : (
              logs.map((log, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, x: -5 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.15, ease: [0.2, 0, 0, 1] }}
                  className="border-l-2 border-border pl-2.5 mb-1.5"
                >
                  <span className="text-[10px] text-primary font-medium">{log.agent}:</span>
                  <span className={`text-[10px] ml-1.5 ${logTypeColor[log.type]}`}>
                    {log.message}
                  </span>
                </motion.div>
              ))
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
