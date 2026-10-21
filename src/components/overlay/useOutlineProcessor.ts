/**
 * Runs the outline (edge detection) pipeline for the overlay.
 *
 * The caller supplies an RGBA source buffer; this hook debounces option
 * changes, delegates to the worker, and hands back an object URL for the
 * tinted, transparent-background line art.
 */
import { useEffect, useMemo, useRef, useState } from 'react';
import type { AppError } from '@/types';
import type { Rgb } from '@/lib/edgeDetector';
import { EdgeWorkerClient, StaleJobError } from '@/lib/edgeWorkerClient';
import { appError } from '@/lib/errors';

export interface OutlineSource {
  id: string;
  buffer: Uint8ClampedArray;
  width: number;
  height: number;
}

export interface UseOutlineProcessorParams {
  enabled: boolean;
  source: OutlineSource | null;
  threshold: number;
  tint: Rgb;
  tintHex: string;
  debounceMs?: number;
}

export interface OutlineProcessorState {
  url: string | null;
  isProcessing: boolean;
  error: AppError | null;
  coverage: number | null;
  durationMs: number | null;
}

async function pixelsToObjectUrl(
  pixels: Uint8ClampedArray,
  width: number,
  height: number,
): Promise<string> {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('2D canvas context unavailable');
  // Copy into a canvas-owned ImageData so we never alias the transferred buffer.
  const imageData = ctx.createImageData(width, height);
  imageData.data.set(pixels);
  ctx.putImageData(imageData, 0, 0);
  const blob = await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (result) => (result ? resolve(result) : reject(new Error('Outline encode failed'))),
      'image/png',
    );
  });
  return URL.createObjectURL(blob);
}

export function useOutlineProcessor({
  enabled,
  source,
  threshold,
  tint,
  tintHex,
  debounceMs = 300,
}: UseOutlineProcessorParams): OutlineProcessorState {
  const clientRef = useRef<EdgeWorkerClient | null>(null);
  const urlRef = useRef<string | null>(null);
  const [state, setState] = useState<Omit<OutlineProcessorState, 'url'>>({
    isProcessing: false,
    error: null,
    coverage: null,
    durationMs: null,
  });
  const [url, setUrl] = useState<string | null>(null);

  // One worker per mounted overlay; terminated on unmount.
  useEffect(() => {
    const client = new EdgeWorkerClient();
    clientRef.current = client;
    return () => {
      client.terminate();
      clientRef.current = null;
      if (urlRef.current) {
        URL.revokeObjectURL(urlRef.current);
        urlRef.current = null;
      }
    };
  }, []);

  const cacheKey = useMemo(
    () =>
      source
        ? `${source.id}:outline:${threshold.toFixed(3)}:${tintHex}:${source.width}x${source.height}`
        : null,
    [source, threshold, tintHex],
  );

  useEffect(() => {
    const client = clientRef.current;
    if (!client) return;

    const releaseUrl = () => {
      if (urlRef.current) {
        URL.revokeObjectURL(urlRef.current);
        urlRef.current = null;
        setUrl(null);
      }
    };

    if (!enabled || !source || !cacheKey) {
      releaseUrl();
      setState({ isProcessing: false, error: null, coverage: null, durationMs: null });
      return;
    }

    let cancelled = false;
    setState((prev) => ({ ...prev, isProcessing: true, error: null }));

    const timer = window.setTimeout(() => {
      void (async () => {
        try {
          const outcome = await client.run({
            cacheKey,
            buffer: source.buffer,
            width: source.width,
            height: source.height,
            threshold,
            tint,
          });
          if (cancelled) return;

          const nextUrl = await pixelsToObjectUrl(outcome.pixels, outcome.width, outcome.height);
          if (cancelled) {
            URL.revokeObjectURL(nextUrl);
            return;
          }

          releaseUrl();
          urlRef.current = nextUrl;
          setUrl(nextUrl);
          setState({
            isProcessing: false,
            error: null,
            coverage: outcome.coverage,
            durationMs: outcome.durationMs,
          });
        } catch (error) {
          if (cancelled || error instanceof StaleJobError) return;
          setState({
            isProcessing: false,
            error: appError(
              'WORKER_FAILED',
              error instanceof Error ? error.message : undefined,
            ),
            coverage: null,
            durationMs: null,
          });
        }
      })();
    }, debounceMs);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [enabled, source, cacheKey, threshold, tint, debounceMs]);

  return { url, ...state };
}
