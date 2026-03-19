import { motion } from 'framer-motion';
import type { HardwareState } from './types';

export function HardwareStatusPanel({ hardware }: { hardware: HardwareState }) {
  return (
    <div className="panel">
      <div className="panel-header">Hardware Response</div>
      <div className="grid grid-cols-3 gap-2">
        <HardwareCard
          label="Heater"
          icon="🔥"
          active={hardware.heaterActive}
          power={hardware.heaterPower}
          activeColor="text-destructive"
          barColor="bg-destructive"
        />
        <HardwareCard
          label="Irrigation Pump"
          icon="💧"
          active={hardware.irrigationPumpFlow > 50}
          power={hardware.irrigationPumpFlow}
          activeColor="text-primary"
          barColor="bg-primary"
        />
        <HardwareCard
          label="LED Grow Lights"
          icon="💡"
          active={hardware.ledBrightness > 20}
          power={hardware.ledBrightness}
          activeColor="text-warning"
          barColor="bg-warning"
          dimWhenLow
        />
      </div>
    </div>
  );
}

function HardwareCard({
  label, icon, active, power, activeColor, barColor, dimWhenLow,
}: {
  label: string; icon: string; active: boolean; power: number;
  activeColor: string; barColor: string; dimWhenLow?: boolean;
}) {
  const opacity = dimWhenLow ? Math.max(0.2, power / 100) : 1;

  return (
    <motion.div
      className={`border ${active ? 'border-border' : 'border-border/50'} bg-card rounded p-2 text-center relative overflow-hidden`}
      animate={active && power > 70 ? { 
        boxShadow: ['0 0 0px transparent', '0 0 8px hsl(var(--warning) / 0.3)', '0 0 0px transparent'] 
      } : {}}
      transition={active ? { duration: 2, repeat: Infinity } : {}}
    >
      <motion.div
        className="text-[18px] mb-1"
        style={{ opacity }}
        animate={active && power > 70 ? { scale: [1, 1.1, 1] } : {}}
        transition={{ duration: 1.5, repeat: Infinity }}
      >
        {icon}
      </motion.div>
      <div className="text-[9px] text-muted-foreground mb-1">{label}</div>
      <div className={`text-[11px] font-mono font-semibold ${active ? activeColor : 'text-muted-foreground'}`}>
        {power}%
      </div>
      {/* Power bar */}
      <div className="w-full h-1 bg-muted rounded-full mt-1.5">
        <motion.div
          className={`h-full rounded-full ${barColor}`}
          initial={{ width: 0 }}
          animate={{ width: `${power}%` }}
          transition={{ duration: 0.5 }}
          style={{ opacity }}
        />
      </div>
      {active && power > 50 && (
        <motion.div
          className="absolute top-1 right-1"
          animate={{ opacity: [1, 0.3, 1] }}
          transition={{ duration: 0.8, repeat: Infinity }}
        >
          <div className={`w-1.5 h-1.5 rounded-full ${barColor}`} />
        </motion.div>
      )}
    </motion.div>
  );
}
