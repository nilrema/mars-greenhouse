import { describe, expect, it, vi } from 'vitest';
import { inspectDisease } from './inspectionApi';
import type { InspectionSelection } from './types';

const selection: InspectionSelection = {
  cameraId: 'CAM-01',
  createdAt: '2026-03-20T10:00:00.000Z',
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

describe('inspectDisease', () => {
  it('posts the cropped image and selection payload to the inspection bridge', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        disease: 'Botrytis',
        riskLevel: 'medium',
        explanation: 'Leaf-edge discoloration is moderately suspicious.',
      }),
    });
    vi.stubGlobal('fetch', fetchMock);

    const result = await inspectDisease('data:image/png;base64,preview', selection);

    expect(fetchMock).toHaveBeenCalledWith(
      '/api/inspect-disease',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({
          imageDataUrl: 'data:image/png;base64,preview',
          selection,
          cameraId: 'CAM-01',
        }),
      })
    );
    expect(result).toEqual({
      disease: 'Botrytis',
      riskLevel: 'medium',
      explanation: 'Leaf-edge discoloration is moderately suspicious.',
    });
  });

  it('throws a useful error when the inspection bridge fails', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: false,
      json: async () => ({
        error: 'Disease inspection failed upstream.',
      }),
    });
    vi.stubGlobal('fetch', fetchMock);

    await expect(inspectDisease('data:image/png;base64,preview', selection)).rejects.toThrow(
      'Disease inspection failed upstream.'
    );
  });
});
