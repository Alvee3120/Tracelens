/**
 * Haptics behind a thin interface so a Capacitor plugin can replace the web
 * implementation later without touching call sites.
 */
import { supportsVibration } from '@/lib/capabilities';

export type HapticPattern = 'tap' | 'light' | 'medium' | 'heavy' | 'success' | 'error' | 'lock' | 'unlock';

export interface HapticsService {
  readonly isSupported: boolean;
  /** Master switch, wired to the user's haptics setting. */
  setEnabled(enabled: boolean): void;
  trigger(pattern: HapticPattern): boolean;
}

const PATTERNS: Record<HapticPattern, number | number[]> = {
  tap: 8,
  light: 10,
  medium: 20,
  heavy: 35,
  success: [12, 40, 20],
  error: [40, 60, 40],
  lock: 18,
  unlock: [10, 30, 10],
};

function createWebHaptics(): HapticsService {
  let enabled = true;
  const supported = supportsVibration();

  return {
    isSupported: supported,
    setEnabled(next: boolean) {
      enabled = next;
    },
    trigger(pattern: HapticPattern): boolean {
      if (!enabled || !supported || typeof navigator === 'undefined') return false;
      try {
        return navigator.vibrate(PATTERNS[pattern]);
      } catch {
        return false;
      }
    },
  };
}

let instance: HapticsService = createWebHaptics();

export const haptics: HapticsService = {
  get isSupported() {
    return instance.isSupported;
  },
  setEnabled: (enabled) => instance.setEnabled(enabled),
  trigger: (pattern) => instance.trigger(pattern),
};

/** Swap in a native implementation (Capacitor) at boot. */
export function setHapticsService(service: HapticsService): void {
  instance = service;
}
