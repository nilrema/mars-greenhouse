import { useEffect, useMemo, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import greenhouseImg from '@/assets/greenhouse-topdown.png';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import {
  clamp,
  clampPan,
  createInspectionPreviewDataUrl,
  createInspectionSelection,
  DEFAULT_CAMERA_ZOOM,
  MAX_CAMERA_ZOOM,
  MIN_CAMERA_ZOOM,
  rectFromPoints,
  selectionToViewportRect,
  zoomAroundPoint,
} from './liveInspection';
import { inspectDisease } from './inspectionApi';
import type { CameraViewportState, DiseaseInspectionAssessment, InspectionSelection, MarsBase } from './types';
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

function isCameraActionTarget(target: EventTarget | null) {
  return target instanceof HTMLElement && Boolean(target.closest('[data-camera-action="true"]'));
}

export function GreenhouseFeed({ base, initialSelection = null }: GreenhouseFeedProps) {
  const viewportRef = useRef<HTMLDivElement | null>(null);
  const imageRef = useRef<HTMLImageElement | null>(null);
  const [viewportState, setViewportState] = useState<CameraViewportState>(initialSelection?.viewport ?? defaultViewportState);
  const [cameraMode, setCameraMode] = useState<CameraMode>('pan');
  const [dragState, setDragState] = useState<DragState | null>(null);
  const [selectionDraft, setSelectionDraft] = useState<SelectionDraft | null>(null);
  const [selection, setSelection] = useState<InspectionSelection | null>(initialSelection);
  const [inspectionDialogOpen, setInspectionDialogOpen] = useState(false);
  const [inspectionPreviewUrl, setInspectionPreviewUrl] = useState<string | null>(null);
  const [inspectionAssessment, setInspectionAssessment] = useState<DiseaseInspectionAssessment | null>(null);
  const [inspectionLoading, setInspectionLoading] = useState(false);
  const [inspectionError, setInspectionError] = useState<string | null>(null);

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
    if (isCameraActionTarget(event.target)) {
      return;
    }

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
    setCameraMode('pan');
    setInspectionDialogOpen(false);
  };

  const clearSelection = () => {
    setSelection(null);
    setSelectionDraft(null);
    setCameraMode('pan');
    setInspectionDialogOpen(false);
    setInspectionPreviewUrl(null);
    setInspectionAssessment(null);
    setInspectionError(null);
    setInspectionLoading(false);
  };

  const handleInspectDisease = async () => {
    if (!selection || !inspectionPreviewUrl) {
      setInspectionError('Open a valid inspection crop before requesting disease analysis.');
      return;
    }

    setInspectionLoading(true);
    setInspectionError(null);

    try {
      const assessment = await inspectDisease(inspectionPreviewUrl, selection);
      setInspectionAssessment(assessment);
    } catch (error) {
      setInspectionError(error instanceof Error ? error.message : 'Disease inspection failed.');
      setInspectionAssessment(null);
    } finally {
      setInspectionLoading(false);
    }
  };

  useEffect(() => {
    if (!inspectionDialogOpen || !selection || !viewportRef.current || !imageRef.current) {
      return;
    }

    const { width, height } = viewportRef.current.getBoundingClientRect();
    if (!width || !height) {
      return;
    }

    setInspectionPreviewUrl(
      createInspectionPreviewDataUrl({
        image: imageRef.current,
        selection,
        viewport: { width, height },
      })
    );
  }, [inspectionDialogOpen, selection]);

  useEffect(() => {
    setInspectionAssessment(null);
    setInspectionError(null);
    setInspectionLoading(false);
  }, [selection]);

  const riskTone =
    inspectionAssessment?.riskLevel === 'high'
      ? 'text-red-300'
      : inspectionAssessment?.riskLevel === 'medium'
        ? 'text-amber-200'
        : 'text-emerald-200';

  return (
    <div className="panel h-full flex flex-col overflow-hidden p-0">
      <div className="flex items-center justify-between gap-2 border-b border-border/80 bg-card/85 px-4 py-3">
        <div className="flex items-center gap-2">
          <motion.div
            className="w-2 h-2 rounded-full bg-destructive"
            animate={{ opacity: [1, 0.3, 1] }}
            transition={{ duration: 1.2, repeat: Infinity }}
          />
          <span className="text-[10px] font-mono text-destructive font-medium tracking-wider">LIVE</span>
          <span className="ml-2 rounded-full border border-border/80 bg-secondary/65 px-2 py-1 text-[9px] text-muted-foreground font-mono">
            {CAMERA_ID} · {viewportState.zoom.toFixed(2)}x
          </span>
        </div>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => setCameraMode('pan')}
            className={`rounded-full px-3 py-1.5 text-[9px] font-semibold uppercase tracking-[0.14em] transition-colors ${
              cameraMode === 'pan' ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground hover:text-foreground'
            }`}
          >
            Pan
          </button>
          <button
            type="button"
            onClick={() => setCameraMode('select')}
            className={`rounded-full px-3 py-1.5 text-[9px] font-semibold uppercase tracking-[0.14em] transition-colors ${
              cameraMode === 'select' ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground hover:text-foreground'
            }`}
          >
            Inspect area
          </button>
        </div>
      </div>

      <div className="relative flex-1 overflow-hidden bg-[#14231c]">
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
            ref={imageRef}
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
              data-camera-action="true"
              className="absolute border border-emerald-200/85 bg-emerald-300/14 shadow-[0_0_0_1px_rgba(167,243,208,0.45)] transition-colors hover:bg-emerald-300/20 focus:outline-none focus:ring-2 focus:ring-emerald-200/70"
              style={{
                left: selectionViewportRect.left,
                top: selectionViewportRect.top,
                width: selectionViewportRect.width,
                height: selectionViewportRect.height,
              }}
              aria-label="Open inspection target"
              data-testid="inspection-selection"
            >
              <div className="absolute -top-6 left-0 rounded-full bg-emerald-200 px-2 py-1 text-[8px] font-mono font-medium tracking-wide text-slate-950">
                INSPECTION TARGET
              </div>
            </button>
          )}

          {selectionOverlay && (
            <div
              className="absolute border border-dashed border-emerald-200/85 bg-emerald-300/12"
              style={{
                left: selectionOverlay.x,
                top: selectionOverlay.y,
                width: selectionOverlay.width,
                height: selectionOverlay.height,
              }}
              data-testid="inspection-selection-draft"
            />
          )}

          <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-[#08110d]/90 via-[#08110d]/25 to-transparent p-3 pt-12">
            <div className="flex items-end justify-between gap-3">
              <div className="flex gap-3">
                {[
                  { label: 'TEMP', value: `${base.environment.temperature}°C`, critical: base.environment.temperature < 15 },
                  { label: 'CO₂', value: `${base.environment.co2}`, critical: false },
                ].map((item) => (
                  <div key={item.label} className="rounded-2xl border border-white/10 bg-black/25 px-3 py-2">
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
                  data-camera-action="true"
                  className="rounded-full border border-white/15 bg-black/35 px-3 py-1.5 text-[9px] font-semibold uppercase tracking-[0.14em] text-white/85 transition-colors hover:bg-black/55"
                >
                  Reset view
                </button>
                <button
                  type="button"
                  onClick={clearSelection}
                  data-camera-action="true"
                  className="rounded-full border border-white/15 bg-black/35 px-3 py-1.5 text-[9px] font-semibold uppercase tracking-[0.14em] text-white/85 transition-colors hover:bg-black/55"
                  disabled={!selection}
                >
                  Clear target
                </button>
              </div>
            </div>

            <div className="mt-3 rounded-2xl border border-white/12 bg-black/62 p-3 text-[9px] text-white/88">
              <div className="flex items-center justify-between gap-3">
                <span className="font-mono tracking-wide text-white/70">SELECTION PAYLOAD</span>
                <span className="font-mono text-white/72">{selection ? 'READY FOR CROP AGENT HANDOFF' : 'NO AREA SELECTED'}</span>
              </div>
              <pre className="mt-1 overflow-hidden text-[8px] leading-4 text-emerald-50" data-testid="inspection-selection-json">
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
        <DialogContent className="w-[min(92vw,760px)] max-w-[760px] overflow-hidden border-border/80 bg-card p-0 text-foreground shadow-[0_24px_72px_rgba(15,23,42,0.18)]">
          <DialogHeader className="border-b border-border/80 bg-card px-6 py-5 text-left">
            <div className="pr-8">
              <DialogTitle className="text-[20px] font-semibold tracking-tight text-foreground">Inspection Target Preview</DialogTitle>
              <DialogDescription className="mt-2 text-[13px] leading-relaxed text-muted-foreground">
                Zoomed camera crop centered on the current inspection target.
              </DialogDescription>
            </div>
          </DialogHeader>

          {selection && (
            <div className="p-6 pt-5">
              <div
                className="relative h-[min(62vh,480px)] w-full overflow-hidden rounded-[26px] border border-border/80 bg-[#08110d] shadow-[0_20px_42px_rgba(15,23,42,0.18)]"
                data-testid="inspection-preview-frame"
              >
                {inspectionPreviewUrl ? (
                  <img
                    src={inspectionPreviewUrl}
                    alt="Selected inspection crop"
                    className="absolute inset-0 h-full w-full object-contain select-none"
                    data-testid="inspection-preview-image"
                    draggable={false}
                  />
                ) : (
                  <div className="absolute inset-0 animate-pulse bg-slate-900/80" data-testid="inspection-preview-loading" />
                )}
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.08),transparent_42%)]" />
                <div className="absolute inset-0 bg-gradient-to-t from-slate-950/70 via-transparent to-transparent" />
                <div className="absolute inset-0 border border-emerald-200/50 shadow-[0_0_0_1px_rgba(167,243,208,0.24)]" />
                <div className="absolute bottom-4 left-4 rounded-full border border-white/10 bg-slate-950/80 px-3 py-1.5 text-[10px] font-mono text-emerald-50">
                  {selection.normalizedBounds.width.toFixed(4)}w x {selection.normalizedBounds.height.toFixed(4)}h
                </div>
              </div>

              <div className="mt-5 rounded-[24px] border border-border/80 bg-slate-950/45 p-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                      Disease inspection
                    </div>
                    <div className="mt-1 text-[13px] text-foreground/88">
                      Analyze this cropped region for a quick disease-risk read.
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={handleInspectDisease}
                    data-testid="inspect-disease-button"
                    className="rounded-full border border-emerald-300/40 bg-emerald-400 px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-950 shadow-[0_10px_24px_rgba(52,211,153,0.28)] transition-colors hover:bg-emerald-300 disabled:cursor-not-allowed disabled:border-white/10 disabled:bg-slate-700 disabled:text-slate-300 disabled:shadow-none disabled:opacity-80"
                    disabled={inspectionLoading || !inspectionPreviewUrl}
                  >
                    {inspectionLoading ? 'Inspecting...' : 'Inspect disease'}
                  </button>
                </div>

                {inspectionError && (
                  <div
                    className="mt-4 rounded-2xl border border-red-200/30 bg-red-950/40 px-4 py-3 text-[13px] text-red-100"
                    data-testid="inspection-error"
                  >
                    {inspectionError}
                  </div>
                )}

                {inspectionAssessment && (
                  <div
                    className="mt-4 rounded-2xl border border-emerald-200/20 bg-black/25 px-4 py-3 text-[13px]"
                    data-testid="inspection-assessment"
                  >
                    <div className="flex flex-wrap items-center gap-3">
                      <span className="font-semibold text-foreground">Disease: {inspectionAssessment.disease}</span>
                      <span className={`font-mono uppercase tracking-[0.16em] ${riskTone}`}>
                        Risk: {inspectionAssessment.riskLevel}
                      </span>
                    </div>
                    <p className="mt-2 leading-relaxed text-muted-foreground">{inspectionAssessment.explanation}</p>
                  </div>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
