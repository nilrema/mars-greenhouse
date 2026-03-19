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

export interface ImageSize {
  width: number;
  height: number;
}

const roundTo = (value: number, precision = 4) => Number(value.toFixed(precision));
const formatPercent = (value: number) => `${roundTo(value, 4)}%`;

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

export function selectionToViewportRect(
  bounds: NormalizedInspectionBounds,
  viewportState: CameraViewportState,
  viewport: ViewportSize
): ScreenRect {
  const centerX = viewport.width / 2;
  const centerY = viewport.height / 2;
  const left = bounds.x * viewport.width;
  const top = bounds.y * viewport.height;

  return {
    x: (left - centerX) * viewportState.zoom + centerX + viewportState.panX,
    y: (top - centerY) * viewportState.zoom + centerY + viewportState.panY,
    width: bounds.width * viewport.width * viewportState.zoom,
    height: bounds.height * viewport.height * viewportState.zoom,
  };
}

export function getObjectCoverRect(image: ImageSize, viewport: ViewportSize): ScreenRect {
  const scale = Math.max(viewport.width / image.width, viewport.height / image.height);
  const width = image.width * scale;
  const height = image.height * scale;

  return {
    x: (viewport.width - width) / 2,
    y: (viewport.height - height) / 2,
    width,
    height,
  };
}

export function selectionToScreenRect(bounds: NormalizedInspectionBounds, viewport: ViewportSize): ScreenRect {
  return {
    x: bounds.x * viewport.width,
    y: bounds.y * viewport.height,
    width: bounds.width * viewport.width,
    height: bounds.height * viewport.height,
  };
}

export function createInspectionPreviewDataUrl({
  image,
  selection,
  viewport,
}: {
  image: HTMLImageElement;
  selection: InspectionSelection;
  viewport: ViewportSize;
}) {
  const viewportCanvas = document.createElement('canvas');
  viewportCanvas.width = Math.max(1, Math.round(viewport.width));
  viewportCanvas.height = Math.max(1, Math.round(viewport.height));
  const viewportContext = viewportCanvas.getContext('2d');

  if (!viewportContext) {
    return null;
  }

  const imageRect = getObjectCoverRect(
    { width: image.naturalWidth || image.width, height: image.naturalHeight || image.height },
    viewport
  );
  const centerX = viewport.width / 2;
  const centerY = viewport.height / 2;

  viewportContext.save();
  viewportContext.translate(centerX + selection.viewport.panX, centerY + selection.viewport.panY);
  viewportContext.scale(selection.viewport.zoom, selection.viewport.zoom);
  viewportContext.translate(-centerX, -centerY);
  viewportContext.drawImage(image, imageRect.x, imageRect.y, imageRect.width, imageRect.height);
  viewportContext.restore();

  const selectionRect = selectionToViewportRect(selection.normalizedBounds, selection.viewport, viewport);
  const cropCanvas = document.createElement('canvas');
  cropCanvas.width = Math.max(1, Math.round(selectionRect.width));
  cropCanvas.height = Math.max(1, Math.round(selectionRect.height));
  const cropContext = cropCanvas.getContext('2d');

  if (!cropContext) {
    return null;
  }

  cropContext.drawImage(
    viewportCanvas,
    selectionRect.x,
    selectionRect.y,
    selectionRect.width,
    selectionRect.height,
    0,
    0,
    cropCanvas.width,
    cropCanvas.height
  );

  return cropCanvas.toDataURL('image/png');
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
