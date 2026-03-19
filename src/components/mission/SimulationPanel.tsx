import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Slider } from '@/components/ui/slider';
import type { SimulationParams } from './types';

interface Props {
  params: SimulationParams;
  onConfirm: (params: SimulationParams) => void;
}

export function SimulationPanel({ params, onConfirm }: Props) {
  const [staged, setStaged] = useState<SimulationParams>({ ...params });

  useEffect(() => {
    setStaged({ ...params });
  }, [params]);

  const update = (key: keyof SimulationParams, value: number) => {
    setStaged((previous) => ({ ...previous, [key]: value }));
  };

  const applyPreset = (preset: SimulationParams) => {
    setStaged(preset);
  };

  return (
    <div className="space-y-4">
      <SimSlider
        label="Temperature Drift"
        value={staged.temperatureDrift}
        min={-20}
        max={5}
        unit="°C"
        description="Storm reduces temperature"
        onChange={(value) => update('temperatureDrift', value)}
      />

      <SimSlider
        label="Water Recycling"
        value={staged.waterRecycling}
        min={0}
        max={100}
        unit="%"
        description="Recycling efficiency"
        onChange={(value) => update('waterRecycling', value)}
      />

      <SimSlider
        label="Power Availability"
        value={staged.powerAvailability}
        min={0}
        max={100}
        unit="%"
        description="Solar event impact"
        onChange={(value) => update('powerAvailability', value)}
      />

      <div className="border-t border-border pt-3">
        <div className="text-[10px] text-muted-foreground mb-1.5 uppercase tracking-wide font-medium">
          Quick Scenarios
        </div>
        <div className="flex flex-wrap gap-1.5">
          {[
            { label: 'Dust Storm', values: { temperatureDrift: -8, waterRecycling: 60, powerAvailability: 30 } },
            { label: 'Solar Flare', values: { temperatureDrift: 2, waterRecycling: 100, powerAvailability: 20 } },
            { label: 'Deep Cold', values: { temperatureDrift: -18, waterRecycling: 30, powerAvailability: 50 } },
            { label: 'Nominal', values: { temperatureDrift: 0, waterRecycling: 100, powerAvailability: 100 } },
          ].map((preset) => (
            <motion.button
              key={preset.label}
              onClick={() => applyPreset(preset.values)}
              className="rounded-full border border-border px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-foreground bg-background hover:bg-accent transition-colors"
              whileTap={{ scale: 0.95 }}
            >
              {preset.label}
            </motion.button>
          ))}
        </div>
      </div>

      <motion.button
        onClick={() => onConfirm(staged)}
        className="w-full rounded-full bg-primary py-3 text-[12px] font-semibold uppercase tracking-[0.14em] text-primary-foreground hover:bg-primary/90 transition-colors"
        whileTap={{ scale: 0.97 }}
      >
        Start Simulation
      </motion.button>
    </div>
  );
}

function SimSlider({
  label,
  value,
  min,
  max,
  unit,
  description,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  unit: string;
  description: string;
  onChange: (value: number) => void;
}) {
  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <span className="text-[10px] text-muted-foreground uppercase tracking-wide font-medium">{label}</span>
        <span className="text-[12px] font-mono font-semibold text-foreground">
          {value > 0 ? `+${value}` : value}
          {unit}
        </span>
      </div>
      <Slider
        value={[value]}
        min={min}
        max={max}
        step={1}
        onValueChange={([next]) => onChange(next)}
        className="w-full"
      />
      <div className="text-[9px] text-muted-foreground/60 mt-0.5">{description}</div>
    </div>
  );
}
