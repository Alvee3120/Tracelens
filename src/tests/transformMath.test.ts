import { describe, expect, it } from 'vitest';
import {
  DEFAULT_TRANSFORM,
  MAX_SCALE,
  MIN_SCALE,
  angleBetween,
  clampScale,
  fitScale,
  getRenderState,
  isDefaultTransform,
  nudge,
  normalizeAngle,
  toCssTransform,
  transformFromGesture,
  translateBy,
  zoomAround,
  type GestureSample,
  type Transform,
  type Viewport,
} from '@/lib/transformMath';

const VIEWPORT: Viewport = { width: 400, height: 800 };
const CONTENT = { width: 1000, height: 500 };

describe('clampScale', () => {
  it('clamps to the documented 0.1x–10x range', () => {
    expect(clampScale(0.001)).toBe(MIN_SCALE);
    expect(clampScale(50)).toBe(MAX_SCALE);
    expect(clampScale(2.5)).toBe(2.5);
  });
});

describe('fitScale', () => {
  it('fits a wide image inside a tall viewport', () => {
    const scale = fitScale(CONTENT, VIEWPORT, 1);
    // Limited by width: 400 / 1000
    expect(scale).toBeCloseTo(0.4, 6);
  });

  it('fits a tall image inside a tall viewport', () => {
    const scale = fitScale({ width: 200, height: 1600 }, VIEWPORT, 1);
    // Limited by height: 800 / 1600
    expect(scale).toBeCloseTo(0.5, 6);
  });

  it('is safe with degenerate sizes', () => {
    expect(fitScale({ width: 0, height: 0 }, VIEWPORT)).toBe(1);
    expect(fitScale(CONTENT, { width: 0, height: 0 })).toBe(1);
  });
});

describe('normalizeAngle', () => {
  it('wraps into (-180, 180]', () => {
    expect(normalizeAngle(0)).toBe(0);
    expect(normalizeAngle(190)).toBeCloseTo(-170, 6);
    expect(normalizeAngle(-190)).toBeCloseTo(170, 6);
    expect(normalizeAngle(540)).toBeCloseTo(180, 6);
    expect(normalizeAngle(Number.NaN)).toBe(0);
  });
});

describe('angleBetween', () => {
  it('is clockwise-positive in screen coordinates', () => {
    // Vector pointing right→ same direction as CSS rotate(0deg).
    expect(angleBetween({ x: 0, y: 0 }, { x: 1, y: 0 })).toBeCloseTo(0, 6);
    // Vector pointing down is +90 in a y-down coordinate system.
    expect(angleBetween({ x: 0, y: 0 }, { x: 0, y: 1 })).toBeCloseTo(90, 6);
  });
});

describe('transformFromGesture', () => {
  const start: Transform = { x: 0, y: 0, scale: 1, rotation: 0 };

  it('translates by the pointer delta for a single-finger drag', () => {
    const startSample: GestureSample = { distance: 1, angle: 0, midpoint: { x: -50, y: -20 } };
    const currentSample: GestureSample = { distance: 1, angle: 0, midpoint: { x: 30, y: 60 } };

    const next = transformFromGesture(start, startSample, currentSample, VIEWPORT);

    // Delta is (80, 80) px, normalized against viewport size.
    expect(next.x).toBeCloseTo(80 / 400, 6);
    expect(next.y).toBeCloseTo(80 / 800, 6);
    expect(next.scale).toBeCloseTo(1, 6);
    expect(next.rotation).toBeCloseTo(0, 6);
  });

  it('scales by the ratio of finger distances and keeps the midpoint anchored', () => {
    const anchor = { x: 0, y: 0 };
    const startSample: GestureSample = { distance: 100, angle: 0, midpoint: anchor };
    const currentSample: GestureSample = { distance: 200, angle: 0, midpoint: anchor };

    const next = transformFromGesture(start, startSample, currentSample, VIEWPORT);

    expect(next.scale).toBeCloseTo(2, 6);
    // Anchored at the center: no translation drift.
    expect(next.x).toBeCloseTo(0, 6);
    expect(next.y).toBeCloseTo(0, 6);
  });

  it('keeps the content point under the fingers when pinching off-center', () => {
    const offset: Transform = { x: 0.25, y: -0.1, scale: 1, rotation: 0 };
    const startSample: GestureSample = { distance: 100, angle: 0, midpoint: { x: 40, y: -30 } };
    const currentSample: GestureSample = { distance: 150, angle: 0, midpoint: { x: 40, y: -30 } };

    const next = transformFromGesture(offset, startSample, currentSample, VIEWPORT);

    expect(next.scale).toBeCloseTo(1.5, 6);

    // Invariant: the content point that was under the fingers at the start of
    // the pinch must still be under the (unchanged) midpoint.
    const startOffsetX = offset.x * VIEWPORT.width;
    const startOffsetY = offset.y * VIEWPORT.height;
    const contentPointX = startSample.midpoint.x - startOffsetX;
    const contentPointY = startSample.midpoint.y - startOffsetY;

    expect(next.x * VIEWPORT.width + next.scale * contentPointX).toBeCloseTo(
      currentSample.midpoint.x,
      4,
    );
    expect(next.y * VIEWPORT.height + next.scale * contentPointY).toBeCloseTo(
      currentSample.midpoint.y,
      4,
    );
  });

  it('applies twist as a rotation delta', () => {
    const startSample: GestureSample = { distance: 100, angle: 10, midpoint: { x: 0, y: 0 } };
    const currentSample: GestureSample = { distance: 100, angle: 40, midpoint: { x: 0, y: 0 } };

    const next = transformFromGesture(start, startSample, currentSample, VIEWPORT);
    expect(next.rotation).toBeCloseTo(30, 6);
  });

  it('respects the allowScale/allowRotate switches', () => {
    const startSample: GestureSample = { distance: 100, angle: 0, midpoint: { x: 0, y: 0 } };
    const currentSample: GestureSample = { distance: 300, angle: 90, midpoint: { x: 0, y: 0 } };

    const scaleOnly = transformFromGesture(start, startSample, currentSample, VIEWPORT, {
      allowRotate: false,
    });
    expect(scaleOnly.rotation).toBe(0);
    expect(scaleOnly.scale).toBeCloseTo(3, 6);

    const rotateOnly = transformFromGesture(start, startSample, currentSample, VIEWPORT, {
      allowScale: false,
    });
    expect(rotateOnly.scale).toBeCloseTo(1, 6);
    expect(rotateOnly.rotation).toBeCloseTo(90, 6);
  });

  it('never exceeds the scale limits', () => {
    const startSample: GestureSample = { distance: 1, angle: 0, midpoint: { x: 0, y: 0 } };
    const currentSample: GestureSample = { distance: 10_000, angle: 0, midpoint: { x: 0, y: 0 } };
    expect(transformFromGesture(start, startSample, currentSample, VIEWPORT).scale).toBe(MAX_SCALE);
  });
});

