import { describe, expect, it } from 'vitest';
import {
  computeEdgeMask,
  detectEdges,
  dilateMask,
  downscaleRgba,
  gaussianBlur,
  sobelMagnitude,
  toGrayscale,
  type EdgeDetectorOptions,
} from '@/lib/edgeDetector';

const WIDTH = 64;
const HEIGHT = 64;

/** White canvas with a black square from 16..48 on both axes, flattened onto white. */
function squareScene(): Uint8ClampedArray {
  const data = new Uint8ClampedArray(WIDTH * HEIGHT * 4);
  for (let y = 0; y < HEIGHT; y += 1) {
    for (let x = 0; x < WIDTH; x += 1) {
      const inSquare = x >= 16 && x < 48 && y >= 16 && y < 48;
      const value = inSquare ? 0 : 255;
      const p = (y * WIDTH + x) * 4;
      data[p] = value;
      data[p + 1] = value;
      data[p + 2] = value;
      data[p + 3] = 255;
    }
  }
  return data;
}

function pixelAt(pixels: Uint8ClampedArray, x: number, y: number): [number, number, number, number] {
  const p = (y * WIDTH + x) * 4;
  return [pixels[p] ?? 0, pixels[p + 1] ?? 0, pixels[p + 2] ?? 0, pixels[p + 3] ?? 0];
}

function edgeCount(pixels: Uint8ClampedArray): number {
  let count = 0;
  for (let i = 3; i < pixels.length; i += 4) {
    if ((pixels[i] ?? 0) > 0) count += 1;
  }
  return count;
}

const BASE_OPTIONS: EdgeDetectorOptions = {
  threshold: 0.2,
  tint: { r: 255, g: 0, b: 0 },
  blur: false,
  dilate: false,
};

describe('toGrayscale', () => {
  it('uses Rec.601 luminance', () => {
    const data = new Uint8ClampedArray([255, 255, 255, 255, 0, 0, 0, 255, 255, 0, 0, 255]);
    const gray = toGrayscale(data, 3, 1);
    expect(gray[0]).toBe(255);
    expect(gray[1]).toBe(0);
    // 299/1000 * 255 ≈ 76
    expect(gray[2]).toBeCloseTo(76, 0);
  });
});

describe('sobelMagnitude', () => {
  it('is zero on a flat region', () => {
    const gray = new Uint8ClampedArray(WIDTH * HEIGHT).fill(128);
    const magnitudes = sobelMagnitude(gray, WIDTH, HEIGHT);
    expect(Math.max(...magnitudes)).toBe(0);
  });

  it('peaks on a vertical step edge', () => {
    const gray = new Uint8ClampedArray(WIDTH * HEIGHT);
    for (let y = 0; y < HEIGHT; y += 1) {
      for (let x = 0; x < WIDTH; x += 1) {
        gray[y * WIDTH + x] = x < WIDTH / 2 ? 0 : 255;
      }
    }
    const magnitudes = sobelMagnitude(gray, WIDTH, HEIGHT);
    const atEdge = magnitudes[32 * WIDTH + 32] ?? 0;
    const atFlat = magnitudes[32 * WIDTH + 5] ?? 0;
    expect(atEdge).toBeGreaterThan(0.5);
    expect(atFlat).toBe(0);
  });
});

describe('gaussianBlur', () => {
  it('preserves a constant field', () => {
    const gray = new Uint8ClampedArray(WIDTH * HEIGHT).fill(200);
    const blurred = gaussianBlur(gray, WIDTH, HEIGHT);
    for (let i = 0; i < blurred.length; i += 1) {
      expect(blurred[i]).toBeCloseTo(200, 0);
    }
  });

  it('reduces the gradient across a step edge', () => {
    const gray = new Uint8ClampedArray(WIDTH * HEIGHT);
    for (let i = 0; i < gray.length; i += 1) gray[i] = i % WIDTH < WIDTH / 2 ? 0 : 255;

    const rawEdge = Math.max(...sobelMagnitude(gray, WIDTH, HEIGHT));
    const smoothed = gaussianBlur(gray, WIDTH, HEIGHT);
    const smoothEdge = Math.max(...sobelMagnitude(smoothed, WIDTH, HEIGHT));

    expect(smoothEdge).toBeLessThan(rawEdge);
  });
});

