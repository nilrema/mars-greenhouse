import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { SimulationPanel } from './SimulationPanel';
import type { SimulationParams } from './types';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';

interface TopNavProps {
  chaosActive: boolean;
  simParams: SimulationParams;
  onSimChange: (params: SimulationParams) => void;
}

export function TopNav({ chaosActive, simParams, onSimChange }: TopNavProps) {
  const [solTime, setSolTime] = useState('14:22:07');
  const [simOpen, setSimOpen] = useState(false);

  useEffect(() => {
    const interval = setInterval(() => {
      const date = new Date();
      setSolTime(
        `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}:${String(date.getSeconds()).padStart(2, '0')}`
      );
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  return (
    <header className="h-11 border-b border-border bg-card flex items-center justify-between px-5 shrink-0">
      <div className="flex items-center gap-5">
        <div className="flex items-center gap-2.5">
          <div className="flex gap-0.5">
            <div className="w-1.5 h-3.5 bg-syngenta-green rounded-sm" style={{ transform: 'rotate(-12deg)' }} />
            <div className="w-1.5 h-3.5 bg-syngenta-blue rounded-sm" style={{ transform: 'rotate(12deg)' }} />
          </div>
          <span className="text-[13px] font-semibold text-syngenta-green tracking-wide">Syngenta</span>
          <span className="text-[11px] text-muted-foreground">Mars Agricultural Control</span>
        </div>
        <div className="h-4 w-px bg-border" />
        <TelemetryItem label="Sol" value="428" />
        <TelemetryItem label="MTC" value={solTime} />
        <TelemetryItem label="Latency" value="14m 22s" />
      </div>

      <div className="flex items-center gap-4">
        <Dialog open={simOpen} onOpenChange={setSimOpen}>
          <DialogTrigger asChild>
            <motion.button
              className="px-3 py-1 bg-primary text-primary-foreground text-[10px] font-medium rounded hover:bg-primary/90 flex items-center gap-1.5"
              whileTap={{ scale: 0.95 }}
            >
              🔧 Simulation
            </motion.button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[480px] bg-card border-border">
            <DialogHeader>
              <DialogTitle className="text-[14px]">Environment Simulation</DialogTitle>
            </DialogHeader>
            <SimulationPanel
              params={simParams}
              onConfirm={(params) => {
                onSimChange(params);
                setSimOpen(false);
              }}
            />
          </DialogContent>
        </Dialog>
        <TelemetryItem label="Crew" value="6" />
        <TelemetryItem label="O₂" value="21.3%" />
        <div className="flex items-center gap-2">
          <div className={`status-led ${chaosActive ? 'bg-destructive' : 'bg-success'}`} />
          <span className={`text-[11px] font-medium ${chaosActive ? 'text-destructive' : 'text-success'}`}>
            {chaosActive ? 'Alert Active' : 'Nominal'}
          </span>
        </div>
      </div>
    </header>
  );
}

function TelemetryItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center gap-1.5">
      <span className="text-[10px] text-muted-foreground">{label}</span>
      <span className="text-[11px] font-mono text-foreground tabular-nums">{value}</span>
    </div>
  );
}