describe('translateBy / nudge', () => {
  it('converts pixel deltas into normalized offsets', () => {
    const next = translateBy(DEFAULT_TRANSFORM, { x: 200, y: -400 }, VIEWPORT);
    expect(next.x).toBeCloseTo(0.5, 6);
    expect(next.y).toBeCloseTo(-0.5, 6);
  });

  it('nudges additively', () => {
    const next = nudge({ ...DEFAULT_TRANSFORM, x: 0.1, y: 0.2 }, 0.05, -0.05);
    expect(next.x).toBeCloseTo(0.15, 6);
    expect(next.y).toBeCloseTo(0.15, 6);
  });
});

describe('zoomAround', () => {
  it('zooms about the viewport center without translating', () => {
    const next = zoomAround(DEFAULT_TRANSFORM, { x: 0, y: 0 }, 2, VIEWPORT);
    expect(next.scale).toBeCloseTo(2, 6);
    expect(next.x).toBeCloseTo(0, 6);
    expect(next.y).toBeCloseTo(0, 6);
  });

  it('keeps the anchor point fixed when zooming elsewhere', () => {
    const anchor = { x: 100, y: 200 };
    const before: Transform = { x: 0, y: 0, scale: 1, rotation: 0 };
    const after = zoomAround(before, anchor, 2, VIEWPORT);

    // Screen position of the anchored content point must be unchanged.
    const beforeScreen = { x: before.x * VIEWPORT.width, y: before.y * VIEWPORT.height };
    const afterScreen = { x: after.x * VIEWPORT.width, y: after.y * VIEWPORT.height };
    // point = anchor - offset, so (offset' - offset) = -(scale'-scale) * (anchor - offset)
    expect(afterScreen.x - beforeScreen.x).toBeCloseTo(-(2 - 1) * (anchor.x - beforeScreen.x), 4);
    expect(afterScreen.y - beforeScreen.y).toBeCloseTo(-(2 - 1) * (anchor.y - beforeScreen.y), 4);
  });

  it('rotates about the anchor when asked', () => {
    const next = zoomAround(DEFAULT_TRANSFORM, { x: 0, y: 0 }, 1, VIEWPORT, { rotateBy: 45 });
    expect(next.rotation).toBeCloseTo(45, 6);
    expect(next.scale).toBeCloseTo(1, 6);
  });
});

describe('render state', () => {
  it('multiplies the user scale by the fit scale and expresses translation in px', () => {
    const state = getRenderState({ x: 0.5, y: -0.25, scale: 2, rotation: 30 }, CONTENT, VIEWPORT);
    expect(state.translateX).toBeCloseTo(200, 6);
    expect(state.translateY).toBeCloseTo(-200, 6);
    // fitScale(CONTENT, VIEWPORT) = 0.4 with the default padding of 0.92 → 0.368
    expect(state.scale).toBeCloseTo(0.368 * 2, 6);
    expect(state.rotation).toBe(30);
  });

  it('serializes to a CSS transform string', () => {
    const css = toCssTransform({ translateX: 12.345, translateY: -6.789, scale: 1.23456, rotation: 45.678 });
    expect(css).toBe('translate3d(12.35px, -6.79px, 0) rotate(45.68deg) scale(1.2346)');
  });

  it('detects the default transform', () => {
    expect(isDefaultTransform(DEFAULT_TRANSFORM)).toBe(true);
    expect(isDefaultTransform({ ...DEFAULT_TRANSFORM, x: 0.01 })).toBe(false);
  });
});
