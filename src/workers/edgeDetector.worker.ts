/// <reference lib="webworker" />
/**
 * Edge detection worker. Keeps the Sobel pipeline off the main thread so the
 * camera preview and gestures stay at 60 fps while an outline is generated.
 *
 * The RGBA buffer arrives as a transferable and the tinted result is posted
 * back as a transferable, so nothing is copied across the thread boundary.
 */
import { detectEdges } from '@/lib/edgeDetector';
import type { EdgeJobRequest, EdgeWorkerResponse } from '@/lib/edgeWorkerTypes';

const scope = self as DedicatedWorkerGlobalScope;

scope.onmessage = (event: MessageEvent<EdgeJobRequest>) => {
  const message = event.data;
  if (!message || message.type !== 'detect') return;

  const startedAt = performance.now();

  try {
    const source = new Uint8ClampedArray(message.buffer);
    const result = detectEdges(source, message.width, message.height, {
      threshold: message.threshold,
      tint: message.tint,
      blur: true,
      dilate: true,
    });

    const response: EdgeWorkerResponse = {
      type: 'result',
      jobId: message.jobId,
      pixels: result.pixels.buffer as ArrayBuffer,
      width: message.width,
      height: message.height,
      coverage: result.coverage,
      durationMs: performance.now() - startedAt,
    };

    scope.postMessage(response, [response.pixels]);
  } catch (error) {
    const response: EdgeWorkerResponse = {
      type: 'error',
      jobId: message.jobId,
      message: error instanceof Error ? error.message : 'Edge detection failed',
    };
    scope.postMessage(response);
  }
};

export {};
