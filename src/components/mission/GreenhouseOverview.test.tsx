import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { GreenhouseOverview } from './GreenhouseOverview';
import type { AstronautRecord, MarsBase } from './types';

const base: MarsBase = {
  id: 'mars-alpha',
  name: 'Mars Alpha',
  label: 'Alpha',
  status: 'warning',
  production: 78,
  risk: 22,
  crops: [
    {
      name: 'Tomato',
      growthStage: 68,
      daysToHarvest: 12,
      health: 81,
      stressStatus: 'Stable',
      projectedYield: 2400,
      anomaly: false,
    },
  ],
  environment: {
    temperature: 18,
    humidity: 62,
    co2: 1180,
    light: 74,
    water: 80,
  },
  hardware: {
    heaterActive: false,
    heaterPower: 30,
    irrigationPumpFlow: 55,
    ledBrightness: 70,
  },
};

const astronauts: AstronautRecord[] = [
  {
    name: 'Cmdr. Vasquez',
    avatar: '👩‍🚀',
    role: 'Mission Commander',
    calories: { current: 1820, target: 2200 },
    protein: { current: 72, target: 90 },
    micronutrientScore: 88,
    hydration: 'optimal',
    health: 'nominal',
  },
];

describe('GreenhouseOverview', () => {
  it('shows the technology tab with greenhouse device telemetry', () => {
    render(<GreenhouseOverview base={base} astronauts={astronauts} />);

    fireEvent.click(screen.getByRole('button', { name: /technology/i }));

    expect(screen.getByText('Temperature Sensor')).toBeInTheDocument();
    expect(screen.getByText('Humidity Sensor')).toBeInTheDocument();
    expect(screen.getByText('Water Reservoir Level Sensor')).toBeInTheDocument();
    expect(screen.getByText('Plant Camera')).toBeInTheDocument();
    expect(screen.getByText('Ventilation')).toBeInTheDocument();
    expect(screen.getAllByText('Status').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Power').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Connectivity').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Component Health').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Failure Risk').length).toBeGreaterThan(0);
  });
});
