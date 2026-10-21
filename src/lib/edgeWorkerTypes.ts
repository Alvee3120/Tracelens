/** Message contract shared between the main thread and the edge worker. */
import type { Rgb } from '@/lib/edgeDetector';

export interface EdgeJobRequest {
  type: 'detect';
  jobId: number;
  /** RGBA pixels. Transferred to the worker, so it is detached afterwards. */
  buffer: ArrayBuffer;
  width: number;
  height: number;
  threshold: number;
  tint: Rgb;
  blur: boolean;
  dilate: boolean;
}

export interface EdgeJobResult {
  type: 'result';
  jobId: number;
  pixels: ArrayBuffer;
  width: number;
  height: number;
  coverage: number;
  durationMs: number;
}

export interface EdgeJobError {
  type: 'error';
  jobId: number;
  message: string;
}

export type EdgeWorkerResponse = EdgeJobResult | EdgeJobError;
