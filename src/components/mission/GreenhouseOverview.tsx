import { useState } from 'react';
import { motion } from 'framer-motion';
import type { AstronautRecord, MarsBase } from './types';
import { AstronautPanel } from './AstronautPanel';

export function GreenhouseOverview({
  base,
  astronauts,
}: {
  base: MarsBase;
  astronauts: AstronautRecord[];
}) {
  const [tab, setTab] = useState<'greenhouse' | 'astronauts'>('greenhouse');

  const healthScore = Math.round(
    base.production * 0.4 +
      (100 - base.risk) * 0.3 +
      (base.crops.reduce((sum, crop) => sum + crop.health, 0) / base.crops.length) * 0.3
  );

  return (
    <div className="panel h-full flex flex-col overflow-hidden">
      <div className="panel-header flex items-center justify-between mb-0">
        <div className="flex items-center gap-1 bg-muted rounded p-0.5">
          <button
            onClick={() => setTab('greenhouse')}
            className={`px-2.5 py-1 rounded text-[10px] font-medium transition-colors ${
              tab === 'greenhouse' ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            🌱 Greenhouse
          </button>
          <button
            onClick={() => setTab('astronauts')}
            className={`px-2.5 py-1 rounded text-[10px] font-medium transition-colors ${
              tab === 'astronauts' ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            🧑‍🚀 Astronauts
          </button>
        </div>
        <span
          className={`text-[10px] font-medium ${
            base.status === 'nominal'
              ? 'text-success'
              : base.status === 'warning'
                ? 'text-warning'
                : 'text-destructive'
          }`}
        >
          {base.status.toUpperCase()}
        </span>
      </div>

      {tab === 'greenhouse' ? (
        <>
          <div className="grid grid-cols-5 gap-1.5 mb-3 mt-2">
            <MetricCard label="Temperature" value={`${base.environment.temperature}°C`} critical={base.environment.temperature < 15} icon="🌡️" />
            <MetricCard label="Humidity" value={`${base.environment.humidity}%`} critical={base.environment.humidity < 40} icon="💧" />
            <MetricCard label="Water / Recycling" value={`${base.environment.water}%`} critical={base.environment.water < 40} icon="♻️" />
            <MetricCard label="Power" value={`${base.environment.light}%`} critical={base.environment.light < 50} icon="⚡" />
            <MetricCard label="Health Score" value={`${healthScore}`} critical={healthScore < 60} icon="💚" />
          </div>

          <div className="panel-header">Crop Status</div>
          <div className="flex-1 min-h-0 overflow-y-auto space-y-1.5">
            {base.crops.map((crop, index) => (
              <motion.div
                key={crop.name}
                className={`border ${crop.anomaly ? 'border-destructive bg-destructive/5' : 'border-border'} bg-card rounded p-2 relative`}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: index * 0.05 }}
              >
                {crop.anomaly && (
                  <motion.div
                    className="absolute top-1.5 right-1.5 text-[9px] text-destructive font-semibold"
                    animate={{ opacity: [1, 0.3, 1] }}
                    transition={{ duration: 1, repeat: Infinity }}
                  >
                    ⚠ {crop.stressStatus.toUpperCase()}
                  </motion.div>
                )}

                <div className="flex items-center justify-between mb-1">
                  <span className="text-[11px] font-medium text-foreground">{crop.name}</span>
                  <span className={`text-[10px] font-mono ${crop.health < 70 ? 'text-destructive' : 'text-muted-foreground'}`}>
                    HP {crop.health}%
                  </span>
                </div>

                <div className="w-full h-1.5 bg-muted rounded-full mb-1">
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

                <div className="flex justify-between text-[9px] text-muted-foreground">
                  <span>
                    Growth {crop.growthStage}% · {crop.daysToHarvest}d to harvest
                  </span>
                  <span>{crop.projectedYield.toLocaleString()} kcal</span>
                </div>

                <div className="flex justify-between text-[9px] mt-0.5">
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
      className={`border ${critical ? 'border-destructive bg-destructive/5' : 'border-border'} bg-card rounded p-2 text-center`}
      animate={critical ? { borderColor: ['hsl(0,65%,50%)', 'hsl(0,65%,70%)', 'hsl(0,65%,50%)'] } : {}}
      transition={critical ? { duration: 1.5, repeat: Infinity } : {}}
    >
      <div className="text-[14px] mb-0.5">{icon}</div>
      <div className={`font-mono text-[14px] font-semibold ${critical ? 'text-destructive' : 'text-foreground'}`}>
        {value}
      </div>
      <div className="text-[9px] text-muted-foreground">{label}</div>
    </motion.div>
  );
}
