import { useMemo, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import greenhouseImg from '@/assets/greenhouse-topdown.png';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import {
  clamp,
  clampPan,
  createInspectionSelection,
  DEFAULT_CAMERA_ZOOM,
  MAX_CAMERA_ZOOM,
  MIN_CAMERA_ZOOM,
  rectFromPoints,
  selectionToViewportRect,
  zoomAroundPoint,
} from './liveInspection';
import type { CameraViewportState, InspectionSelection, MarsBase } from './types';
import type { PointerEvent as ReactPointerEvent, WheelEvent as ReactWheelEvent } from 'react';

const CAMERA_ID = 'CAM-01';
const MIN_SELECTION_SIZE = 18;

type CameraMode = 'pan' | 'select';

interface DragState {
  pointerId: number;
  startX: number;
  startY: number;
  startPanX: number;
  startPanY: number;
}

interface SelectionDraft {
  pointerId: number;
  startX: number;
  startY: number;
  currentX: number;
  currentY: number;
}

const defaultViewportState: CameraViewportState = {
  zoom: DEFAULT_CAMERA_ZOOM,
  panX: 0,
  panY: 0,
};

interface GreenhouseFeedProps {
  base: MarsBase;
  initialSelection?: InspectionSelection | null;
}

export function GreenhouseFeed({ base, initialSelection = null }: GreenhouseFeedProps) {
  const viewportRef = useRef<HTMLDivElement | null>(null);
  const [viewportState, setViewportState] = useState<CameraViewportState>(initialSelection?.viewport ?? defaultViewportState);
  const [cameraMode, setCameraMode] = useState<CameraMode>('pan');
  const [dragState, setDragState] = useState<DragState | null>(null);
  const [selectionDraft, setSelectionDraft] = useState<SelectionDraft | null>(null);
  const [selection, setSelection] = useState<InspectionSelection | null>(initialSelection);
  const [inspectionDialogOpen, setInspectionDialogOpen] = useState(false);

  const selectionOverlay = useMemo(() => {
    if (!selectionDraft) {
      return null;
    }

    return rectFromPoints(
      { x: selectionDraft.startX, y: selectionDraft.startY },
      { x: selectionDraft.currentX, y: selectionDraft.currentY }
    );
  }, [selectionDraft]);

  const selectionViewportRect = (() => {
    if (!selection || !viewportRef.current) {
      return null;
    }

    const { width, height } = viewportRef.current.getBoundingClientRect();
    if (!width || !height) {
      return null;
    }

    const rect = selectionToViewportRect(selection.normalizedBounds, viewportState, { width, height });

    return {
      left: rect.x,
      top: rect.y,
      width: rect.width,
      height: rect.height,
    };
  })();

  const inspectionPreviewScale = useMemo(() => {
    if (!selection) {
      return 1;
    }

    return Math.min(8, Math.max(2.2, 1 / Math.max(selection.normalizedBounds.width, selection.normalizedBounds.height)));
  }, [selection]);

  const handleWheel = (event: ReactWheelEvent<HTMLDivElement>) => {
    event.preventDefault();

    const viewport = viewportRef.current;
    if (!viewport) {
      return;
    }

    const rect = viewport.getBoundingClientRect();
    const pointer = {
      x: event.clientX - rect.left,
      y: event.clientY - rect.top,
    };

    const zoomDelta = event.deltaY < 0 ? 0.25 : -0.25;
    const nextZoom = clamp(viewportState.zoom + zoomDelta, MIN_CAMERA_ZOOM, MAX_CAMERA_ZOOM);

    if (nextZoom === viewportState.zoom) {
      return;
    }

    const nextPan =
      nextZoom === MIN_CAMERA_ZOOM
        ? { x: 0, y: 0 }
        : zoomAroundPoint({
            currentZoom: viewportState.zoom,
            nextZoom,
            pan: { x: viewportState.panX, y: viewportState.panY },
            pointer,
            viewport: { width: rect.width, height: rect.height },
          });

    setViewportState({
      zoom: nextZoom,
      panX: nextPan.x,
      panY: nextPan.y,
    });
  };

  const handlePointerDown = (event: ReactPointerEvent<HTMLDivElement>) => {
    const viewport = viewportRef.current;
    if (!viewport) {
      return;
    }

    const rect = viewport.getBoundingClientRect();
    const point = {
      x: event.clientX - rect.left,
      y: event.clientY - rect.top,
    };

    if (cameraMode === 'select') {
      setSelectionDraft({
        pointerId: event.pointerId,
        startX: point.x,
        startY: point.y,
        currentX: point.x,
        currentY: point.y,
      });
      viewport.setPointerCapture(event.pointerId);
      return;
    }

    if (viewportState.zoom <= MIN_CAMERA_ZOOM) {
      return;
    }

    setDragState({
      pointerId: event.pointerId,
      startX: point.x,
      startY: point.y,
      startPanX: viewportState.panX,
      startPanY: viewportState.panY,
    });
    viewport.setPointerCapture(event.pointerId);
  };

  const handlePointerMove = (event: ReactPointerEvent<HTMLDivElement>) => {
    const viewport = viewportRef.current;
    if (!viewport) {
      return;
    }

    const rect = viewport.getBoundingClientRect();
    const point = {
      x: event.clientX - rect.left,
      y: event.clientY - rect.top,
    };

    if (selectionDraft && selectionDraft.pointerId === event.pointerId) {
      setSelectionDraft({
        ...selectionDraft,
        currentX: clamp(point.x, 0, rect.width),
        currentY: clamp(point.y, 0, rect.height),
      });
      return;
    }

    if (!dragState || dragState.pointerId !== event.pointerId) {
      return;
    }

    const nextPan = clampPan(
      {
        x: dragState.startPanX + (point.x - dragState.startX),
        y: dragState.startPanY + (point.y - dragState.startY),
      },
      viewportState.zoom,
      { width: rect.width, height: rect.height }
    );

    setViewportState((current) => ({
      ...current,
      panX: nextPan.x,
      panY: nextPan.y,
    }));
  };

  const finishSelection = (event: ReactPointerEvent<HTMLDivElement>) => {
    const viewport = viewportRef.current;
    if (!viewport) {
      return;
    }

    if (selectionDraft && selectionDraft.pointerId === event.pointerId) {
      const rect = viewport.getBoundingClientRect();
      const finalRect = rectFromPoints(
        { x: selectionDraft.startX, y: selectionDraft.startY },
        {
          x: clamp(event.clientX - rect.left, 0, rect.width),
          y: clamp(event.clientY - rect.top, 0, rect.height),
        }
      );

      if (finalRect.width >= MIN_SELECTION_SIZE && finalRect.height >= MIN_SELECTION_SIZE) {
        setSelection(
          createInspectionSelection({
            rect: finalRect,
            viewportState,
            viewport: { width: rect.width, height: rect.height },
            cameraId: CAMERA_ID,
            createdAt: new Date().toISOString(),
          })
        );
      }

      setSelectionDraft(null);
      setCameraMode('pan');
      viewport.releasePointerCapture(event.pointerId);
      return;
    }

    if (dragState && dragState.pointerId === event.pointerId) {
      setDragState(null);
      viewport.releasePointerCapture(event.pointerId);
    }
  };

  const handlePointerCancel = (event: ReactPointerEvent<HTMLDivElement>) => {
    const viewport = viewportRef.current;
    if (selectionDraft?.pointerId === event.pointerId) {
      setSelectionDraft(null);
      setCameraMode('pan');
    }

    if (dragState?.pointerId === event.pointerId) {
      setDragState(null);
    }

    if (viewport?.hasPointerCapture(event.pointerId)) {
      viewport.releasePointerCapture(event.pointerId);
    }
  };

  const resetView = () => {
    setViewportState(defaultViewportState);
    setDragState(null);
    setSelectionDraft(null);
  };

  const clearSelection = () => {
    setSelection(null);
    setSelectionDraft(null);
    setCameraMode('pan');
    setInspectionDialogOpen(false);
  };

  return (
    <div className="panel h-full flex flex-col overflow-hidden p-0">
      <div className="flex items-center justify-between gap-2 px-3 py-2 border-b border-border bg-card">
        <div className="flex items-center gap-2">
          <motion.div
            className="w-2 h-2 rounded-full bg-destructive"
            animate={{ opacity: [1, 0.3, 1] }}
            transition={{ duration: 1.2, repeat: Infinity }}
          />
          <span className="text-[10px] font-mono text-destructive font-medium tracking-wider">REC</span>
          <span className="text-[9px] text-muted-foreground font-mono ml-1">
            {CAMERA_ID} · {viewportState.zoom.toFixed(2)}x
          </span>
        </div>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => setCameraMode('pan')}
            className={`rounded px-2 py-1 text-[9px] font-medium transition-colors ${
              cameraMode === 'pan' ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground hover:text-foreground'
            }`}
          >
            Pan
          </button>
          <button
            type="button"
            onClick={() => setCameraMode('select')}
            className={`rounded px-2 py-1 text-[9px] font-medium transition-colors ${
              cameraMode === 'select' ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground hover:text-foreground'
            }`}
          >
            Inspect area
          </button>
        </div>
      </div>

      <div className="flex-1 relative overflow-hidden bg-black">
        <div
          ref={viewportRef}
          className={`absolute inset-0 overflow-hidden ${cameraMode === 'select' ? 'cursor-crosshair' : viewportState.zoom > 1 ? 'cursor-grab active:cursor-grabbing' : 'cursor-default'}`}
          onWheel={handleWheel}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={finishSelection}
          onPointerCancel={handlePointerCancel}
          onPointerLeave={(event) => {
            if (selectionDraft || dragState) {
              return;
            }

            if (viewportRef.current?.hasPointerCapture(event.pointerId)) {
              viewportRef.current.releasePointerCapture(event.pointerId);
            }
          }}
          data-testid="greenhouse-camera-viewport"
        >
          <img
            src={greenhouseImg}
            alt="Greenhouse top-down view"
            className="absolute inset-0 h-full w-full object-cover select-none"
            style={{
              objectPosition: 'center center',
              transform: `translate(${viewportState.panX}px, ${viewportState.panY}px) scale(${viewportState.zoom})`,
              transformOrigin: 'center center',
            }}
            draggable={false}
          />

          {selectionViewportRect && !selectionDraft && (
            <button
              type="button"
              onClick={() => setInspectionDialogOpen(true)}
              className="absolute border border-cyan-200 bg-cyan-400/18 shadow-[0_0_0_1px_rgba(103,232,249,0.55)] transition-colors hover:bg-cyan-300/24 focus:outline-none focus:ring-2 focus:ring-cyan-200/70"
              style={{
                left: selectionViewportRect.left,
                top: selectionViewportRect.top,
                width: selectionViewportRect.width,
                height: selectionViewportRect.height,
              }}
              aria-label="Open inspection target"
              data-testid="inspection-selection"
            >
              <div className="absolute -top-5 left-0 rounded bg-cyan-400/85 px-1.5 py-0.5 text-[8px] font-mono font-medium tracking-wide text-slate-950">
                INSPECTION TARGET
              </div>
            </button>
          )}

          {selectionOverlay && (
            <div
              className="absolute border border-dashed border-cyan-200 bg-cyan-300/15"
              style={{
                left: selectionOverlay.x,
                top: selectionOverlay.y,
                width: selectionOverlay.width,
                height: selectionOverlay.height,
              }}
              data-testid="inspection-selection-draft"
            />
          )}

          <div className="pointer-events-none absolute left-2 top-2 rounded bg-slate-950/55 px-2 py-1 text-[9px] font-mono text-white/80">
            Wheel to zoom. Drag to pan. Use Inspect area to box the crop region.
          </div>

          <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 via-black/15 to-transparent p-2 pt-10">
            <div className="flex items-end justify-between gap-3">
              <div className="flex gap-3">
                {[
                  { label: 'TEMP', value: `${base.environment.temperature}°C`, critical: base.environment.temperature < 15 },
                  { label: 'CO₂', value: `${base.environment.co2}`, critical: false },
                ].map((item) => (
                  <div key={item.label}>
                    <div className="text-[8px] font-mono text-white/35 tracking-widest">{item.label}</div>
                    <div className={`text-[12px] font-mono font-medium ${item.critical ? 'text-red-400' : 'text-white/70'}`}>
                      {item.value}
                    </div>
                  </div>
                ))}
              </div>

              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={resetView}
                  className="rounded border border-white/15 bg-black/35 px-2 py-1 text-[9px] font-medium text-white/85 transition-colors hover:bg-black/55"
                >
                  Reset view
                </button>
                <button
                  type="button"
                  onClick={clearSelection}
                  className="rounded border border-white/15 bg-black/35 px-2 py-1 text-[9px] font-medium text-white/85 transition-colors hover:bg-black/55"
                  disabled={!selection}
                >
                  Clear target
                </button>
              </div>
            </div>

            <div className="mt-2 rounded border border-white/15 bg-black/65 p-2 text-[9px] text-white/88">
              <div className="flex items-center justify-between gap-3">
                <span className="font-mono tracking-wide text-white/70">SELECTION PAYLOAD</span>
                <span className="font-mono text-white/72">{selection ? 'READY FOR CROP AGENT HANDOFF' : 'NO AREA SELECTED'}</span>
              </div>
              <pre className="mt-1 overflow-hidden text-[8px] leading-4 text-cyan-50" data-testid="inspection-selection-json">
                {selection
                  ? JSON.stringify(selection, null, 2)
                  : JSON.stringify(
                      {
                        cameraId: CAMERA_ID,
                        createdAt: null,
                        normalizedBounds: null,
                        viewport: viewportState,
                      },
                      null,
                      2
                    )}
              </pre>
            </div>
          </div>

          <div className="absolute top-2 left-2 w-4 h-4 border-t border-l border-white/15" />
          <div className="absolute top-2 right-2 w-4 h-4 border-t border-r border-white/15" />
          <div className="absolute bottom-[108px] left-2 w-4 h-4 border-b border-l border-white/15" />
          <div className="absolute bottom-[108px] right-2 w-4 h-4 border-b border-r border-white/15" />
        </div>
      </div>

      <Dialog open={inspectionDialogOpen} onOpenChange={setInspectionDialogOpen}>
        <DialogContent className="sm:max-w-[760px] border-border bg-slate-950 p-0 text-white">
          <DialogHeader className="border-b border-white/10 px-5 py-4">
            <DialogTitle className="text-[14px] font-medium text-white">Inspection Target Preview</DialogTitle>
            <DialogDescription className="text-[11px] text-white/65">
              Zoomed camera crop centered on the current inspection target.
            </DialogDescription>
          </DialogHeader>

          {selection && (
            <div className="p-5 pt-0">
              <div className="relative mt-5 aspect-[4/3] overflow-hidden rounded-md border border-cyan-200/15 bg-black">
                <div
                  className="absolute inset-0 bg-cover bg-no-repeat"
                  style={{
                    backgroundImage: `url(${greenhouseImg})`,
                    backgroundSize: `${inspectionPreviewScale * 100}% ${inspectionPreviewScale * 100}%`,
                    backgroundPosition: `${selection.normalizedBounds.centerX * 100}% ${selection.normalizedBounds.centerY * 100}%`,
                  }}
                  data-testid="inspection-preview-image"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-slate-950/55 via-transparent to-transparent" />
                <div className="absolute inset-[12%] border border-cyan-200/65 shadow-[0_0_0_1px_rgba(125,211,252,0.45)]" />
                <div className="absolute bottom-3 left-3 rounded bg-slate-950/80 px-2 py-1 text-[9px] font-mono text-cyan-50">
                  {selection.normalizedBounds.width.toFixed(4)}w · {selection.normalizedBounds.height.toFixed(4)}h
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
