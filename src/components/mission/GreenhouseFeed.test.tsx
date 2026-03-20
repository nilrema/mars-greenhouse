import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { GreenhouseFeed } from './GreenhouseFeed';
import type { InspectionSelection, MarsBase } from './types';

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

const initialSelection: InspectionSelection = {
  cameraId: 'CAM-01',
  createdAt: '2026-03-19T10:00:00.000Z',
  normalizedBounds: {
    x: 0.2,
    y: 0.3,
    width: 0.25,
    height: 0.2,
    centerX: 0.325,
    centerY: 0.4,
  },
  viewport: {
    zoom: 1.25,
    panX: 0,
    panY: 0,
  },
};

describe('GreenhouseFeed', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

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
    expect(viewport.className).not.toContain('cursor-crosshair');

    vi.useRealTimers();
  });

  it('opens and closes the inspection popup from the selected target', () => {
    const { rerender } = render(<GreenhouseFeed base={base} initialSelection={initialSelection} />);

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
    rerender(<GreenhouseFeed base={base} initialSelection={initialSelection} />);

    fireEvent.click(screen.getByTestId('inspection-selection'));
    expect(screen.getByText(/Inspection Target Preview/i)).toBeInTheDocument();
    expect(screen.getByTestId('inspection-preview-image')).toBeInTheDocument();
    expect((screen.getByTestId('inspection-preview-image') as HTMLImageElement).src).toContain('data:image/png;base64,preview');
    expect(screen.getByTestId('inspection-preview-image')).toHaveClass('object-contain');
    expect(screen.getByTestId('inspection-preview-frame')).toHaveClass('h-[min(62vh,480px)]', 'w-full');

    fireEvent.click(screen.getByRole('button', { name: /Close/i }));
    expect(screen.queryByText(/Inspection Target Preview/i)).not.toBeInTheDocument();
  });

  it('requests a disease inspection and renders the concise result in the popup', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        disease: 'Powdery mildew',
        riskLevel: 'high',
        explanation: 'White surface spotting suggests a likely fungal outbreak.',
      }),
    });
    vi.stubGlobal('fetch', fetchMock);

    const { rerender } = render(<GreenhouseFeed base={base} initialSelection={initialSelection} />);
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
    rerender(<GreenhouseFeed base={base} initialSelection={initialSelection} />);

    fireEvent.click(screen.getByTestId('inspection-selection'));
    fireEvent.click(screen.getByTestId('inspect-disease-button'));

    await waitFor(() => {
      expect(screen.getByTestId('inspection-assessment')).toHaveTextContent('Disease: Powdery mildew');
    });
    expect(screen.getByTestId('inspection-assessment')).toHaveTextContent('Risk: high');
    expect(screen.getByTestId('inspection-assessment')).toHaveTextContent(
      'White surface spotting suggests a likely fungal outbreak.'
    );
    expect(fetchMock).toHaveBeenCalledWith(
      '/api/inspect-disease',
      expect.objectContaining({
        method: 'POST',
      })
    );
  });

  it('shows an error message when the disease inspection request fails', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: false,
      json: async () => ({
        error: 'Knowledge base unavailable.',
      }),
    });
    vi.stubGlobal('fetch', fetchMock);

    const { rerender } = render(<GreenhouseFeed base={base} initialSelection={initialSelection} />);
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
    rerender(<GreenhouseFeed base={base} initialSelection={initialSelection} />);

    fireEvent.click(screen.getByTestId('inspection-selection'));
    fireEvent.click(screen.getByTestId('inspect-disease-button'));

    await waitFor(() => {
      expect(screen.getByTestId('inspection-error')).toHaveTextContent('Knowledge base unavailable.');
    });
  });

  it('lets reset and clear controls work while zoomed in', () => {
    render(<GreenhouseFeed base={base} initialSelection={initialSelection} />);

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

    const clearButton = screen.getByRole('button', { name: /Clear target/i });
    fireEvent.pointerDown(clearButton, { pointerId: 2, clientX: 160, clientY: 104 });
    fireEvent.pointerUp(clearButton, { pointerId: 2, clientX: 160, clientY: 104 });
    fireEvent.click(clearButton);
    expect(screen.queryByTestId('inspection-selection')).not.toBeInTheDocument();
    expect(screen.getByText(/NO AREA SELECTED/i)).toBeInTheDocument();

    fireEvent.wheel(viewport, { deltaY: -100, clientX: 100, clientY: 60 });
    fireEvent.click(screen.getByRole('button', { name: /Inspect area/i }));

    const resetButton = screen.getByRole('button', { name: /Reset view/i });
    fireEvent.pointerDown(resetButton, { pointerId: 3, clientX: 120, clientY: 104 });
    fireEvent.pointerUp(resetButton, { pointerId: 3, clientX: 120, clientY: 104 });
    fireEvent.click(resetButton);

    expect(screen.getByText(/CAM-01 · 1.00x/i)).toBeInTheDocument();
    expect(viewport.className).not.toContain('cursor-crosshair');
  });
});
