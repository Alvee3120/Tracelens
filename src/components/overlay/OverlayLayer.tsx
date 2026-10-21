/**
 * The overlay itself: a gesture surface, a transformable image layer, and the
 * grid. Renders the reference image either as-is, through a CSS filter
 * (grayscale/invert), or as worker-generated line art (outline).
 */
import { memo, useCallback, useEffect, useMemo, useRef } from 'react';
import { Loader2, Lock } from 'lucide-react';
import { cn } from '@/lib/cn';
import { strings } from '@/lib/strings';
import { tintRgbFor } from '@/lib/tints';
import { DEFAULT_TRANSFORM, type Transform } from '@/lib/transformMath';
import { registerOverlayController } from '@/lib/overlayController';
import { useTraceStore } from '@/store/useTraceStore';
import { GridOverlay } from '@/components/overlay/GridOverlay';
import { useOverlayGestures } from '@/components/overlay/useOverlayGestures';
import {
  useOutlineProcessor,
  type OutlineSource,
} from '@/components/overlay/useOutlineProcessor';

export interface OutlineStatus {
  isProcessing: boolean;
  coverage: number | null;
  durationMs: number | null;
}

export interface OverlayLayerProps {
  outlineSource: OutlineSource | null;
  initialTransform?: Transform;
  onTransformChange?: (transform: Transform) => void;
  onOutlineStatusChange?: (status: OutlineStatus) => void;
  /** Fired for a tap on the gesture surface (used for tap-to-focus). */
  onTap?: (point: { clientX: number; clientY: number }) => void;
  className?: string;
}

function OverlayLayerComponent({
  outlineSource,
  initialTransform,
  onTransformChange,
  onOutlineStatusChange,
  onTap,
  className,
}: OverlayLayerProps) {
  const contentRef = useRef<HTMLDivElement | null>(null);
  const surfaceRef = useRef<HTMLDivElement | null>(null);

  const imageId = useTraceStore((state) => state.imageId);
  const imageUrl = useTraceStore((state) => state.imageUrl);
  const imageSize = useTraceStore((state) => state.imageSize);
  const mode = useTraceStore((state) => state.mode);
  const opacity = useTraceStore((state) => state.opacity);
  const flipH = useTraceStore((state) => state.flipH);
  const flipV = useTraceStore((state) => state.flipV);
  const locked = useTraceStore((state) => state.locked);
  const hideOverlay = useTraceStore((state) => state.hideOverlay);
  const grid = useTraceStore((state) => state.grid);
  const edgeThreshold = useTraceStore((state) => state.edgeThreshold);
  const tint = useTraceStore((state) => state.tint);

  const commitRef = useRef(onTransformChange);
  commitRef.current = onTransformChange;

  const tintRgb = useMemo(() => tintRgbFor(tint), [tint]);

  const outline = useOutlineProcessor({
    enabled: mode === 'outline',
    source: outlineSource,
    threshold: edgeThreshold,
    tint: tintRgb,
    tintHex: tint,
  });

  const handleTransformCommit = useCallback((transform: Transform) => {
    commitRef.current?.(transform);
  }, []);

  const { handlers, api } = useOverlayGestures({
    contentRef,
    surfaceRef,
    contentSize: imageSize,
    disabled: locked,
    onCommit: handleTransformCommit,
    onTap,
  });

  // Publish imperative commands so buttons and shortcuts never touch state.
  useEffect(() => {
    registerOverlayController({
      reset: api.reset,
      nudge: api.nudge,
      zoomBy: api.zoomBy,
      rotateBy: api.rotateBy,
      getTransform: api.getTransform,
      setTransform: api.setTransform,
    });
    return () => registerOverlayController(null);
  }, [api]);

  // A new image re-seeds the transform (from the restored session, if any).
  // `initialTransform` is read from a ref so late parent renders cannot
  // accidentally re-apply a stale transform over a live gesture.
  const initialTransformRef = useRef(initialTransform);
  initialTransformRef.current = initialTransform;

  useEffect(() => {
    if (!imageId) return;
    api.setTransform(initialTransformRef.current ?? DEFAULT_TRANSFORM);
  }, [api, imageId]);

  const statusChangeRef = useRef(onOutlineStatusChange);
  statusChangeRef.current = onOutlineStatusChange;

  useEffect(() => {
    statusChangeRef.current?.({
      isProcessing: outline.isProcessing,
      coverage: outline.coverage,
      durationMs: outline.durationMs,
    });
  }, [outline.isProcessing, outline.coverage, outline.durationMs]);

  const isOutline = mode === 'outline';
  const source = isOutline ? outline.url : imageUrl;
  const cssFilter = mode === 'grayscale' ? 'grayscale(1)' : mode === 'invert' ? 'invert(1)' : 'none';

  const contentStyle = useMemo(() => {
    const width = imageSize.width || 1;
    const height = imageSize.height || 1;
    return {
      width: `${width}px`,
      height: `${height}px`,
      left: '50%',
      top: '50%',
      marginLeft: `${-width / 2}px`,
      marginTop: `${-height / 2}px`,
    } as const;
  }, [imageSize.width, imageSize.height]);

  const flipStyle = useMemo(
    () => ({ transform: `scale(${flipH ? -1 : 1}, ${flipV ? -1 : 1})` }),
    [flipH, flipV],
  );

  const showOutlineSpinner = isOutline && !source;

  return (
    <div className={cn('absolute inset-0 z-10 overflow-hidden', className)}>
      {source ? (
        <div
          ref={contentRef}
          className="absolute will-change-transform"
          style={contentStyle}
          aria-hidden={hideOverlay}
        >
          <img
            src={source}
            alt={strings.a11y.overlayImage}
            draggable={false}
            decoding="async"
            className="h-full w-full select-none object-contain"
            style={{
              ...flipStyle,
              opacity: hideOverlay ? 0 : opacity,
              filter: cssFilter,
              transition: 'opacity 120ms ease-out',
            }}
          />
        </div>
      ) : null}

      {/* Gesture surface sits above the artwork and owns all pointer input. */}
      <div
        ref={surfaceRef}
        role="application"
        aria-label={strings.a11y.gestureSurface}
        {...handlers}
        className={cn(
          'absolute inset-0 touch-none select-none',
          locked ? 'pointer-events-none cursor-default' : 'cursor-grab active:cursor-grabbing',
        )}
      />

      <GridOverlay
        visible={grid.enabled}
        divisions={grid.divisions}
        color={grid.color}
        thickness={grid.thickness}
      />

      {showOutlineSpinner ? (
        <div
          role="status"
          className="pointer-events-none absolute left-1/2 top-[max(env(safe-area-inset-top),4.5rem)] -translate-x-1/2"
        >
          <div className="flex items-center gap-2 rounded-full border border-white/10 bg-black/60 px-3 py-1.5 text-xs font-medium text-white backdrop-blur-md">
            <Loader2 size={14} className="animate-spin motion-reduce:animate-none" aria-hidden="true" />
            {strings.trace.processing}
          </div>
        </div>
      ) : null}

      {locked ? (
        <div className="pointer-events-none absolute left-1/2 top-[max(env(safe-area-inset-top),4.5rem)] -translate-x-1/2">
          <div className="flex items-center gap-1.5 rounded-full border border-white/10 bg-black/60 px-3 py-1.5 text-xs font-medium text-white backdrop-blur-md">
            <Lock size={13} aria-hidden="true" />
            {strings.trace.lockedNotice}
          </div>
        </div>
      ) : null}
    </div>
  );
}

export const OverlayLayer = memo(OverlayLayerComponent);
