/**
 * Thin worker client for edge detection.
 *
 * Responsibilities:
 *  - one long-lived worker, created lazily and terminated on unmount
 *  - 300 ms debounce on option changes (threshold / tint) driven by the caller
 *  - stale-job cancellation: results whose jobId is no longer the latest are dropped
 *  - an in-memory LRU of processed blobs keyed by image + options
 */
import type { Rgb } from '@/lib/edgeDetector';
import { LruCache } from '@/lib/lru';
import type { EdgeJobRequest, EdgeWorkerResponse } from '@/lib/edgeWorkerTypes';

export interface EdgeRequestInput {
  cacheKey: string;
  buffer: Uint8ClampedArray;
  width: number;
  height: number;
  threshold: number;
  tint: Rgb;
}

export interface EdgeOutcome {
  width: number;
  height: number;
  coverage: number;
  durationMs: number;
  pixels: Uint8ClampedArray;
}

type PendingJob = {
  resolve: (outcome: EdgeOutcome) => void;
  reject: (error: Error) => void;
};

const CACHE_MAX_ENTRIES = 12;

export class EdgeWorkerClient {
  private worker: Worker | null = null;
  private nextJobId = 1;
  private latestJobId = 0;
  private readonly pending = new Map<number, PendingJob>();
  private readonly cache = new LruCache<string, EdgeOutcome>(CACHE_MAX_ENTRIES);

  private ensureWorker(): Worker {
    if (this.worker) return this.worker;

    const worker = new Worker(new URL('../workers/edgeDetector.worker.ts', import.meta.url), {
      type: 'module',
      name: 'tracelens-edge',
    });

    worker.onmessage = (event: MessageEvent<EdgeWorkerResponse>) => {
      const message = event.data;
      const job = this.pending.get(message.jobId);
      if (!job) return; // cancelled
      this.pending.delete(message.jobId);

      if (message.type === 'error') {
        job.reject(new Error(message.message));
        return;
      }

      job.resolve({
        width: message.width,
        height: message.height,
        coverage: message.coverage,
        durationMs: message.durationMs,
        pixels: new Uint8ClampedArray(message.pixels),
      });
    };

    worker.onerror = (event) => {
      const error = new Error(event.message || 'Edge worker crashed');
      this.pending.forEach((job) => job.reject(error));
      this.pending.clear();
      this.terminate();
    };

    this.worker = worker;
    return worker;
  }

  getCached(key: string): EdgeOutcome | undefined {
    return this.cache.get(key);
  }

  /**
   * Runs a job, cancelling any in-flight job first (only the newest outline
   * matters). A fresh copy of the source buffer is transferred so the caller
   * keeps its pixels for later threshold changes.
   */
  async run(input: EdgeRequestInput): Promise<EdgeOutcome> {
    const cached = this.cache.get(input.cacheKey);
    if (cached) return cached;

    const jobId = this.nextJobId;
    this.nextJobId += 1;
    this.latestJobId = jobId;

    // Cancel anything older.
    this.pending.forEach((_job, pendingId) => {
      if (pendingId < jobId) this.pending.delete(pendingId);
    });

    const worker = this.ensureWorker();
    const copy = new Uint8ClampedArray(input.buffer); // keep the source intact

    const request: EdgeJobRequest = {
      type: 'detect',
      jobId,
      buffer: copy.buffer,
      width: input.width,
      height: input.height,
      threshold: input.threshold,
      tint: input.tint,
      blur: true,
      dilate: true,
    };

    const outcome = await new Promise<EdgeOutcome>((resolve, reject) => {
      this.pending.set(jobId, { resolve, reject });
      try {
        worker.postMessage(request, [request.buffer]);
      } catch (error) {
        this.pending.delete(jobId);
        reject(error instanceof Error ? error : new Error('Failed to post edge job'));
      }
    });

    // Only keep the result if it is still the newest request.
    if (jobId === this.latestJobId) {
      this.cache.set(input.cacheKey, outcome);
      return outcome;
    }

    throw new StaleJobError();
  }

  isStale(jobId: number): boolean {
    return jobId !== this.latestJobId;
  }

  clearCache(): void {
    this.cache.clear();
  }

  terminate(): void {
    this.worker?.terminate();
    this.worker = null;
    this.pending.clear();
  }
}

export class StaleJobError extends Error {
  constructor() {
    super('Superseded by a newer edge detection job');
    this.name = 'StaleJobError';
  }
}
