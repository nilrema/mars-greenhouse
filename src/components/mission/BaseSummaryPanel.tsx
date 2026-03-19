import { motion } from 'framer-motion';
import type { MarsBase, GreenhouseZone } from './types';

const statusColor: Record<string, string> = {
  nominal: 'text-success',
  warning: 'text-warning',
  critical: 'text-destructive',
  healthy: 'text-success',
};

export function BaseSummaryPanel({ base, zones }: { base: MarsBase; zones: GreenhouseZone[] }) {
  const totalYield = zones.reduce((s, z) => s + (z.predictedYield || 0), 0);
  const avgDiseaseRisk = Math.round(zones.filter(z => z.type === 'growing').reduce((s, z) => s + z.diseaseRisk, 0) / zones.filter(z => z.type === 'growing').length);
  const alerts = zones.filter(z => z.status !== 'healthy').length;
  const waterEff = Math.round(base.environment.water);
  const energyEff = Math.round(base.environment.light);

  return (
    <div className="panel h-full flex flex-col overflow-y-auto">
      <div className="panel-header">Module Summary</div>

      <div className="border border-border bg-background/50 p-2.5 mb-2 rounded">
        <div className="text-[13px] text-primary font-medium">{base.name}</div>
        <div className="text-[10px] text-muted-foreground">{base.label}</div>
      </div>

      <div className="grid grid-cols-2 gap-1.5 mb-2">
        <MiniMetric label="Status" value={base.status.charAt(0).toUpperCase() + base.status.slice(1)} valueClass={statusColor[base.status]} />
        <MiniMetric label="Alerts" value={String(alerts)} valueClass={alerts > 0 ? 'text-warning' : 'text-success'} />
        <MiniMetric label="Production" value={`${base.production}%`} />
        <MiniMetric label="Risk" value={`${base.risk}%`} valueClass={base.risk > 20 ? 'text-warning' : 'text-muted-foreground'} />
      </div>

      <div className="panel-header">Harvest Metrics</div>
      <div className="space-y-1.5 mb-2">
        <MetricBar label="Crop Output" value={totalYield} max={80} unit="kg" />
        <MetricBar label="Disease Risk" value={avgDiseaseRisk} max={100} unit="%" warning={avgDiseaseRisk > 20} />
        <MetricBar label="Water Efficiency" value={waterEff} max={100} unit="%" />
        <MetricBar label="Energy Efficiency" value={energyEff} max={100} unit="%" />
        <MetricBar label="Food Inventory" value={Math.round(totalYield * 2.1)} max={200} unit="kg" />
        <MetricBar label="Dispatch Readiness" value={Math.round(base.production * 0.33)} max={40} unit="%" />
      </div>

      <div className="panel-header">Crop Portfolio</div>
      <div className="space-y-0.5">
        {base.crops.map(c => (
          <div key={c.name} className="flex items-center justify-between px-2 py-1 border border-border rounded">
            <div className="flex items-center gap-1.5">
              <div className={`w-1.5 h-1.5 rounded-full ${c.anomaly ? 'bg-destructive' : c.health > 85 ? 'bg-success' : 'bg-warning'}`} />
              <span className="text-[10px] font-medium">{c.name}</span>
            </div>
            <span className="text-[9px] text-muted-foreground font-mono">{c.projectedYield} kcal</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function MiniMetric({ label, value, valueClass }: { label: string; value: string; valueClass?: string }) {
  return (
    <div className="border border-border bg-background/50 p-2 rounded">
      <div className="text-[9px] text-muted-foreground mb-0.5">{label}</div>
      <div className={`font-mono text-[12px] tabular-nums ${valueClass || 'text-foreground'}`}>{value}</div>
    </div>
  );
}

function MetricBar({ label, value, max, unit, warning }: { label: string; value: number; max: number; unit: string; warning?: boolean }) {
  const pct = Math.min(100, (value / max) * 100);
  return (
    <div className="px-1">
      <div className="flex justify-between mb-0.5">
        <span className="text-[9px] text-muted-foreground">{label}</span>
        <span className={`font-mono text-[9px] tabular-nums ${warning ? 'text-warning' : 'text-foreground'}`}>{value}{unit}</span>
      </div>
      <div className="w-full h-1 bg-muted rounded-full">
        <motion.div
          className={`h-full rounded-full ${warning ? 'bg-warning' : 'bg-primary'}`}
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 0.5 }}
        />
      </div>
    </div>
  );
}
