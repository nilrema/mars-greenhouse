import type { CameraViewportState, InspectionSelection, NormalizedInspectionBounds } from './types';

export const MIN_CAMERA_ZOOM = 1;
export const MAX_CAMERA_ZOOM = 4;
export const DEFAULT_CAMERA_ZOOM = 1;

export interface ViewportSize {
  width: number;
  height: number;
}

export interface Point {
  x: number;
  y: number;
}

export interface ScreenRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

const roundTo = (value: number, precision = 4) => Number(value.toFixed(precision));

export function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

export function clampPan(pan: Point, zoom: number, viewport: ViewportSize): Point {
  const maxPanX = ((zoom - 1) * viewport.width) / 2;
  const maxPanY = ((zoom - 1) * viewport.height) / 2;

  return {
    x: clamp(pan.x, -maxPanX, maxPanX),
    y: clamp(pan.y, -maxPanY, maxPanY),
  };
}

export function zoomAroundPoint({
  currentZoom,
  nextZoom,
  pan,
  pointer,
  viewport,
}: {
  currentZoom: number;
  nextZoom: number;
  pan: Point;
  pointer: Point;
  viewport: ViewportSize;
}): Point {
  const centerX = viewport.width / 2;
  const centerY = viewport.height / 2;
  const imageX = (pointer.x - centerX - pan.x) / currentZoom + centerX;
  const imageY = (pointer.y - centerY - pan.y) / currentZoom + centerY;

  return clampPan(
    {
      x: pointer.x - centerX - (imageX - centerX) * nextZoom,
      y: pointer.y - centerY - (imageY - centerY) * nextZoom,
    },
    nextZoom,
    viewport
  );
}

export function rectFromPoints(start: Point, end: Point): ScreenRect {
  const left = Math.min(start.x, end.x);
  const top = Math.min(start.y, end.y);
  return {
    x: left,
    y: top,
    width: Math.abs(end.x - start.x),
    height: Math.abs(end.y - start.y),
  };
}

export function screenPointToImagePoint(point: Point, viewportState: CameraViewportState, viewport: ViewportSize): Point {
  const centerX = viewport.width / 2;
  const centerY = viewport.height / 2;

  return {
    x: clamp((point.x - centerX - viewportState.panX) / viewportState.zoom + centerX, 0, viewport.width),
    y: clamp((point.y - centerY - viewportState.panY) / viewportState.zoom + centerY, 0, viewport.height),
  };
}

export function normalizeSelectionRect(
  rect: ScreenRect,
  viewportState: CameraViewportState,
  viewport: ViewportSize
): NormalizedInspectionBounds {
  const topLeft = screenPointToImagePoint({ x: rect.x, y: rect.y }, viewportState, viewport);
  const bottomRight = screenPointToImagePoint(
    { x: rect.x + rect.width, y: rect.y + rect.height },
    viewportState,
    viewport
  );

  const x = clamp(Math.min(topLeft.x, bottomRight.x) / viewport.width, 0, 1);
  const y = clamp(Math.min(topLeft.y, bottomRight.y) / viewport.height, 0, 1);
  const maxX = clamp(Math.max(topLeft.x, bottomRight.x) / viewport.width, 0, 1);
  const maxY = clamp(Math.max(topLeft.y, bottomRight.y) / viewport.height, 0, 1);
  const width = maxX - x;
  const height = maxY - y;

  return {
    x: roundTo(x),
    y: roundTo(y),
    width: roundTo(width),
    height: roundTo(height),
    centerX: roundTo(x + width / 2),
    centerY: roundTo(y + height / 2),
  };
}

export function createInspectionSelection({
  rect,
  viewportState,
  viewport,
  cameraId,
  createdAt,
}: {
  rect: ScreenRect;
  viewportState: CameraViewportState;
  viewport: ViewportSize;
  cameraId: string;
  createdAt: string;
}): InspectionSelection {
  return {
    cameraId,
    createdAt,
    normalizedBounds: normalizeSelectionRect(rect, viewportState, viewport),
    viewport: {
      zoom: roundTo(viewportState.zoom, 3),
      panX: roundTo(viewportState.panX, 2),
      panY: roundTo(viewportState.panY, 2),
    },
  };
}
