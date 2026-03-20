import {
  Fan,
  Flame,
  Gauge,
  Lightbulb,
  type LucideIcon,
  Wrench,
} from 'lucide-react';
import type { AgentToolCall, HardwareState, SimulationParams } from './types';

export interface ToolCallBehavior {
  accentClassName: string;
  icon: LucideIcon;
  tileLabel: string;
  applyEffect?: (
    params: SimulationParams,
    toolCall: AgentToolCall
  ) => {
    hardware: Partial<HardwareState>;
    isComplete: boolean;
    nextParams: SimulationParams;
  };
}

const roundToTenth = (value: number) => Math.round(value * 10) / 10;

function numericMetadata(toolCall: AgentToolCall, key: string, fallback: number) {
  const raw = toolCall.metadata?.[key];
  return typeof raw === 'number' && Number.isFinite(raw) ? raw : fallback;
}

export const toolCallCatalog: Record<string, ToolCallBehavior> = {
  turn_on_heater: {
    tileLabel: 'Heat',
    icon: Flame,
    accentClassName: 'border-rose-500/35 bg-[linear-gradient(180deg,rgba(255,237,213,0.92),rgba(254,226,226,0.86))] text-rose-950',
    applyEffect: (params, toolCall) => {
      const targetTemperature = numericMetadata(toolCall, 'targetTemperature', 22);
      const nextTemperature = Math.min(targetTemperature, roundToTenth(params.temperature + 0.6));
      return {
        nextParams: {
          ...params,
          temperature: nextTemperature,
        },
        isComplete: nextTemperature >= targetTemperature,
        hardware: {
          heaterActive: true,
          heaterPower: Math.max(24, Math.min(100, Math.round((targetTemperature - nextTemperature + 1.2) * 24))),
        },
      };
    },
  },
  turn_on_cooling: {
    tileLabel: 'Cool',
    icon: Fan,
    accentClassName: 'border-sky-500/35 bg-[linear-gradient(180deg,rgba(224,242,254,0.94),rgba(219,234,254,0.86))] text-sky-950',
    applyEffect: (params, toolCall) => {
      const targetTemperature = numericMetadata(toolCall, 'targetTemperature', 22);
      const nextTemperature = Math.max(targetTemperature, roundToTenth(params.temperature - 0.6));
      return {
        nextParams: {
          ...params,
          temperature: nextTemperature,
        },
        isComplete: nextTemperature <= targetTemperature,
        hardware: {
          heaterActive: false,
          heaterPower: 0,
        },
      };
    },
  },
  increase_irrigation_pump: {
    tileLabel: 'Pump',
    icon: Gauge,
    accentClassName: 'border-cyan-500/30 bg-[linear-gradient(180deg,rgba(236,254,255,0.94),rgba(207,250,254,0.86))] text-cyan-950',
    applyEffect: (params, toolCall) => {
      const targetWaterRecycling = numericMetadata(toolCall, 'targetWaterRecycling', Math.min(92, params.waterRecycling + 18));
      const nextWaterRecycling = Math.min(targetWaterRecycling, Math.round(params.waterRecycling + 4));
      return {
        nextParams: {
          ...params,
          waterRecycling: nextWaterRecycling,
        },
        isComplete: nextWaterRecycling >= targetWaterRecycling,
        hardware: {
          irrigationPumpFlow: Math.max(72, Math.min(100, nextWaterRecycling + 12)),
        },
      };
    },
  },
  reduce_led_light_usage: {
    tileLabel: 'LED',
    icon: Lightbulb,
    accentClassName: 'border-amber-500/35 bg-[linear-gradient(180deg,rgba(254,249,195,0.94),rgba(253,230,138,0.82))] text-amber-950',
    applyEffect: (params, toolCall) => {
      const targetPowerAvailability = numericMetadata(toolCall, 'targetPowerAvailability', Math.min(100, params.powerAvailability + 20));
      const targetLedBrightness = numericMetadata(toolCall, 'targetLedBrightness', 24);
      const nextPowerAvailability = Math.min(targetPowerAvailability, Math.round(params.powerAvailability + 5));
      return {
        nextParams: {
          ...params,
          powerAvailability: nextPowerAvailability,
        },
        isComplete: nextPowerAvailability >= targetPowerAvailability,
        hardware: {
          ledBrightness: targetLedBrightness,
        },
      };
    },
  },
  replace_humidity_sensor: {
    tileLabel: 'Sensor',
    icon: Wrench,
    accentClassName: 'border-slate-400/35 bg-[linear-gradient(180deg,rgba(248,250,252,0.96),rgba(226,232,240,0.88))] text-slate-900',
  },
  operator_action: {
    tileLabel: 'Task',
    icon: Wrench,
    accentClassName: 'border-slate-400/35 bg-[linear-gradient(180deg,rgba(255,255,255,0.96),rgba(241,245,249,0.88))] text-slate-900',
  },
};

export function getToolCallBehavior(toolCall: AgentToolCall) {
  return toolCallCatalog[toolCall.type] ?? toolCallCatalog.operator_action;
}
