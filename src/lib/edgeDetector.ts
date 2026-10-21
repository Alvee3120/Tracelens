/**
 * Pure Sobel edge detector. Runs identically on the main thread (tests) and
 * inside the Web Worker (production). No DOM, no OpenCV.
 */

export interface Rgb {
  r: number;
  g: number;
  b: number;
}

export interface EdgeDetectorOptions {
  /** Edge sensitivity in the 0..1 range. Lower keeps more edges. */
  threshold: number;
  /** Line color for detected edges. Background stays fully transparent. */
  tint: Rgb;
  /** Apply a 5x5 Gaussian pre-blur to suppress noise. */
  blur: boolean;
  /** Grow lines by one pixel so they survive at low opacity. */
  dilate: boolean;
}

export const DEFAULT_EDGE_OPTIONS: EdgeDetectorOptions = {
  threshold: 0.18,
  tint: { r: 0, g: 0, b: 0 },
  blur: true,
  dilate: true,
};

/**
 * Maximum possible gradient magnitude for 8-bit luma Sobel. Each axis peaks at
 * 4 * 255 (a full step across the 3x3 window), so the magnitude peaks at
 * 255 * sqrt(4² + 4²) = 255 * sqrt(32) ≈ 1442.
 */
const MAX_GRADIENT = 255 * Math.sqrt(32);

export function toGrayscale(src: Uint8ClampedArray, width: number, height: number): Uint8ClampedArray {
  const out = new Uint8ClampedArray(width * height);
  for (let i = 0, p = 0; i < out.length; i += 1, p += 4) {
    const r = src[p] ?? 0;
    const g = src[p + 1] ?? 0;
    const b = src[p + 2] ?? 0;
    out[i] = (r * 299 + g * 587 + b * 114) / 1000;
  }
  return out;
}

const GAUSSIAN_5 = [1, 4, 6, 4, 1] as const;
const GAUSSIAN_5_SUM = 16;

/** Separable 5x5 Gaussian blur over a single-channel buffer. */
export function gaussianBlur(
  gray: Uint8ClampedArray,
  width: number,
  height: number,
): Uint8ClampedArray {
  const temp = new Float32Array(width * height);
  const out = new Uint8ClampedArray(width * height);

  for (let y = 0; y < height; y += 1) {
    const row = y * width;
    for (let x = 0; x < width; x += 1) {
      let sum = 0;
      for (let k = -2; k <= 2; k += 1) {
        const sx = Math.min(width - 1, Math.max(0, x + k));
        sum += (gray[row + sx] ?? 0) * (GAUSSIAN_5[k + 2] ?? 0);
      }
      temp[row + x] = sum / GAUSSIAN_5_SUM;
    }
  }

  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      let sum = 0;
      for (let k = -2; k <= 2; k += 1) {
        const sy = Math.min(height - 1, Math.max(0, y + k));
        sum += (temp[sy * width + x] ?? 0) * (GAUSSIAN_5[k + 2] ?? 0);
      }
      out[y * width + x] = sum / GAUSSIAN_5_SUM;
    }
  }

  return out;
}

/**
 * Sobel gradient magnitude, normalized to 0..1.
 * Returns a Float32Array of `width * height` values.
 */
export function sobelMagnitude(
  gray: Uint8ClampedArray | Float32Array,
  width: number,
  height: number,
): Float32Array {
  const out = new Float32Array(width * height);
  const at = (x: number, y: number): number => {
    const cx = Math.min(width - 1, Math.max(0, x));
    const cy = Math.min(height - 1, Math.max(0, y));
    return gray[cy * width + cx] ?? 0;
  };

  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const tl = at(x - 1, y - 1);
      const tc = at(x, y - 1);
      const tr = at(x + 1, y - 1);
      const ml = at(x - 1, y);
      const mr = at(x + 1, y);
      const bl = at(x - 1, y + 1);
      const bc = at(x, y + 1);
      const br = at(x + 1, y + 1);

      const gx = tr + 2 * mr + br - (tl + 2 * ml + bl);
      const gy = bl + 2 * bc + br - (tl + 2 * tc + tr);
      out[y * width + x] = Math.hypot(gx, gy) / MAX_GRADIENT;
    }
  }

  return out;
}

