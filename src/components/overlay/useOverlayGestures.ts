/**
 * Overlay gesture engine.
 *
 * Uses raw Pointer Events rather than a gesture library so that pinch, twist
 * and drag compose predictably in a single unified state machine:
 *   - 1 pointer  → translate
 *   - 2 pointers → pinch (scale) + twist (rotate) anchored between the fingers
 *   - wheel      → zoom, Shift+wheel → rotate (desktop)
 *
 * The transform is applied straight to the DOM node and never stored in React
 * state, so a gesture frame causes zero re-renders. `onCommit` fires once when
 * the gesture ends so the value can be persisted.
 */
import { useCallback, useEffect, useMemo, useRef, type PointerEvent as ReactPointerEvent } from 'react';
import {
  DEFAULT_TRANSFORM,
  angleBetween,
  clampTransform,
  distance,
  getRenderState,
  midpoint,
  nudge as nudgeTransform,
  toCssTransform,
  transformFromGesture,
  zoomAround,
  type GestureSample,
  type Point,
  type Size,
  type Transform,
  type Viewport,
} from '@/lib/transformMath';
import { haptics } from '@/lib/haptics';

export interface UseOverlayGesturesParams {
  /** Element that receives the transform. */
  contentRef: React.RefObject<HTMLElement | null>;
  /** Full-viewport element used both to measure and to capture pointers. */
  surfaceRef: React.RefObject<HTMLElement | null>;
  contentSize: Size;
  /** When true (locked), all gestures are ignored. */
  disabled?: boolean;
  onCommit?: (transform: Transform) => void;
  onGestureStart?: () => void;
  /** Fired for a single-pointer tap that did not turn into a drag. */
  onTap?: (point: { clientX: number; clientY: number }) => void;
}

export interface OverlayGestureApi {
  getTransform: () => Transform;
  setTransform: (transform: Transform) => void;
  reset: () => void;
  nudge: (dx: number, dy: number) => void;
  zoomBy: (factor: number) => void;
  rotateBy: (degrees: number) => void;
}

export interface OverlayGestureHandlers {
  onPointerDown: (event: ReactPointerEvent<HTMLElement>) => void;
  onPointerMove: (event: ReactPointerEvent<HTMLElement>) => void;
  onPointerUp: (event: ReactPointerEvent<HTMLElement>) => void;
  onPointerCancel: (event: ReactPointerEvent<HTMLElement>) => void;
}

interface GestureBaseline {
  transform: Transform;
  sample: GestureSample;
}

const WHEEL_ZOOM_SENSITIVITY = 0.0018;
const WHEEL_ROTATE_SENSITIVITY = 0.25;
/** A press shorter than this that moved less than TAP_SLOP is a tap. */
const TAP_MAX_DURATION_MS = 350;
const TAP_SLOP_PX = 8;

interface TapCandidate {
  pointerId: number;
  clientX: number;
  clientY: number;
  time: number;
}

