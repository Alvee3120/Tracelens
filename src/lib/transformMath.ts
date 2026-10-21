/**
 * Transform math for the overlay layer.
 *
 * The overlay transform is stored in *normalized* coordinates: `x`/`y` are
 * fractions of the viewport width/height measured from the center, and `scale`
 * is a multiplier on top of a fit-to-screen base scale. Because nothing is
 * stored in pixels, the transform survives device rotation and viewport
 * resizes without drifting.
 *
 * Every function here is pure so it can be unit tested without a DOM.
 */

export interface Point {
  x: number;
  y: number;
}

export interface Size {
  width: number;
  height: number;
}

export interface Viewport {
  width: number;
  height: number;
}

export interface Transform {
  /** Horizontal offset from the viewport center, as a fraction of its width. */
  x: number;
  /** Vertical offset from the viewport center, as a fraction of its height. */
  y: number;
  /** User scale multiplier applied on top of the fit-to-screen base scale. */
  scale: number;
  /** Clockwise rotation in degrees. Matches the sign convention of CSS `rotate()`. */
  rotation: number;
}

/** A two-pointer (or one-pointer) sample expressed in pixels relative to the viewport center. */
export interface GestureSample {
  /** Distance between the two pointers in pixels (1 for a single-pointer drag). */
  distance: number;
  /** Angle of the pointer pair in degrees, clockwise-positive, y-down. */
  angle: number;
  /** Midpoint of the pointers in pixels relative to the viewport center. */
  midpoint: Point;
}

export const MIN_SCALE = 0.1;
export const MAX_SCALE = 10;
export const FIT_PADDING = 0.92;

export const DEFAULT_TRANSFORM: Transform = Object.freeze({
  x: 0,
  y: 0,
  scale: 1,
  rotation: 0,
});

export function clamp(value: number, min: number, max: number): number {
  if (Number.isNaN(value)) return min;
  return Math.min(Math.max(value, min), max);
}

export function clampScale(scale: number): number {
  return clamp(scale, MIN_SCALE, MAX_SCALE);
}

/** Base scale that makes `content` fit inside `viewport` with a little padding. */
export function fitScale(content: Size, viewport: Viewport, padding: number = FIT_PADDING): number {
  if (content.width <= 0 || content.height <= 0 || viewport.width <= 0 || viewport.height <= 0) {
    return 1;
  }
  return Math.min(viewport.width / content.width, viewport.height / content.height) * padding;
}

export function toRadians(degrees: number): number {
  return (degrees * Math.PI) / 180;
}

export function toDegrees(radians: number): number {
  return (radians * 180) / Math.PI;
}

/** Normalizes an angle to the range (-180, 180]. */
export function normalizeAngle(degrees: number): number {
  if (!Number.isFinite(degrees)) return 0;
  let a = degrees % 360;
  if (a > 180) a -= 360;
  if (a <= -180) a += 360;
  return a;
}

