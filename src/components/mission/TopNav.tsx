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
  temperatureRange: [number, number];
  onSimChange: (params: SimulationParams) => void | Promise<void>;
}

export function TopNav({ chaosActive, simParams, temperatureRange, onSimChange }: TopNavProps) {
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
    <header className="shrink-0 border-b border-slate-800/10 bg-slate-950 px-5 py-3.5 text-slate-50 shadow-[0_12px_32px_rgba(15,23,42,0.18)]">
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-5">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-2xl border border-white/10 bg-white/5 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]">
              <div className="flex gap-0.5">
                <div className="h-3.5 w-1.5 rounded-sm bg-syngenta-green" style={{ transform: 'rotate(-12deg)' }} />
                <div className="h-3.5 w-1.5 rounded-sm bg-syngenta-blue" style={{ transform: 'rotate(12deg)' }} />
              </div>
            </div>
            <div>
              <div className="text-[15px] font-bold tracking-[0.18em] text-white">SYNGENTA</div>
              <div className="text-[11px] uppercase tracking-[0.18em] text-slate-400">Mars Agricultural Control</div>
            </div>
          </div>
          <div className="h-4 w-px bg-white/12" />
          <TelemetryItem label="Sol" value="428" />
          <TelemetryItem label="MTC" value={solTime} />
          <TelemetryItem label="Latency" value="14m 22s" />
        </div>

        <div className="flex items-center gap-4">
          <Dialog open={simOpen} onOpenChange={setSimOpen}>
            <DialogTrigger asChild>
              <motion.button
                className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary px-4 py-2.5 text-[11px] font-semibold uppercase tracking-[0.18em] text-primary-foreground shadow-[0_12px_24px_rgba(34,92,63,0.18)] transition-colors hover:bg-primary/92"
                whileTap={{ scale: 0.95 }}
              >
                Scenario Lab
              </motion.button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[480px] bg-card border-border">
              <DialogHeader>
                <DialogTitle className="text-[14px]">Environment Simulation</DialogTitle>
              </DialogHeader>
              <SimulationPanel
                params={simParams}
                temperatureRange={temperatureRange}
                onConfirm={(params) => {
                  onSimChange(params);
                  setSimOpen(false);
                }}
              />
            </DialogContent>
          </Dialog>
          <div className="flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1.5">
            <div className={`status-led ${chaosActive ? 'bg-destructive' : 'bg-success'}`} />
            <span className={`text-[11px] font-semibold uppercase tracking-[0.18em] ${chaosActive ? 'text-red-300' : 'text-emerald-300'}`}>
              {chaosActive ? 'Alert Active' : 'Nominal'}
            </span>
          </div>
        </div>
      </div>
    </header>
  );
}

function TelemetryItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-2">
      <span className="text-[10px] uppercase tracking-[0.16em] text-slate-400">{label}</span>
      <span className="text-[13px] font-mono font-semibold text-white tabular-nums">{value}</span>
    </div>
  );
}