/** 3x3 binary dilation: an empty pixel becomes an edge if any neighbour is an edge. */
export function dilateMask(mask: Uint8Array, width: number, height: number): Uint8Array {
  const out = new Uint8Array(mask.length);
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      let hit = 0;
      for (let dy = -1; dy <= 1 && hit === 0; dy += 1) {
        for (let dx = -1; dx <= 1; dx += 1) {
          const nx = x + dx;
          const ny = y + dy;
          if (nx < 0 || ny < 0 || nx >= width || ny >= height) continue;
          if (mask[ny * width + nx] === 1) {
            hit = 1;
            break;
          }
        }
      }
      out[y * width + x] = hit;
    }
  }
  return out;
}

export interface EdgeResult {
  /** RGBA pixels: tinted lines with alpha 255, transparent elsewhere. */
  pixels: Uint8ClampedArray;
  /** Fraction of pixels that ended up as lines (for diagnostics / tests). */
  coverage: number;
}

export function computeEdgeMask(
  gray: Uint8ClampedArray | Float32Array,
  width: number,
  height: number,
  options: Pick<EdgeDetectorOptions, 'threshold'>,
): Uint8Array {
  const magnitudes = sobelMagnitude(gray, width, height);
  const mask = new Uint8Array(width * height);
  const threshold = Math.min(1, Math.max(0, options.threshold));

  for (let i = 0; i < magnitudes.length; i += 1) {
    mask[i] = (magnitudes[i] ?? 0) >= threshold ? 1 : 0;
  }
  return mask;
}

/**
 * Full pipeline: grayscale → optional blur → Sobel → threshold → optional
 * dilation → tint. Returns a fresh RGBA buffer that can be transferred.
 */
export function detectEdges(
  src: Uint8ClampedArray,
  width: number,
  height: number,
  options: EdgeDetectorOptions,
): EdgeResult {
  if (width <= 0 || height <= 0) {
    return { pixels: new Uint8ClampedArray(0), coverage: 0 };
  }

  const gray = toGrayscale(src, width, height);
  const smoothed = options.blur ? gaussianBlur(gray, width, height) : gray;

  let mask = computeEdgeMask(smoothed, width, height, options);
  if (options.dilate) mask = dilateMask(mask, width, height);

  const pixels = new Uint8ClampedArray(width * height * 4);
  const { r, g, b } = options.tint;
  let count = 0;

  for (let i = 0, p = 0; i < mask.length; i += 1, p += 4) {
    if (mask[i] === 1) {
      pixels[p] = r;
      pixels[p + 1] = g;
      pixels[p + 2] = b;
      pixels[p + 3] = 255;
      count += 1;
    }
  }

  return { pixels, coverage: count / mask.length };
}

/** Downscale an RGBA buffer with box filtering — used before edge detection. */
export function downscaleRgba(
  src: Uint8ClampedArray,
  srcWidth: number,
  srcHeight: number,
  dstWidth: number,
  dstHeight: number,
): Uint8ClampedArray {
  if (dstWidth === srcWidth && dstHeight === srcHeight) return new Uint8ClampedArray(src);

  const out = new Uint8ClampedArray(dstWidth * dstHeight * 4);
  const xRatio = srcWidth / dstWidth;
  const yRatio = srcHeight / dstHeight;

  for (let y = 0; y < dstHeight; y += 1) {
    const sy0 = Math.floor(y * yRatio);
    const sy1 = Math.min(srcHeight, Math.max(sy0 + 1, Math.floor((y + 1) * yRatio)));
    for (let x = 0; x < dstWidth; x += 1) {
      const sx0 = Math.floor(x * xRatio);
      const sx1 = Math.min(srcWidth, Math.max(sx0 + 1, Math.floor((x + 1) * xRatio)));

      let r = 0;
      let g = 0;
      let b = 0;
      let a = 0;
      let n = 0;
      for (let sy = sy0; sy < sy1; sy += 1) {
        for (let sx = sx0; sx < sx1; sx += 1) {
          const p = (sy * srcWidth + sx) * 4;
          r += src[p] ?? 0;
          g += src[p + 1] ?? 0;
          b += src[p + 2] ?? 0;
          a += src[p + 3] ?? 0;
          n += 1;
        }
      }
      const d = (y * dstWidth + x) * 4;
      out[d] = r / n;
      out[d + 1] = g / n;
      out[d + 2] = b / n;
      out[d + 3] = a / n;
    }
  }

  return out;
}
