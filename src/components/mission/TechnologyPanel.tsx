import { motion } from 'framer-motion';
import type { TechnologyDevice } from './types';

const deviceStatusTone = {
  online: 'text-success border-success/30 bg-success/5',
  standby: 'text-warning border-warning/30 bg-warning/5',
  maintenance: 'text-destructive border-destructive/30 bg-destructive/5',
};

const technologyDevices: TechnologyDevice[] = [
  {
    name: 'Temperature Sensor',
    category: 'Climate telemetry',
    status: 'online',
    power: '92%',
    componentHealth: 'Calibrated',
    failureRisk: '8%',
  },
  {
    name: 'Humidity Sensor',
    category: 'Moisture telemetry',
    status: 'online',
    power: '88%',
    componentHealth: 'Nominal',
    failureRisk: '11%',
  },
  {
    name: 'Water Reservoir Level Sensor',
    category: 'Resource telemetry',
    status: 'standby',
    power: '76%',
    componentHealth: 'Needs inspection',
    failureRisk: '27%',
  },
  {
    name: 'Plant Camera',
    category: 'Visual inspection',
    status: 'online',
    power: '95%',
    componentHealth: 'Lens clear',
    failureRisk: '6%',
  },
  {
    name: 'Ventilation',
    category: 'Airflow control',
    status: 'maintenance',
    power: '64%',
    componentHealth: 'Fan wear detected',
    failureRisk: '41%',
  },
];

const labelMap: Record<'power' | 'componentHealth' | 'failureRisk', string> = {
  power: 'Power',
  componentHealth: 'Component Health',
  failureRisk: 'Failure Risk',
};

function parsePercent(value: string) {
  return Number.parseInt(value.replace('%', ''), 10);
}

function metricTone(value: number, inverse = false) {
  const normalized = inverse ? 100 - value : value;
  if (normalized >= 80) return 'text-success';
  if (normalized >= 60) return 'text-warning';
  return 'text-destructive';
}

function metricBarTone(value: number, inverse = false) {
  const normalized = inverse ? 100 - value : value;
  if (normalized >= 80) return 'bg-success';
  if (normalized >= 60) return 'bg-warning';
  return 'bg-destructive';
}

export function TechnologyPanel() {
  return (
    <div className="flex-1 min-h-0 overflow-y-auto space-y-2 mt-2">
      {technologyDevices.map((device, index) => (
        <motion.div
          key={device.name}
          className="border border-border bg-card rounded-lg p-3"
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: index * 0.06 }}
        >
          <div className="flex items-start justify-between gap-3 mb-2.5">
            <div className="min-w-0">
              <div className="text-[12px] font-semibold text-foreground">{device.name}</div>
              <div className="text-[9px] text-muted-foreground">{device.category}</div>
            </div>
            <span className={`shrink-0 rounded-full border px-2 py-0.5 text-[9px] font-semibold uppercase tracking-[0.12em] ${deviceStatusTone[device.status]}`}>
              {device.status}
            </span>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div className="rounded bg-muted/50 p-2">
              <div className="text-[8px] text-muted-foreground mb-1">Status</div>
              <div className="flex items-center gap-2">
                <div className={`status-led ${device.status === 'online' ? 'bg-success' : device.status === 'standby' ? 'bg-warning' : 'bg-destructive'}`} />
                <div className="text-[13px] font-mono font-semibold text-foreground uppercase">{device.status}</div>
              </div>
            </div>

            <GaugeMetric label={labelMap.power} value={parsePercent(device.power)} unit="%" />
            <TextMetric label={labelMap.componentHealth} value={device.componentHealth} />
            <GaugeMetric label={labelMap.failureRisk} value={parsePercent(device.failureRisk)} unit="%" inverse />
          </div>
        </motion.div>
      ))}
    </div>
  );
}

function GaugeMetric({
  label,
  value,
  unit,
  inverse = false,
}: {
  label: string;
  value: number;
  unit: string;
  inverse?: boolean;
}) {
  return (
    <div className="bg-muted/50 rounded p-2">
      <div className="text-[8px] text-muted-foreground mb-1">{label}</div>
      <div className={`text-[13px] font-mono font-semibold ${metricTone(value, inverse)}`}>
        {value}
        <span className="text-[9px] text-muted-foreground font-normal">{unit}</span>
      </div>
      <div className="w-full h-1 bg-muted rounded-full mt-1">
        <div
          className={`h-full rounded-full transition-all ${metricBarTone(value, inverse)}`}
          style={{ width: `${Math.max(0, Math.min(100, value))}%` }}
        />
      </div>
    </div>
  );
}

function TextMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-muted/50 rounded p-2">
      <div className="text-[8px] text-muted-foreground mb-1">{label}</div>
      <div className="text-[13px] font-mono font-semibold text-foreground">{value}</div>
    </div>
  );
}