describe('detectEdges', () => {
  it('marks the square outline and leaves the interior transparent', () => {
    const result = detectEdges(squareScene(), WIDTH, HEIGHT, BASE_OPTIONS);

    const [br, bg, bb, ba] = pixelAt(result.pixels, 16, 32);
    expect([br, bg, bb]).toEqual([255, 0, 0]);
    expect(ba).toBe(255);

    const interior = pixelAt(result.pixels, 32, 32);
    expect(interior[3]).toBe(0);

    const background = pixelAt(result.pixels, 2, 2);
    expect(background[3]).toBe(0);
  });

  it('reports coverage between 0 and 1', () => {
    const result = detectEdges(squareScene(), WIDTH, HEIGHT, BASE_OPTIONS);
    expect(result.coverage).toBeGreaterThan(0);
    expect(result.coverage).toBeLessThan(1);
  });

  it('finds fewer edges as the threshold rises', () => {
    const low = detectEdges(squareScene(), WIDTH, HEIGHT, { ...BASE_OPTIONS, threshold: 0.05 });
    const mid = detectEdges(squareScene(), WIDTH, HEIGHT, { ...BASE_OPTIONS, threshold: 0.4 });
    const high = detectEdges(squareScene(), WIDTH, HEIGHT, { ...BASE_OPTIONS, threshold: 0.8 });

    // A hard black/white step is ~0.71 on the normalized scale.
    expect(edgeCount(low.pixels)).toBe(256);
    expect(edgeCount(mid.pixels)).toBeGreaterThan(0);
    expect(edgeCount(high.pixels)).toBe(0);
    expect(edgeCount(low.pixels)).toBeGreaterThanOrEqual(edgeCount(mid.pixels));
    expect(edgeCount(mid.pixels)).toBeGreaterThanOrEqual(edgeCount(high.pixels));
  });

  it('produces more line pixels when dilation is enabled', () => {
    const plain = detectEdges(squareScene(), WIDTH, HEIGHT, BASE_OPTIONS);
    const dilated = detectEdges(squareScene(), WIDTH, HEIGHT, { ...BASE_OPTIONS, dilate: true });
    expect(edgeCount(dilated.pixels)).toBeGreaterThan(edgeCount(plain.pixels));
  });

  it('handles an empty image without throwing', () => {
    const result = detectEdges(new Uint8ClampedArray(0), 0, 0, BASE_OPTIONS);
    expect(result.pixels.length).toBe(0);
    expect(result.coverage).toBe(0);
  });
});

describe('computeEdgeMask', () => {
  it('marks only pixels at or above the threshold', () => {
    const gray = new Uint8ClampedArray(WIDTH * HEIGHT);
    for (let i = 0; i < gray.length; i += 1) gray[i] = i % WIDTH < WIDTH / 2 ? 0 : 255;

    const mask = computeEdgeMask(gray, WIDTH, HEIGHT, { threshold: 0.5 });
    // The single step column lights up; everything flat stays off.
    expect(mask.reduce((sum, value) => sum + value, 0)).toBeGreaterThan(0);
    expect(mask[0]).toBe(0);
  });
});

describe('dilateMask', () => {
  it('grows a single pixel into a 3x3 block', () => {
    const mask = new Uint8Array(5 * 5);
    mask[2 * 5 + 2] = 1;
    const dilated = dilateMask(mask, 5, 5);
    const count = dilated.reduce((sum, value) => sum + value, 0);
    expect(count).toBe(9);
  });
});

describe('downscaleRgba', () => {
  it('averages 2x2 blocks', () => {
    const src = new Uint8ClampedArray(2 * 2 * 4);
    // three black pixels, one white
    for (let i = 0; i < 3; i += 1) {
      src[i * 4 + 3] = 255;
    }
    src[3 * 4] = 255;
    src[3 * 4 + 1] = 255;
    src[3 * 4 + 2] = 255;
    src[3 * 4 + 3] = 255;

    const out = downscaleRgba(src, 2, 2, 1, 1);
    expect(out.length).toBe(4);
    // Uint8ClampedArray rounds 63.75 to 64.
    expect(out[0]).toBe(64);
    expect(out[3]).toBe(255);
  });

  it('returns a copy when the size is unchanged', () => {
    const src = new Uint8ClampedArray([1, 2, 3, 4]);
    const out = downscaleRgba(src, 1, 1, 1, 1);
    expect(Array.from(out)).toEqual([1, 2, 3, 4]);
    expect(out).not.toBe(src);
  });
});
