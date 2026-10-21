/**
 * Image decode / downscale / rasterize helpers.
 *
 * All decoding goes through `createImageBitmap` so EXIF orientation is applied
 * ("from-image") and work happens off the main thread where the browser
 * supports it. Every function is careful to close bitmaps and revoke object
 * URLs it creates.
 */
import { supportsOffscreenCanvas } from '@/lib/capabilities';

export interface DecodedImage {
  bitmap: ImageBitmap;
  width: number;
  height: number;
  /** True when the bitmap was resized during decode. */
  downscaled: boolean;
}

export const MAX_PROCESS_LONG_SIDE = 2048;
export const MAX_RECENT_LONG_SIDE = 720;

type Any2DContext = CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D;

function makeCanvas(width: number, height: number): {
  canvas: HTMLCanvasElement | OffscreenCanvas;
  ctx: Any2DContext;
} {
  const w = Math.max(1, Math.round(width));
  const h = Math.max(1, Math.round(height));

  if (supportsOffscreenCanvas()) {
    const canvas = new OffscreenCanvas(w, h);
    const ctx = canvas.getContext('2d');
    if (ctx) return { canvas, ctx };
  }

  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('2D canvas context unavailable');
  return { canvas, ctx };
}

export async function createBitmapFromBlob(source: Blob): Promise<ImageBitmap> {
  try {
    // `imageOrientation: 'from-image'` bakes EXIF rotation into the pixels.
    return await createImageBitmap(source, { imageOrientation: 'from-image' });
  } catch {
    // Safari < 16 rejects the option object entirely.
    return createImageBitmap(source);
  }
}

/** Decodes and (if needed) downsizes so the long side is at most `maxLongSide`. */
export async function decodeImage(
  source: Blob,
  maxLongSide: number = MAX_PROCESS_LONG_SIDE,
): Promise<DecodedImage> {
  const original = await createBitmapFromBlob(source);
  const longSide = Math.max(original.width, original.height);

  if (longSide <= maxLongSide) {
    return {
      bitmap: original,
      width: original.width,
      height: original.height,
      downscaled: false,
    };
  }

  const ratio = maxLongSide / longSide;
  const width = Math.max(1, Math.round(original.width * ratio));
  const height = Math.max(1, Math.round(original.height * ratio));

  const { canvas, ctx } = makeCanvas(width, height);
  ctx.drawImage(original, 0, 0, width, height);
  original.close();

  const bitmap =
    canvas instanceof OffscreenCanvas
      ? canvas.transferToImageBitmap()
      : await createImageBitmap(canvas);

  return { bitmap, width, height, downscaled: true };
}

export interface ImageDataOptions {
  /** Fill color used to flatten transparency before processing. */
  background?: string;
}

export function bitmapToImageData(bitmap: ImageBitmap, options: ImageDataOptions = {}): ImageData {
  const { ctx } = makeCanvas(bitmap.width, bitmap.height);
  if (options.background) {
    ctx.fillStyle = options.background;
    ctx.fillRect(0, 0, bitmap.width, bitmap.height);
  }
  ctx.drawImage(bitmap, 0, 0);
  return ctx.getImageData(0, 0, bitmap.width, bitmap.height);
}

export interface RasterResult {
  blob: Blob;
  width: number;
  height: number;
}

function loadSvgImage(svg: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(new Blob([svg], { type: 'image/svg+xml;charset=utf-8' }));
    const image = new Image();
    image.decoding = 'async';
    image.onload = () => {
      URL.revokeObjectURL(url);
      resolve(image);
    };
    image.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('SVG failed to rasterize'));
    };
    image.src = url;
  });
}

async function canvasToBlob(
  canvas: HTMLCanvasElement | OffscreenCanvas,
  type = 'image/png',
  quality = 0.92,
): Promise<Blob> {
  if (canvas instanceof OffscreenCanvas) {
    return canvas.convertToBlob({ type, quality });
  }
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error('canvas.toBlob returned null'))),
      type,
      quality,
    );
  });
}

/** Rasterizes an inline SVG string to a PNG blob (white background by default). */
export async function rasterizeSvg(
  svg: string,
  size = 1024,
  background = '#ffffff',
): Promise<RasterResult> {
  const image = await loadSvgImage(svg);
  const { canvas, ctx } = makeCanvas(size, size);
  if (background) {
    ctx.fillStyle = background;
    ctx.fillRect(0, 0, size, size);
  }
  ctx.drawImage(image, 0, 0, size, size);
  const blob = await canvasToBlob(canvas);
  return { blob, width: size, height: size };
}

/** Re-encodes a blob down to a thumbnail-friendly size for the recents strip. */
export async function downscaleBlob(
  source: Blob,
  maxLongSide: number = MAX_RECENT_LONG_SIDE,
  type = 'image/png',
): Promise<RasterResult> {
  const decoded = await decodeImage(source, maxLongSide);
  const { canvas, ctx } = makeCanvas(decoded.width, decoded.height);
  ctx.drawImage(decoded.bitmap, 0, 0);
  decoded.bitmap.close();
  const blob = await canvasToBlob(canvas, type, 0.9);
  return { blob, width: decoded.width, height: decoded.height };
}

export interface RgbaBuffer {
  data: Uint8ClampedArray;
  width: number;
  height: number;
}

/** Extracts a transferable RGBA buffer from a bitmap, flattened onto a background. */
export function bitmapToRgbaBuffer(bitmap: ImageBitmap, background = '#ffffff'): RgbaBuffer {
  const imageData = bitmapToImageData(bitmap, { background });
  return { data: imageData.data, width: imageData.width, height: imageData.height };
}

export function createObjectUrl(blob: Blob): string {
  return URL.createObjectURL(blob);
}

export function revokeObjectUrl(url: string | null | undefined): void {
  if (!url) return;
  try {
    URL.revokeObjectURL(url);
  } catch {
    /* nothing to revoke */
  }
}

export function closeBitmap(bitmap: ImageBitmap | null | undefined): void {
  if (!bitmap) return;
  try {
    bitmap.close();
  } catch {
    /* already closed */
  }
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function isImageFile(file: File): boolean {
  return file.type.startsWith('image/');
}
