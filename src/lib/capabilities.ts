/**
 * Single source of truth for what the current device + browser can actually do.
 * Everything is feature-detected; nothing is assumed from a user-agent string
 * unless there is no other option (iOS Fullscreen, for example).
 */
import type { CameraCapabilities, ZoomCapability } from '@/types';
import '@/lib/mediaTypes';

export const EMPTY_CAMERA_CAPABILITIES: CameraCapabilities = Object.freeze({
  torch: false,
  zoom: null,
  focusModes: [],
  focusDistance: null,
  pointsOfInterest: false,
});

type TrackWithCapabilities = MediaStreamTrack & {
  getCapabilities?: () => MediaTrackCapabilities;
};

export function readCameraCapabilities(track: MediaStreamTrack | null): CameraCapabilities {
  if (!track || typeof track.getCapabilities !== 'function') {
    return { ...EMPTY_CAMERA_CAPABILITIES };
  }

  let caps: MediaTrackCapabilities;
  try {
    caps = (track as TrackWithCapabilities).getCapabilities?.() ?? {};
  } catch {
    return { ...EMPTY_CAMERA_CAPABILITIES };
  }

  const zoom: ZoomCapability | null =
    caps.zoom && Number.isFinite(caps.zoom.max) && caps.zoom.max > caps.zoom.min
      ? { min: caps.zoom.min, max: caps.zoom.max, step: caps.zoom.step || 0.1 }
      : null;

  const focusDistance: ZoomCapability | null =
    caps.focusDistance &&
    Number.isFinite(caps.focusDistance.max) &&
    caps.focusDistance.max > caps.focusDistance.min
      ? {
          min: caps.focusDistance.min,
          max: caps.focusDistance.max,
          step: caps.focusDistance.step || 0.1,
        }
      : null;

  const focusModes = Array.isArray(caps.focusMode) ? caps.focusMode : [];

  return {
    torch: caps.torch === true,
    zoom,
    focusModes,
    focusDistance,
    pointsOfInterest: caps.pointsOfInterest === true,
  };
}

export function hasMediaDevices(): boolean {
  return typeof navigator !== 'undefined' && typeof navigator.mediaDevices?.getUserMedia === 'function';
}

export function isSecureCameraContext(): boolean {
  if (typeof window === 'undefined') return false;
  return window.isSecureContext === true;
}

export function supportsWakeLock(): boolean {
  if (typeof navigator === 'undefined') return false;
  const nav = navigator as Navigator & { wakeLock?: { request?: unknown } };
  return typeof nav.wakeLock?.request === 'function';
}

export function supportsVibration(): boolean {
  return typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function';
}

export function supportsFullscreen(): boolean {
  if (typeof document === 'undefined') return false;
  const el = document.documentElement as HTMLElement & {
    webkitRequestFullscreen?: () => Promise<void>;
  };
  return Boolean(document.fullscreenEnabled || el.webkitRequestFullscreen);
}

/** iOS Safari never fires `beforeinstallprompt`; we show manual instructions instead. */
export function supportsInstallPrompt(): boolean {
  if (typeof window === 'undefined') return false;
  return isAndroid() && !isStandalone();
}

export function supportsOffscreenCanvas(): boolean {
  return typeof OffscreenCanvas !== 'undefined';
}

export function isStandalone(): boolean {
  if (typeof window === 'undefined') return false;
  const nav = navigator as Navigator & { standalone?: boolean };
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    window.matchMedia('(display-mode: fullscreen)').matches ||
    nav.standalone === true
  );
}

export function prefersReducedMotion(): boolean {
  if (typeof window === 'undefined') return false;
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

export type BrowserName = 'chrome' | 'edge' | 'firefox' | 'safari' | 'samsung' | 'unknown';

export function getBrowserName(): BrowserName {
  if (typeof navigator === 'undefined') return 'unknown';
  const ua = navigator.userAgent;
  if (/Edg\//.test(ua)) return 'edge';
  if (/SamsungBrowser/.test(ua)) return 'samsung';
  if (/Firefox\//.test(ua)) return 'firefox';
  if (/CriOS/.test(ua) || /Chrome\//.test(ua)) return 'chrome';
  if (/Safari\//.test(ua)) return 'safari';
  return 'unknown';
}

export function isIOS(): boolean {
  if (typeof navigator === 'undefined') return false;
  const ua = navigator.userAgent;
  return (
    /iPad|iPhone|iPod/.test(ua) ||
    // iPadOS 13+ reports itself as a Mac with touch support.
    (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)
  );
}

export function isAndroid(): boolean {
  if (typeof navigator === 'undefined') return false;
  return /Android/.test(navigator.userAgent);
}

export function isTouchDevice(): boolean {
  if (typeof window === 'undefined') return false;
  return window.matchMedia('(pointer: coarse)').matches || navigator.maxTouchPoints > 0;
}

export interface DeviceCapabilityReport {
  camera: boolean;
  secureContext: boolean;
  wakeLock: boolean;
  fullscreen: boolean;
  vibration: boolean;
  offscreenCanvas: boolean;
  installPrompt: boolean;
  standalone: boolean;
  ios: boolean;
  android: boolean;
  browser: BrowserName;
}

export function getCapabilityReport(): DeviceCapabilityReport {
  return {
    camera: hasMediaDevices(),
    secureContext: isSecureCameraContext(),
    wakeLock: supportsWakeLock(),
    fullscreen: supportsFullscreen(),
    vibration: supportsVibration(),
    offscreenCanvas: supportsOffscreenCanvas(),
    installPrompt: supportsInstallPrompt(),
    standalone: isStandalone(),
    ios: isIOS(),
    android: isAndroid(),
    browser: getBrowserName(),
  };
}
