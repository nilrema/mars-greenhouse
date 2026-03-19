import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { GreenhouseFeed } from './GreenhouseFeed';
import type { MarsBase } from './types';

const base: MarsBase = {
  id: 'mars-alpha',
  name: 'Mars Alpha',
  label: 'Alpha',
  status: 'warning',
  production: 72,
  risk: 28,
  crops: [
    {
      name: 'Tomato',
      growthStage: 68,
      daysToHarvest: 12,
      health: 81,
      stressStatus: 'stable',
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

describe('GreenhouseFeed', () => {
  it('supports zooming and exposes an explicit inspection mode', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-03-19T10:00:00.000Z'));

    render(<GreenhouseFeed base={base} />);

    const viewport = screen.getByTestId('greenhouse-camera-viewport');
    Object.defineProperty(viewport, 'getBoundingClientRect', {
      configurable: true,
      value: () => ({
        x: 0,
        y: 0,
        left: 0,
        top: 0,
        right: 200,
        bottom: 120,
        width: 200,
        height: 120,
        toJSON: () => ({}),
      }),
    });

    fireEvent.wheel(viewport, { deltaY: -100, clientX: 100, clientY: 60 });
    expect(screen.getByText(/CAM-01 · 1.25x/i)).toBeInTheDocument();
    expect(screen.getByTestId('inspection-selection-json')).toHaveTextContent('"zoom": 1.25');

    const inspectButton = screen.getByRole('button', { name: /Inspect area/i });
    fireEvent.click(inspectButton);
    expect(viewport.className).toContain('cursor-crosshair');

    fireEvent.click(screen.getByRole('button', { name: /Reset view/i }));
    expect(screen.getByText(/CAM-01 · 1.00x/i)).toBeInTheDocument();
    expect(screen.getByText(/NO AREA SELECTED/i)).toBeInTheDocument();

    vi.useRealTimers();
  });
});
