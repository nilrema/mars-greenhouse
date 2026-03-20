import { useState } from 'react';
import { motion } from 'framer-motion';
import type { AstronautRecord, MarsBase } from './types';
import { AstronautPanel } from './AstronautPanel';
import { TechnologyPanel } from './TechnologyPanel';

export function GreenhouseOverview({
  base,
  astronauts,
}: {
  base: MarsBase;
  astronauts: AstronautRecord[];
}) {
  const [tab, setTab] = useState<'greenhouse' | 'technology' | 'astronauts'>('greenhouse');

  const healthScore = Math.round(
    base.production * 0.4 +
      (100 - base.risk) * 0.3 +
      (base.crops.reduce((sum, crop) => sum + crop.health, 0) / base.crops.length) * 0.3
  );

  return (
    <div className="panel h-full flex flex-col overflow-hidden">
      <div className="mb-3 flex items-center justify-between">
        <div>
          <div className="panel-header mb-1">Mission Overview</div>
          <div className="text-[12px] text-muted-foreground">Greenhouse performance, hardware readiness, and crew posture.</div>
        </div>
        <span
          className={`rounded-full border px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.18em] ${
            base.status === 'nominal'
              ? 'border-success/30 bg-success/10 text-success'
              : base.status === 'warning'
                ? 'border-warning/30 bg-warning/10 text-warning'
                : 'border-destructive/30 bg-destructive/10 text-destructive'
          }`}
        >
          {base.status}
        </span>
      </div>

      <div className="mb-3 flex items-center justify-between gap-3">
        <div className="flex items-center gap-1 rounded-full border border-slate-800/10 bg-slate-800 p-1 shadow-[0_12px_24px_rgba(15,23,42,0.12)]">
          <button
            onClick={() => setTab('greenhouse')}
            className={`rounded-full px-3.5 py-2 text-[11px] font-semibold uppercase tracking-[0.16em] transition-colors ${
              tab === 'greenhouse' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-400 hover:text-white'
            }`}
          >
            Greenhouse
          </button>
          <button
            onClick={() => setTab('technology')}
            className={`rounded-full px-3.5 py-2 text-[11px] font-semibold uppercase tracking-[0.16em] transition-colors ${
              tab === 'technology' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-400 hover:text-white'
            }`}
          >
            Technology
          </button>
          <button
            onClick={() => setTab('astronauts')}
            className={`rounded-full px-3.5 py-2 text-[11px] font-semibold uppercase tracking-[0.16em] transition-colors ${
              tab === 'astronauts' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-400 hover:text-white'
            }`}
          >
            Crew
          </button>
        </div>
        <span className="rounded-full border border-slate-800/10 bg-slate-900 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-200 shadow-[0_12px_24px_rgba(15,23,42,0.12)]">{base.label}</span>
      </div>

      {tab === 'greenhouse' ? (
        <>
          <div className="mb-4 grid grid-cols-5 gap-3">
            <MetricCard label="Temperature" value={`${base.environment.temperature}°C`} critical={base.environment.temperature < 15} icon="TMP" />
            <MetricCard label="Humidity" value={`${base.environment.humidity}%`} critical={base.environment.humidity < 40} icon="H2O" />
            <MetricCard label="Water / Recycling" value={`${base.environment.water}%`} critical={base.environment.water < 40} icon="WTR" />
            <MetricCard label="Power" value={`${base.environment.light}%`} critical={base.environment.light < 50} icon="PWR" />
            <MetricCard label="Health Score" value={`${healthScore}`} critical={healthScore < 60} icon="BIO" />
          </div>

          <div className="panel-header">Crop Status</div>
          <div className="flex-1 min-h-0 overflow-y-auto space-y-2">
            {base.crops.map((crop, index) => (
              <motion.div
                key={crop.name}
                className={`relative rounded-2xl border p-3 ${
                  crop.anomaly ? 'border-destructive/35 bg-destructive/5' : 'border-border bg-slate-50/78'
                }`}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: index * 0.05 }}
              >
                {crop.anomaly && (
                  <motion.div
                    className="absolute right-3 top-3 rounded-full border border-destructive/25 bg-destructive/10 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-destructive"
                    animate={{ opacity: [1, 0.3, 1] }}
                    transition={{ duration: 1, repeat: Infinity }}
                  >
                    {crop.stressStatus}
                  </motion.div>
                )}

                <div className="flex items-center justify-between mb-1">
                  <span className="text-[13px] font-semibold text-foreground">{crop.name}</span>
                  <div className="text-right">
                    <div className="text-[9px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                      Growth Rate
                    </div>
                    <span
                      className={`font-mono text-[18px] font-semibold leading-none ${
                        crop.growthStage > 80
                          ? 'text-success'
                          : crop.growthStage > 50
                            ? 'text-primary'
                            : 'text-warning'
                      }`}
                    >
                      {crop.growthStage}%
                    </span>
                  </div>
                </div>

                <div className="mb-1 h-1.5 w-full rounded-full bg-muted">
                  <motion.div
                    className={`h-full rounded-full ${
                      crop.anomaly
                        ? 'bg-destructive'
                        : crop.growthStage > 80
                          ? 'bg-success'
                          : crop.growthStage > 50
                            ? 'bg-primary'
                            : 'bg-warning'
                    }`}
                    initial={{ width: 0 }}
                    animate={{ width: `${crop.growthStage}%` }}
                    transition={{ duration: 0.5 }}
                  />
                </div>

                <div className="flex justify-between text-[10px] text-muted-foreground">
                  <span>
                    {crop.daysToHarvest}d to harvest
                  </span>
                  <span>{crop.projectedYield.toLocaleString()} kcal</span>
                </div>

                <div className="mt-0.5 flex justify-between text-[10px]">
                  <span
                    className={`${
                      crop.health >= 80 ? 'text-success' : crop.health >= 50 ? 'text-warning' : 'text-destructive'
                    }`}
                  >
                    {crop.stressStatus}
                  </span>
                </div>
              </motion.div>
            ))}
          </div>
        </>
      ) : tab === 'technology' ? (
        <TechnologyPanel />
      ) : (
        <AstronautPanel astronauts={astronauts} />
      )}
    </div>
  );
}

function MetricCard({
  label,
  value,
  critical,
  icon,
}: {
  label: string;
  value: string;
  critical: boolean;
  icon: string;
}) {
  return (
    <motion.div
      className={`rounded-2xl border p-3 text-left ${
        critical ? 'border-destructive/35 bg-destructive/5' : 'border-border bg-slate-50/82'
      }`}
      animate={critical ? { borderColor: ['hsl(0,65%,50%)', 'hsl(0,65%,70%)', 'hsl(0,65%,50%)'] } : {}}
      transition={critical ? { duration: 1.5, repeat: Infinity } : {}}
    >
      <div className="mb-3 inline-flex rounded-full border border-slate-300/80 bg-slate-100 px-2.5 py-1.5 text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-600">
        {icon}
      </div>
      <div className={`font-mono text-[21px] font-semibold leading-none ${critical ? 'text-destructive' : 'text-foreground'}`}>
        {value}
      </div>
      <div className="mt-2 text-[10px] uppercase tracking-[0.14em] text-muted-foreground">{label}</div>
    </motion.div>
  );
}
