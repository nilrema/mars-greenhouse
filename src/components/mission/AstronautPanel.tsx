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

const hydrationValue = {
  optimal: 100,
  adequate: 65,
  low: 30,
};

export function AstronautPanel({ astronauts }: { astronauts: AstronautRecord[] }) {
  const overview = getCrewOverview(astronauts);

  return (
    <div className="flex-1 min-h-0 overflow-y-auto space-y-2 mt-2">
      <div className="rounded-2xl border border-border bg-background/55 p-4">
        <div className="flex items-center justify-between mb-3">
          <div>
            <div className="text-[13px] font-semibold text-foreground">Crew Overview</div>
            <div className="text-[11px] text-muted-foreground">Average nutrition and hydration posture across the active crew.</div>
          </div>
          <div className="rounded-full border border-border/80 bg-secondary/75 px-3 py-1.5 text-[10px] font-mono text-muted-foreground">{astronauts.length} active crew</div>
        </div>

        <div className="grid grid-cols-4 gap-2">
          <OverviewGauge label="Calories" value={overview.calories} suffix="%" />
          <OverviewGauge label="Protein" value={overview.protein} suffix="%" />
          <OverviewGauge label="Micronutrients" value={overview.micronutrients} suffix="" />
          <OverviewGauge label="Hydration" value={overview.hydration} suffix="%" />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2">
        {astronauts.map((astronaut, index) => (
          <motion.div
            key={astronaut.name}
            className={`rounded-2xl border ${healthBorder[astronaut.health]} bg-background/55 p-3.5`}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.06 }}
          >
            <div className="flex items-center gap-2.5 mb-2.5">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-border/70 bg-secondary/80 text-[12px] font-semibold uppercase tracking-[0.14em] text-foreground">
                {astronaut.avatar}
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-[14px] font-semibold text-foreground truncate">{astronaut.name}</div>
                <div className="text-[11px] text-muted-foreground truncate">{astronaut.role}</div>
              </div>
              <span className={`text-[10px] font-semibold ${healthColor[astronaut.health]}`}>
                {astronaut.health.toUpperCase()}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <CrewMetric
                label="Calories"
                current={astronaut.calories.current}
                target={astronaut.calories.target}
                unit="kcal"
              />
              <CrewMetric
                label="Protein"
                current={astronaut.protein.current}
                target={astronaut.protein.target}
                unit="g"
              />
              <ScoreMetric
                label="Micronutrients"
                value={astronaut.micronutrientScore}
                display={`${astronaut.micronutrientScore}/100`}
              />
              <ScoreMetric
                label="Hydration"
                value={hydrationValue[astronaut.hydration]}
                display={astronaut.hydration.charAt(0).toUpperCase() + astronaut.hydration.slice(1)}
                valueClass={hydrationColor[astronaut.hydration]}
              />
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}

function CrewMetric({
  label,
  current,
  target,
  unit,
}: {
  label: string;
  current: number;
  target: number;
  unit: string;
}) {
  const pct = clampPercent(Math.round((current / target) * 100));
  const tone = metricTone(pct);
  const barTone = metricBarTone(pct);

  return (
    <div className="rounded-xl bg-muted/50 p-2.5">
      <div className="mb-1 text-[9px] text-muted-foreground">{label}</div>
      <div className={`text-[15px] font-mono font-semibold ${tone}`}>
        {current}
        <span className="text-[10px] text-muted-foreground font-normal">/{target}{unit}</span>
      </div>
      <div className="w-full h-1 bg-muted rounded-full mt-1">
        <div className={`h-full rounded-full transition-all ${barTone}`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

function ScoreMetric({
  label,
  value,
  display,
  valueClass,
}: {
  label: string;
  value: number;
  display: string;
  valueClass?: string;
}) {
  const pct = clampPercent(value);
  const tone = valueClass ?? metricTone(pct);
  const barTone = metricBarTone(pct);

  return (
    <div className="rounded-xl bg-muted/50 p-2.5">
      <div className="mb-1 text-[9px] text-muted-foreground">{label}</div>
      <div className={`text-[15px] font-mono font-semibold ${tone}`}>{display}</div>
      <div className="w-full h-1 bg-muted rounded-full mt-1">
        <div className={`h-full rounded-full transition-all ${barTone}`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

function OverviewGauge({
  label,
  value,
  suffix,
}: {
  label: string;
  value: number;
  suffix: string;
}) {
  const pct = clampPercent(value);
  const accent = gaugeAccent(pct);
  const angle = pct * 3.6;

  return (
    <div className="rounded-2xl bg-muted/35 p-2.5 flex flex-col items-center justify-center">
      <div
        className="relative h-16 w-16 rounded-full"
        style={{
          background: `conic-gradient(${accent} 0deg ${angle}deg, hsl(var(--muted)) ${angle}deg 360deg)`,
        }}
      >
        <div className="absolute inset-[5px] rounded-full bg-card flex items-center justify-center">
          <div className={`font-mono text-[13px] font-semibold ${metricTone(pct)}`}>
            {pct}
            {suffix}
          </div>
        </div>
      </div>
      <div className="mt-2 text-center text-[9px] text-muted-foreground leading-tight">{label}</div>
    </div>
  );
}

function getCrewOverview(astronauts: AstronautRecord[]) {
  const count = Math.max(astronauts.length, 1);

  return {
    calories: Math.round(
      astronauts.reduce((sum, astronaut) => sum + astronaut.calories.current / astronaut.calories.target, 0) / count * 100
    ),
    protein: Math.round(
      astronauts.reduce((sum, astronaut) => sum + astronaut.protein.current / astronaut.protein.target, 0) / count * 100
    ),
    micronutrients: Math.round(
      astronauts.reduce((sum, astronaut) => sum + astronaut.micronutrientScore, 0) / count
    ),
    hydration: Math.round(
      astronauts.reduce((sum, astronaut) => sum + hydrationValue[astronaut.hydration], 0) / count
    ),
  };
}

function clampPercent(value: number) {
  return Math.max(0, Math.min(100, value));
}

function metricTone(value: number) {
  if (value >= 80) return 'text-success';
  if (value >= 60) return 'text-warning';
  return 'text-destructive';
}

function metricBarTone(value: number) {
  if (value >= 80) return 'bg-success';
  if (value >= 60) return 'bg-warning';
  return 'bg-destructive';
}

function gaugeAccent(value: number) {
  if (value >= 80) return 'hsl(var(--success))';
  if (value >= 60) return 'hsl(var(--warning))';
  return 'hsl(var(--destructive))';
}
