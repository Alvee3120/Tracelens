/**
 * Screen Wake Lock behind a thin interface. The sentinel is released by the
 * browser whenever the tab is hidden, so callers must re-acquire on visibility.
 */
import { supportsWakeLock } from '@/lib/capabilities';

export interface WakeLockService {
  readonly isSupported: boolean;
  readonly isActive: boolean;
  /** Resolves true when a lock is held afterwards. Never throws. */
  request(): Promise<boolean>;
  release(): Promise<void>;
}

type Sentinel = { released: boolean; release: () => Promise<void>; addEventListener: (t: string, l: () => void) => void };
type WakeLockApi = { request: (type: 'screen') => Promise<Sentinel> };

function getApi(): WakeLockApi | null {
  if (typeof navigator === 'undefined') return null;
  const nav = navigator as Navigator & { wakeLock?: WakeLockApi };
  return nav.wakeLock ?? null;
}

function createWebWakeLock(): WakeLockService {
  let sentinel: Sentinel | null = null;
  let pending: Promise<boolean> | null = null;

  const service: WakeLockService = {
    get isSupported() {
      return supportsWakeLock();
    },
    get isActive() {
      return sentinel !== null && sentinel.released !== true;
    },
    async request(): Promise<boolean> {
      if (!supportsWakeLock()) return false;
      if (service.isActive) return true;
      if (pending) return pending;

      pending = (async () => {
        const api = getApi();
        if (!api) return false;
        try {
          const next = await api.request('screen');
          sentinel = next;
          next.addEventListener('release', () => {
            if (sentinel === next) sentinel = null;
          });
          return true;
        } catch {
          sentinel = null;
          return false;
        } finally {
          pending = null;
        }
      })();

      return pending;
    },
    async release(): Promise<void> {
      const current = sentinel;
      sentinel = null;
      if (!current) return;
      try {
        await current.release();
      } catch {
        /* already released by the browser */
      }
    },
  };

  return service;
}

let instance: WakeLockService = createWebWakeLock();

export const wakeLock: WakeLockService = {
  get isSupported() {
    return instance.isSupported;
  },
  get isActive() {
    return instance.isActive;
  },
  request: () => instance.request(),
  release: () => instance.release(),
};

/** Swap in a native implementation (Capacitor) at boot. */
export function setWakeLockService(service: WakeLockService): void {
  instance = service;
}
