import { motion } from 'framer-motion';
import type { AstronautRecord } from './types';

const hydrationColor = {
  optimal: 'text-success',
  adequate: 'text-warning',
  low: 'text-destructive',
};

const healthColor = {
  nominal: 'text-success',
  warning: 'text-warning',
  critical: 'text-destructive',
};

const healthBorder = {
  nominal: 'border-border',
  warning: 'border-warning/40',
  critical: 'border-destructive/40',
};

export function AstronautPanel({ astronauts }: { astronauts: AstronautRecord[] }) {
  return (
    <div className="flex-1 min-h-0 overflow-y-auto space-y-2">
      {astronauts.map((a, i) => (
        <motion.div
          key={a.name}
          className={`border ${healthBorder[a.health]} bg-card rounded-lg p-3`}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: i * 0.06 }}
        >
          {/* Header */}
          <div className="flex items-center gap-2.5 mb-2.5">
            <div className="text-[22px] leading-none">{a.avatar}</div>
            <div className="flex-1 min-w-0">
              <div className="text-[12px] font-semibold text-foreground truncate">{a.name}</div>
              <div className="text-[9px] text-muted-foreground">{a.role}</div>
            </div>
            <div className="flex flex-col items-end gap-0.5">
              <span className={`text-[9px] font-semibold ${healthColor[a.health]}`}>
                {a.health.toUpperCase()}
              </span>
            </div>
          </div>

          <div className="grid grid-cols-4 gap-2">
            <MiniMetric
              label="Calories"
              current={a.calories.current}
              target={a.calories.target}
              unit="kcal"
            />
            <MiniMetric
              label="Protein"
              current={a.protein.current}
              target={a.protein.target}
              unit="g"
            />
            <div className="bg-muted/50 rounded p-2">
              <div className="text-[8px] text-muted-foreground mb-1">Micronutrients</div>
              <div className={`text-[13px] font-mono font-semibold ${a.micronutrientScore < 70 ? 'text-destructive' : 'text-foreground'}`}>
                {a.micronutrientScore}
                <span className="text-[9px] text-muted-foreground font-normal">/100</span>
              </div>
            </div>
            <div className="bg-muted/50 rounded p-2">
              <div className="text-[8px] text-muted-foreground mb-1">Hydration</div>
              <div className={`text-[13px] font-mono font-semibold ${hydrationColor[a.hydration]}`}>
                {a.hydration.charAt(0).toUpperCase() + a.hydration.slice(1)}
              </div>
              <div className="w-full h-1 bg-muted rounded-full mt-1">
                <motion.div
                  className={`h-full rounded-full ${
                    a.hydration === 'optimal' ? 'bg-success' : a.hydration === 'adequate' ? 'bg-warning' : 'bg-destructive'
                  }`}
                  initial={{ width: 0 }}
                  animate={{ width: a.hydration === 'optimal' ? '100%' : a.hydration === 'adequate' ? '65%' : '30%' }}
                  transition={{ duration: 0.5, delay: i * 0.06 }}
                />
              </div>
            </div>
          </div>
        </motion.div>
      ))}
    </div>
  );
}

function MiniMetric({ label, current, target, unit }: { label: string; current: number; target: number; unit: string }) {
  const pct = Math.min(100, Math.round((current / target) * 100));
  const low = pct < 75;
  return (
    <div className="bg-muted/50 rounded p-2">
      <div className="text-[8px] text-muted-foreground mb-1">{label}</div>
      <div className={`text-[13px] font-mono font-semibold ${low ? 'text-destructive' : 'text-foreground'}`}>
        {current}
        <span className="text-[9px] text-muted-foreground font-normal">/{target}{unit}</span>
      </div>
      <div className="w-full h-1 bg-muted rounded-full mt-1">
        <div
          className={`h-full rounded-full transition-all ${low ? 'bg-destructive' : 'bg-success'}`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}