export function distance(a: Point, b: Point): number {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

/**
 * Angle of the vector a→b in degrees. Screen coordinates are y-down, so a
 * positive result is the same direction as a positive CSS `rotate()`.
 */
export function angleBetween(a: Point, b: Point): number {
  return toDegrees(Math.atan2(b.y - a.y, b.x - a.x));
}

export function midpoint(a: Point, b: Point): Point {
  return { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
}

export function rotatePoint(p: Point, radians: number): Point {
  const c = Math.cos(radians);
  const s = Math.sin(radians);
  return { x: p.x * c - p.y * s, y: p.x * s + p.y * c };
}

export function scalePoint(p: Point, factor: number): Point {
  return { x: p.x * factor, y: p.y * factor };
}

export function clampTransform(t: Transform): Transform {
  return {
    x: clamp(t.x, -20, 20),
    y: clamp(t.y, -20, 20),
    scale: clampScale(t.scale),
    rotation: normalizeAngle(t.rotation),
  };
}

/** Pixel-space render state derived from the normalized transform. */
export interface RenderState {
  translateX: number;
  translateY: number;
  scale: number;
  rotation: number;
}

export function getRenderState(
  t: Transform,
  content: Size,
  viewport: Viewport,
  padding: number = FIT_PADDING,
): RenderState {
  return {
    translateX: t.x * viewport.width,
    translateY: t.y * viewport.height,
    scale: fitScale(content, viewport, padding) * t.scale,
    rotation: t.rotation,
  };
}

export function toCssTransform(state: RenderState): string {
  return `translate3d(${round(state.translateX)}px, ${round(state.translateY)}px, 0) rotate(${round(
    state.rotation,
  )}deg) scale(${round(state.scale, 4)})`;
}

function round(value: number, digits = 2): number {
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
}

/**
 * Combined pinch + rotate + drag for a two-pointer gesture.
 *
 * The math anchors the *content point* that was under the fingers when the
 * gesture started, so the image tracks the fingers instead of drifting toward
 * the viewport center:
 *
 *   local   = (1 / startScale) · R(-startRotation) · (startMidpoint − startOffset)
 *   offset' = currentMidpoint − scale' · R(rotation') · local
 *
 * The fit-to-screen base scale is intentionally absent: it multiplies both the
 * start and next scales, so it cancels out of the ratio.
 */
export function transformFromGesture(
  start: Transform,
  startSample: GestureSample,
  currentSample: GestureSample,
  viewport: Viewport,
  options: { allowScale?: boolean; allowRotate?: boolean } = {},
): Transform {
  const allowScale = options.allowScale ?? true;
  const allowRotate = options.allowRotate ?? true;

  const scaleFactor =
    allowScale && startSample.distance > 0 ? currentSample.distance / startSample.distance : 1;
  const nextScale = clampScale(start.scale * scaleFactor);

  const rotationDelta = allowRotate ? normalizeAngle(currentSample.angle - startSample.angle) : 0;
  const nextRotation = normalizeAngle(start.rotation + rotationDelta);

  const startOffset: Point = { x: start.x * viewport.width, y: start.y * viewport.height };
  const a0 = toRadians(start.rotation);
  const a1 = toRadians(nextRotation);

  const displaced: Point = {
    x: startSample.midpoint.x - startOffset.x,
    y: startSample.midpoint.y - startOffset.y,
  };
  const local = scalePoint(rotatePoint(displaced, -a0), 1 / start.scale);
  const rotated = scalePoint(rotatePoint(local, a1), nextScale);
  const nextOffset: Point = {
    x: currentSample.midpoint.x - rotated.x,
    y: currentSample.midpoint.y - rotated.y,
  };

  return clampTransform({
    x: viewport.width > 0 ? nextOffset.x / viewport.width : 0,
    y: viewport.height > 0 ? nextOffset.y / viewport.height : 0,
    scale: nextScale,
    rotation: nextRotation,
  });
}

/** Pure translation by a pixel delta. */
export function translateBy(t: Transform, delta: Point, viewport: Viewport): Transform {
  return clampTransform({
    ...t,
    x: t.x + (viewport.width > 0 ? delta.x / viewport.width : 0),
    y: t.y + (viewport.height > 0 ? delta.y / viewport.height : 0),
  });
}

/** Nudge in normalized units — used by the arrow-key shortcuts. */
export function nudge(t: Transform, dx: number, dy: number): Transform {
  return clampTransform({ ...t, x: t.x + dx, y: t.y + dy });
}

/** Zoom (and optionally rotate) around a cursor/anchor point given in pixels relative to center. */
export function zoomAround(
  t: Transform,
  anchor: Point,
  factor: number,
  viewport: Viewport,
  options: { rotateBy?: number } = {},
): Transform {
  const nextScale = clampScale(t.scale * factor);
  const nextRotation = normalizeAngle(t.rotation + (options.rotateBy ?? 0));
  const a0 = toRadians(t.rotation);
  const a1 = toRadians(nextRotation);
  const offset: Point = { x: t.x * viewport.width, y: t.y * viewport.height };

  const displaced: Point = { x: anchor.x - offset.x, y: anchor.y - offset.y };
  const local = scalePoint(rotatePoint(displaced, -a0), 1 / t.scale);
  const rotated = scalePoint(rotatePoint(local, a1), nextScale);
  const nextOffset: Point = { x: anchor.x - rotated.x, y: anchor.y - rotated.y };

  return clampTransform({
    x: viewport.width > 0 ? nextOffset.x / viewport.width : 0,
    y: viewport.height > 0 ? nextOffset.y / viewport.height : 0,
    scale: nextScale,
    rotation: nextRotation,
  });
}

/** Flip helpers are pure sign changes that compose with the rest of the transform. */
export function isDefaultTransform(t: Transform): boolean {
  return t.x === 0 && t.y === 0 && t.scale === 1 && t.rotation === 0;
}
