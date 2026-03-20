import { AnimatePresence, motion } from 'framer-motion';
import { getToolCallBehavior } from './toolCallCatalog';
import type { ToolCallTile } from './types';

export function ToolCallRail({ toolCalls }: { toolCalls: ToolCallTile[] }) {
  return (
    <div className="panel h-full overflow-hidden px-2 py-3">
      <div className="flex h-full flex-col items-center gap-3 overflow-y-auto pr-0.5">
        <AnimatePresence initial={false}>
          {toolCalls.map((toolCall) => {
            const behavior = getToolCallBehavior(toolCall);
            const Icon = behavior.icon;

            return (
              <motion.div
                key={toolCall.id}
                initial={{ opacity: 0, y: 12, scale: 0.92 }}
                animate={{
                  opacity: 1,
                  y: 0,
                  scale: 1,
                  boxShadow:
                    toolCall.status === 'active'
                      ? '0 0 0 1px rgba(16,185,129,0.18), 0 18px 30px rgba(15,23,42,0.14)'
                      : '0 10px 18px rgba(15,23,42,0.08)',
                }}
                exit={{ opacity: 0, y: -8, scale: 0.94 }}
                transition={{ duration: 0.22, ease: [0.2, 0, 0, 1] }}
                title={toolCall.summary}
                className={`flex h-16 w-16 flex-col items-center justify-center rounded-[1.35rem] border text-center ${behavior.accentClassName}`}
              >
                <Icon className="h-[18px] w-[18px]" />
                <div className="mt-1.5 text-[9px] font-semibold uppercase tracking-[0.14em]">
                  {behavior.tileLabel}
                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>
    </div>
  );
}
