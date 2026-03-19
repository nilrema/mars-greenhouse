import { motion } from 'framer-motion';
import type { MarsBase } from './types';

const stageColor = (stage: number) => {
  if (stage > 80) return 'bg-success';
  if (stage > 50) return 'bg-primary';
  if (stage > 25) return 'bg-warning';
  return 'bg-muted';
};

export function GreenhouseDetail({ base, onOpenDetailed }: { base: MarsBase; onOpenDetailed?: () => void }) {
  return (
    <div className="panel h-full flex flex-col overflow-hidden">
      <div className="panel-header flex items-center justify-between">
        <span>Greenhouse — {base.name}</span>
        <span className="text-primary text-[10px]">{base.label}</span>
      </div>

      <div className="grid grid-cols-5 gap-1.5 mb-3">
        <EnvMetric label="Temp" value={`${base.environment.temperature}°C`} />
        <EnvMetric label="Humid" value={`${base.environment.humidity}%`} />
        <EnvMetric label="CO₂" value={`${base.environment.co2}`} unit="ppm" />
        <EnvMetric label="Light" value={`${base.environment.light}%`} />
        <EnvMetric label="Water" value={`${base.environment.water}%`} />
      </div>

      <div className="panel-header">Crop Status</div>
      <div className="grid grid-cols-3 gap-1.5 flex-1 min-h-0">
        {base.crops.map((crop, i) => (
          <motion.div
            key={crop.name}
            className={`border ${crop.anomaly ? 'border-destructive' : 'border-border'} bg-card rounded p-2 relative overflow-hidden`}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: i * 0.05 }}
          >
            {crop.anomaly && (
              <motion.div
                className="absolute inset-0 border-2 border-destructive rounded"
                animate={{ opacity: [1, 0.3, 1] }}
                transition={{ duration: 1, repeat: Infinity }}
              />
            )}
            
            <div className="w-full h-1 bg-muted rounded-full mb-2">
              <div className={`h-full rounded-full ${stageColor(crop.growthStage)}`} style={{ width: `${crop.growthStage}%` }} />
            </div>
            
            <div className="text-[11px] font-medium text-foreground mb-1">{crop.name}</div>
            <div className="flex justify-between">
              <span className="text-[9px] text-muted-foreground">Growth {crop.growthStage}%</span>
              <span className={`text-[9px] ${crop.health < 80 ? 'text-destructive' : 'text-muted-foreground'}`}>HP {crop.health}%</span>
            </div>
            <div className="text-[9px] text-muted-foreground mt-0.5">
              Yield {crop.projectedYield} kcal
            </div>
          </motion.div>
        ))}
      </div>

      <div className="mt-2 border-t border-border pt-2">
        <div className="panel-header">Active Robotics</div>
        <div className="grid grid-cols-3 gap-1.5">
          <RobotUnit label="Rover-04" status="Patrol" />
          <RobotUnit label="Arm-02" status="Harvest" />
          <RobotUnit label="Drone-01" status="Scan" />
        </div>
      </div>

      {onOpenDetailed && (
        <motion.button
          onClick={onOpenDetailed}
          className="mt-2.5 w-full border border-primary bg-primary/10 text-primary font-medium text-[11px] py-2 rounded hover:bg-primary/20 transition-colors"
          whileHover={{ scale: 1.005 }}
          whileTap={{ scale: 0.995 }}
        >
          Open Digital Twin — {base.name}
        </motion.button>
      )}
    </div>
  );
}

function EnvMetric({ label, value, unit }: { label: string; value: string; unit?: string }) {
  return (
    <div className="border border-border bg-card rounded p-1.5 text-center">
      <div className="text-[9px] text-muted-foreground mb-0.5">{label}</div>
      <div className="font-mono text-[12px] text-foreground tabular-nums">{value}</div>
      {unit && <div className="text-[8px] text-muted-foreground">{unit}</div>}
    </div>
  );
}

function RobotUnit({ label, status }: { label: string; status: string }) {
  return (
    <div className="flex items-center gap-1.5 px-2 py-1 border border-border rounded">
      <div className="status-led bg-success" />
      <div>
        <div className="text-[9px] font-medium">{label}</div>
        <div className="text-[8px] text-muted-foreground">{status}</div>
      </div>
    </div>
  );
}