export function useOverlayGestures({
  contentRef,
  surfaceRef,
  contentSize,
  disabled = false,
  onCommit,
  onGestureStart,
  onTap,
}: UseOverlayGesturesParams): {
  handlers: OverlayGestureHandlers;
  api: OverlayGestureApi;
} {
  const transformRef = useRef<Transform>({ ...DEFAULT_TRANSFORM });
  const pointersRef = useRef<Map<number, Point>>(new Map());
  const baselineRef = useRef<GestureBaseline | null>(null);
  const viewportRef = useRef<Viewport>({ width: 0, height: 0 });
  const tapRef = useRef<TapCandidate | null>(null);

  // Latest values, read from stable callbacks.
  const disabledRef = useRef(disabled);
  disabledRef.current = disabled;
  const contentSizeRef = useRef(contentSize);
  contentSizeRef.current = contentSize;
  const commitRef = useRef(onCommit);
  commitRef.current = onCommit;
  const startRef = useRef(onGestureStart);
  startRef.current = onGestureStart;
  const tapHandlerRef = useRef(onTap);
  tapHandlerRef.current = onTap;

  const applyTransform = useCallback((next: Transform) => {
    const element = contentRef.current;
    if (!element) return;
    const state = getRenderState(next, contentSizeRef.current, viewportRef.current);
    element.style.transform = toCssTransform(state);
  }, [contentRef]);

  const setTransform = useCallback(
    (next: Transform) => {
      transformRef.current = clampTransform(next);
      applyTransform(transformRef.current);
    },
    [applyTransform],
  );

  /** Converts a client point to a point relative to the surface center. */
  const toCenter = useCallback(
    (clientX: number, clientY: number): Point => {
      const surface = surfaceRef.current;
      const rect = surface?.getBoundingClientRect();
      if (!rect) return { x: clientX - window.innerWidth / 2, y: clientY - window.innerHeight / 2 };
      return {
        x: clientX - (rect.left + rect.width / 2),
        y: clientY - (rect.top + rect.height / 2),
      };
    },
    [surfaceRef],
  );

  const sampleFromPointers = useCallback((count: number): GestureSample => {
    const points = Array.from(pointersRef.current.values());
    const first = points[0];
    if (!first) return { distance: 1, angle: 0, midpoint: { x: 0, y: 0 } };
    if (count < 2) return { distance: 1, angle: 0, midpoint: first };
    const second = points[1];
    if (!second) return { distance: 1, angle: 0, midpoint: first };
    return {
      distance: Math.max(distance(first, second), 1),
      angle: angleBetween(first, second),
      midpoint: midpoint(first, second),
    };
  }, []);

  const beginGesture = useCallback(() => {
    baselineRef.current = {
      transform: { ...transformRef.current },
      sample: sampleFromPointers(pointersRef.current.size),
    };
    startRef.current?.();
  }, [sampleFromPointers]);

  const endGesture = useCallback(() => {
    baselineRef.current = null;
    pointersRef.current.clear();
    tapRef.current = null;
    commitRef.current?.(transformRef.current);
  }, []);

  const onPointerDown = useCallback(
    (event: ReactPointerEvent<HTMLElement>) => {
      if (disabledRef.current) return;
      const target = event.currentTarget;
      try {
        target.setPointerCapture(event.pointerId);
      } catch {
        /* capture is best-effort */
      }
      pointersRef.current.set(event.pointerId, toCenter(event.clientX, event.clientY));
      // Only a lone finger can become a tap: a second finger cancels it.
      tapRef.current =
        pointersRef.current.size === 1
          ? {
              pointerId: event.pointerId,
              clientX: event.clientX,
              clientY: event.clientY,
              time: performance.now(),
            }
          : null;
      // Rebasing on every pointerdown makes 1→2 finger transitions seamless.
      beginGesture();
      haptics.trigger('tap');
    },
    [beginGesture, toCenter],
  );

  const onPointerMove = useCallback(
    (event: ReactPointerEvent<HTMLElement>) => {
      if (disabledRef.current) return;
      if (!pointersRef.current.has(event.pointerId)) return;
      pointersRef.current.set(event.pointerId, toCenter(event.clientX, event.clientY));

      const baseline = baselineRef.current;
      if (!baseline) return;

      const pointerCount = pointersRef.current.size;
      const current = sampleFromPointers(pointerCount);
      const next = transformFromGesture(baseline.transform, baseline.sample, current, viewportRef.current, {
        allowScale: pointerCount >= 2,
        allowRotate: pointerCount >= 2,
      });

      transformRef.current = next;
      applyTransform(next);
    },
    [applyTransform, sampleFromPointers, toCenter],
  );

  const onPointerUp = useCallback(
    (event: ReactPointerEvent<HTMLElement>) => {
      if (!pointersRef.current.has(event.pointerId)) return;
      const pendingTap = tapRef.current;
      tapRef.current = null;

      pointersRef.current.delete(event.pointerId);
      try {
        event.currentTarget.releasePointerCapture(event.pointerId);
      } catch {
        /* already released */
      }

      if (pointersRef.current.size === 0) {
        endGesture();
        if (pendingTap && pendingTap.pointerId === event.pointerId) {
          const moved = Math.hypot(
            event.clientX - pendingTap.clientX,
            event.clientY - pendingTap.clientY,
          );
          if (moved <= TAP_SLOP_PX && performance.now() - pendingTap.time <= TAP_MAX_DURATION_MS) {
            tapHandlerRef.current?.({ clientX: event.clientX, clientY: event.clientY });
          }
        }
      } else {
        // A finger lifted from a pinch — rebase so the remaining finger drags.
        beginGesture();
      }
    },
    [beginGesture, endGesture],
  );

  const onPointerCancel = useCallback(
    (event: ReactPointerEvent<HTMLElement>) => {
      if (!pointersRef.current.has(event.pointerId)) return;
      tapRef.current = null;
      pointersRef.current.delete(event.pointerId);
      if (pointersRef.current.size === 0) endGesture();
      else beginGesture();
    },
    [beginGesture, endGesture],
  );

  /* ------------------------------------------------------------- wheel input */

  useEffect(() => {
    const surface = surfaceRef.current;
    if (!surface) return;

    const onWheel = (event: WheelEvent) => {
      if (disabledRef.current) return;
      event.preventDefault();

      const anchor = toCenter(event.clientX, event.clientY);

      if (event.shiftKey) {
        const degrees = -event.deltaY * WHEEL_ROTATE_SENSITIVITY;
        transformRef.current = zoomAround(transformRef.current, anchor, 1, viewportRef.current, {
          rotateBy: degrees,
        });
      } else {
        const factor = Math.exp(-event.deltaY * WHEEL_ZOOM_SENSITIVITY);
        transformRef.current = zoomAround(transformRef.current, anchor, factor, viewportRef.current);
      }

      applyTransform(transformRef.current);
      commitRef.current?.(transformRef.current);
    };

    surface.addEventListener('wheel', onWheel, { passive: false });
    return () => surface.removeEventListener('wheel', onWheel);
  }, [applyTransform, surfaceRef, toCenter]);

  /* ------------------------------------------------- viewport measurement/resize */

  useEffect(() => {
    const surface = surfaceRef.current;
    if (!surface) return;

    const measure = () => {
      const rect = surface.getBoundingClientRect();
      viewportRef.current = { width: rect.width, height: rect.height };
      // Re-project the normalized transform for the new viewport size so the
      // overlay keeps its relative position across rotation and resizes.
      applyTransform(transformRef.current);
    };

    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(surface);
    window.addEventListener('orientationchange', measure);

    return () => {
      observer.disconnect();
      window.removeEventListener('orientationchange', measure);
    };
  }, [applyTransform, surfaceRef]);

  useEffect(() => {
    applyTransform(transformRef.current);
  }, [applyTransform, contentSize]);

  /* ---------------------------------------------------------------- commands */

  const api = useMemo<OverlayGestureApi>(
    () => ({
      getTransform: () => ({ ...transformRef.current }),
      setTransform: (next) => {
        setTransform(next);
        commitRef.current?.(transformRef.current);
      },
      reset: () => {
        setTransform({ ...DEFAULT_TRANSFORM });
        commitRef.current?.(transformRef.current);
      },
      nudge: (dx, dy) => {
        setTransform(nudgeTransform(transformRef.current, dx, dy));
        commitRef.current?.(transformRef.current);
      },
      zoomBy: (factor) => {
        setTransform(
          zoomAround(
            transformRef.current,
            { x: 0, y: 0 },
            factor,
            viewportRef.current,
          ),
        );
        commitRef.current?.(transformRef.current);
      },
      rotateBy: (degrees) => {
        setTransform(
          zoomAround(transformRef.current, { x: 0, y: 0 }, 1, viewportRef.current, {
            rotateBy: degrees,
          }),
        );
        commitRef.current?.(transformRef.current);
      },
    }),
    [setTransform],
  );

  return {
    handlers: { onPointerDown, onPointerMove, onPointerUp, onPointerCancel },
    api,
  };
}
