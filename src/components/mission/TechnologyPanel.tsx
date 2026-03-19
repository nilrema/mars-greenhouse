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
    connectivity: 'Stable mesh',
    componentHealth: 'Calibrated',
    failureRisk: '8%',
  },
  {
    name: 'Humidity Sensor',
    category: 'Moisture telemetry',
    status: 'online',
    power: '88%',
    connectivity: 'Stable mesh',
    componentHealth: 'Nominal',
    failureRisk: '11%',
  },
  {
    name: 'Water Reservoir Level Sensor',
    category: 'Resource telemetry',
    status: 'standby',
    power: '76%',
    connectivity: 'Intermittent relay',
    componentHealth: 'Needs inspection',
    failureRisk: '27%',
  },
  {
    name: 'Plant Camera',
    category: 'Visual inspection',
    status: 'online',
    power: '95%',
    connectivity: 'High bandwidth',
    componentHealth: 'Lens clear',
    failureRisk: '6%',
  },
  {
    name: 'Ventilation',
    category: 'Airflow control',
    status: 'maintenance',
    power: '64%',
    connectivity: 'Local bus only',
    componentHealth: 'Fan wear detected',
    failureRisk: '41%',
  },
];

const metricLabels: Array<keyof Omit<TechnologyDevice, 'name' | 'category' | 'status'>> = [
  'power',
  'connectivity',
  'componentHealth',
  'failureRisk',
];

const labelMap: Record<(typeof metricLabels)[number], string> = {
  power: 'Power',
  connectivity: 'Connectivity',
  componentHealth: 'Component Health',
  failureRisk: 'Failure Risk',
};

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
              <div className="text-[13px] font-mono font-semibold text-foreground uppercase">{device.status}</div>
            </div>

            {metricLabels.map((metric) => (
              <div key={metric} className="rounded bg-muted/50 p-2">
                <div className="text-[8px] text-muted-foreground mb-1">{labelMap[metric]}</div>
                <div className="text-[13px] font-mono font-semibold text-foreground">{device[metric]}</div>
              </div>
            ))}
          </div>
        </motion.div>
      ))}
    </div>
  );
}
