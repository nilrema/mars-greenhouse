import { describe, expect, it } from 'vitest';
import {
  createInspectionPreviewDataUrl,
  createInspectionSelection,
  getObjectCoverRect,
  normalizeSelectionRect,
  selectionToViewportRect,
} from './liveInspection';

describe('liveInspection helpers', () => {
  it('normalizes a screen-space selection against the current viewport transform', () => {
    const bounds = normalizeSelectionRect(
      { x: 70, y: 50, width: 80, height: 60 },
      { zoom: 2, panX: 20, panY: -10 },
      { width: 200, height: 120 }
    );

    expect(bounds).toEqual({
      x: 0.375,
      y: 0.5,
      width: 0.2,
      height: 0.25,
      centerX: 0.475,
      centerY: 0.625,
    });
  });

  it('captures a reusable inspection payload for future crop-agent handoff', () => {
    const selection = createInspectionSelection({
      rect: { x: 25, y: 20, width: 50, height: 40 },
      viewportState: { zoom: 1.5, panX: 18.456, panY: -4.332 },
      viewport: { width: 200, height: 100 },
      cameraId: 'CAM-01',
      createdAt: '2026-03-19T10:00:00.000Z',
    });

    expect(selection).toEqual({
      cameraId: 'CAM-01',
      createdAt: '2026-03-19T10:00:00.000Z',
      normalizedBounds: {
        x: 0.1885,
        y: 0.3289,
        width: 0.1667,
        height: 0.2667,
        centerX: 0.2718,
        centerY: 0.4622,
      },
      viewport: {
        zoom: 1.5,
        panX: 18.46,
        panY: -4.33,
      },
    });
  });

  it('projects a saved selection back into the active camera transform', () => {
    const rect = selectionToViewportRect(
      {
        x: 0.2,
        y: 0.25,
        width: 0.3,
        height: 0.2,
        centerX: 0.35,
        centerY: 0.35,
      },
      { zoom: 1.5, panX: 30, panY: -12 },
      { width: 200, height: 120 }
    );

    expect(rect).toEqual({
      x: 40,
      y: 3,
      width: 90,
      height: 36,
    });
  });

  it('computes source image cover placement and screen crop rects exactly', () => {
    expect(getObjectCoverRect({ width: 1600, height: 900 }, { width: 200, height: 120 })).toEqual({
      x: -6.666666666666671,
      y: 0,
      width: 213.33333333333334,
      height: 120,
    });

    expect(
      selectionToViewportRect(
        {
          x: 0.2,
          y: 0.3,
          width: 0.25,
          height: 0.2,
          centerX: 0.325,
          centerY: 0.4,
        },
        { zoom: 1, panX: 0, panY: 0 },
        { width: 200, height: 120 }
      )
    ).toEqual({
      x: 40,
      y: 36,
      width: 50,
      height: 24,
    });
  });

  it('renders and crops the exact selected viewport pixels into a preview image', () => {
    const drawImage = vi.fn();
    const save = vi.fn();
    const restore = vi.fn();
    const translate = vi.fn();
    const scale = vi.fn();
    const getContext = vi
      .fn()
      .mockReturnValueOnce({ drawImage, save, restore, translate, scale })
      .mockReturnValueOnce({ drawImage });
    const toDataURL = vi.fn().mockReturnValue('data:image/png;base64,preview');
    const createElement = vi.spyOn(document, 'createElement');
    createElement
      .mockReturnValueOnce({ width: 0, height: 0, getContext } as unknown as HTMLCanvasElement)
      .mockReturnValueOnce({ width: 0, height: 0, getContext, toDataURL } as unknown as HTMLCanvasElement);

    const image = { naturalWidth: 1600, naturalHeight: 900 } as HTMLImageElement;
    const preview = createInspectionPreviewDataUrl({
      image,
      selection: {
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
          panX: 10,
          panY: -6,
        },
      },
      viewport: { width: 200, height: 120 },
    });

    expect(preview).toBe('data:image/png;base64,preview');
    expect(translate).toHaveBeenNthCalledWith(1, 110, 54);
    expect(scale).toHaveBeenCalledWith(1.25, 1.25);
    expect(drawImage).toHaveBeenNthCalledWith(1, image, -6.666666666666671, 0, 213.33333333333334, 120);
    expect(drawImage).toHaveBeenNthCalledWith(2, expect.anything(), 35, 24, 62.5, 30, 0, 0, 63, 30);

    createElement.mockRestore();
  });
});
