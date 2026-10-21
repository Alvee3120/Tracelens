/**
 * Camera lifecycle.
 *
 * Owns the MediaStream, the rear/front track, and every device capability the
 * browser exposes (torch, zoom, focus). Requests are only ever made in
 * response to `enabled` flipping to true, never on page load, so the
 * permission prompt always follows an explicit user action.
 *
 * The stream is torn down on unmount, when `enabled` goes false, on route
 * change (the hook unmounts), and whenever the tab is hidden.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { AppError, CameraCapabilities, CameraStatus, DeviceInfo, ErrorCode } from '@/types';
import {
  EMPTY_CAMERA_CAPABILITIES,
  hasMediaDevices,
  isSecureCameraContext,
  readCameraCapabilities,
} from '@/lib/capabilities';
import { appError, cameraErrorFromException } from '@/lib/errors';

export interface UseCameraOptions {
  /** Whether the camera should be running. Driven by the Trace route. */
  enabled: boolean;
  /** Preferred device id, or null for the automatic rear camera. */
  deviceId?: string | null;
  idealWidth?: number;
  idealHeight?: number;
}

export interface CameraResolution {
  width: number;
  height: number;
}

export interface UseCameraResult {
  stream: MediaStream | null;
  status: CameraStatus;
  error: AppError | null;
  capabilities: CameraCapabilities;
  torchOn: boolean;
  torchBusy: boolean;
  zoom: number | null;
  focusLocked: boolean;
  resolution: CameraResolution | null;
  devices: DeviceInfo[];
  trackedEnded: boolean;
  start: () => Promise<void>;
  stop: () => void;
  retry: () => Promise<void>;
  setTorch: (on: boolean) => Promise<void>;
  setZoom: (value: number) => Promise<void>;
  focusAt: (x: number, y: number) => Promise<void>;
  toggleFocusLock: () => Promise<void>;
  switchCamera: () => Promise<void>;
  refreshDevices: () => Promise<DeviceInfo[]>;
}

const STATUS_BY_CODE: Partial<Record<ErrorCode, CameraStatus>> = {
  CAMERA_PERMISSION_DENIED: 'denied',
  CAMERA_DISMISSED: 'dismissed',
  CAMERA_NOT_FOUND: 'notfound',
  CAMERA_INSECURE_CONTEXT: 'insecure',
  CAMERA_UNSUPPORTED: 'unsupported',
};

function buildConstraints(
  deviceId: string | null,
  idealWidth: number,
  idealHeight: number,
): MediaStreamConstraints {
  const video: MediaTrackConstraints = deviceId
    ? { deviceId: { exact: deviceId }, width: { ideal: idealWidth }, height: { ideal: idealHeight } }
    : {
        facingMode: { ideal: 'environment' },
        width: { ideal: idealWidth },
        height: { ideal: idealHeight },
      };
  return { video, audio: false };
}

export function useCamera({
  enabled,
  deviceId = null,
  idealWidth = 1920,
  idealHeight = 1080,
}: UseCameraOptions): UseCameraResult {
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [status, setStatus] = useState<CameraStatus>('idle');
  const [error, setError] = useState<AppError | null>(null);
  const [capabilities, setCapabilities] = useState<CameraCapabilities>({
    ...EMPTY_CAMERA_CAPABILITIES,
  });
  const [torchOn, setTorchOn] = useState(false);
  const [torchBusy, setTorchBusy] = useState(false);
  const [zoom, setZoomState] = useState<number | null>(null);
  const [focusLocked, setFocusLocked] = useState(false);
  const [resolution, setResolution] = useState<CameraResolution | null>(null);
  const [devices, setDevices] = useState<DeviceInfo[]>([]);
  const [trackedEnded, setTrackedEnded] = useState(false);

  const streamRef = useRef<MediaStream | null>(null);
  const trackRef = useRef<MediaStreamTrack | null>(null);
  const startingRef = useRef(false);
  const generationRef = useRef(0);
  const enabledRef = useRef(enabled);
  enabledRef.current = enabled;

  const releaseStream = useCallback(() => {
    const current = streamRef.current;
    streamRef.current = null;
    trackRef.current = null;
    if (!current) return;
    current.getTracks().forEach((track) => {
      track.onended = null;
      track.onmute = null;
      track.onunmute = null;
      track.stop();
    });
    setStream(null);
  }, []);

  const handleTrackEnded = useCallback(() => {
    if (!enabledRef.current) return;
    setTrackedEnded(true);
    releaseStream();
    setStatus('idle');
    setError(appError('CAMERA_FAILED', 'The camera stopped. Tap to restart.'));
  }, [releaseStream]);

  const attachTrack = useCallback(
    (track: MediaStreamTrack) => {
      trackRef.current = track;
      track.onended = handleTrackEnded;
      const caps = readCameraCapabilities(track);
      setCapabilities(caps);

      const settings = track.getSettings();
      if (typeof settings.torch === 'boolean') setTorchOn(settings.torch);
      if (typeof settings.zoom === 'number') setZoomState(settings.zoom);
      if (settings.focusMode) setFocusLocked(settings.focusMode === 'manual');
      if (settings.width && settings.height) {
        setResolution({ width: settings.width, height: settings.height });
      }
    },
    [handleTrackEnded],
  );

  const start = useCallback(async () => {
    if (startingRef.current) return;
    if (streamRef.current) return;

    if (!isSecureCameraContext()) {
      const nextError = appError('CAMERA_INSECURE_CONTEXT');
      setError(nextError);
      setStatus('insecure');
      return;
    }
    if (!hasMediaDevices()) {
      const nextError = appError('CAMERA_UNSUPPORTED');
      setError(nextError);
      setStatus('unsupported');
      return;
    }

    startingRef.current = true;
    setStatus('requesting');
    setError(null);

    const generation = generationRef.current + 1;
    generationRef.current = generation;

    try {
      let next: MediaStream;
      try {
        next = await navigator.mediaDevices.getUserMedia(
          buildConstraints(deviceId, idealWidth, idealHeight),
        );
      } catch (firstError) {
        const mapped = cameraErrorFromException(firstError);
        if (mapped.code === 'CAMERA_OVERCONSTRAINED') {
          // Retry with the loosest possible constraints before giving up.
          next = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
        } else {
          throw firstError;
        }
      }

      // A newer start (or a stop) happened while we were awaiting.
      if (generation !== generationRef.current || !enabledRef.current) {
        next.getTracks().forEach((track) => track.stop());
        return;
      }

      const [videoTrack] = next.getVideoTracks();
      if (!videoTrack) {
        next.getTracks().forEach((track) => track.stop());
        throw new DOMException('No video track in the returned stream', 'NotFoundError');
      }

      streamRef.current = next;
      attachTrack(videoTrack);
      setStream(next);
      setStatus('ready');
      setTrackedEnded(false);
      setError(null);
    } catch (caught) {
      const mapped = cameraErrorFromException(caught);
      setError(mapped);
      setStatus(STATUS_BY_CODE[mapped.code] ?? 'error');
      releaseStream();
    } finally {
      startingRef.current = false;
    }
  }, [attachTrack, deviceId, idealHeight, idealWidth, releaseStream]);

  const stop = useCallback(() => {
    generationRef.current += 1;
    releaseStream();
    setStatus('idle');
    setTorchOn(false);
    setCapabilities({ ...EMPTY_CAMERA_CAPABILITIES });
    setZoomState(null);
    setFocusLocked(false);
    setResolution(null);
  }, [releaseStream]);

  const retry = useCallback(async () => {
    stop();
    setTrackedEnded(false);
    await start();
  }, [start, stop]);

  /* ------------------------------------------------------------ apply helpers */

  const applyAdvanced = useCallback(
    async (constraint: MediaTrackConstraintSet): Promise<boolean> => {
      const track = trackRef.current;
      if (!track) return false;
      try {
        await track.applyConstraints({ advanced: [constraint] });
        return true;
      } catch {
        return false;
      }
    },
    [],
  );

  const setTorch = useCallback(
    async (on: boolean) => {
      if (!capabilities.torch) return;
      setTorchBusy(true);
      const ok = await applyAdvanced({ torch: on });
      setTorchBusy(false);
      if (ok) setTorchOn(on);
    },
    [applyAdvanced, capabilities.torch],
  );

  const setZoom = useCallback(
    async (value: number) => {
      if (!capabilities.zoom) return;
      const { min, max, step } = capabilities.zoom;
      const snapped = Math.min(max, Math.max(min, step > 0 ? Math.round(value / step) * step : value));
      const ok = await applyAdvanced({ zoom: snapped });
      if (ok) setZoomState(snapped);
    },
    [applyAdvanced, capabilities.zoom],
  );

  const focusAt = useCallback(
    async (x: number, y: number) => {
      const track = trackRef.current;
      if (!track) return;
      const modes = capabilities.focusModes;
      const canPoint = capabilities.pointsOfInterest;
      const clamped = { x: Math.min(1, Math.max(0, x)), y: Math.min(1, Math.max(0, y)) };

      if (canPoint && modes.length > 0) {
        const mode = modes.includes('single-shot') ? 'single-shot' : modes[0];
        const ok = await applyAdvanced({ focusMode: mode, pointsOfInterest: [clamped] });
        if (ok) return;
      }
      if (modes.includes('single-shot')) {
        await applyAdvanced({ focusMode: 'single-shot' });
      }
    },
    [applyAdvanced, capabilities.focusModes, capabilities.pointsOfInterest],
  );

  const toggleFocusLock = useCallback(async () => {
    const track = trackRef.current;
    if (!track) return;
    const modes = capabilities.focusModes;
    if (modes.length === 0) return;

    if (focusLocked) {
      const resumed = modes.includes('continuous') ? 'continuous' : modes[0];
      const ok = await applyAdvanced({ focusMode: resumed });
      if (ok) setFocusLocked(false);
      return;
    }

    if (modes.includes('manual')) {
      const settings = track.getSettings();
      const distance = settings.focusDistance;
      const ok = await applyAdvanced(
        typeof distance === 'number'
          ? { focusMode: 'manual', focusDistance: distance }
          : { focusMode: 'manual' },
      );
      if (ok) {
        setFocusLocked(true);
        return;
      }
    }

    // Fallback: single-shot freezes focus on most Android devices.
    if (modes.includes('single-shot')) {
      const ok = await applyAdvanced({ focusMode: 'single-shot' });
      if (ok) setFocusLocked(true);
    }
  }, [applyAdvanced, capabilities.focusModes, focusLocked]);

  const refreshDevices = useCallback(async (): Promise<DeviceInfo[]> => {
    if (!hasMediaDevices() || typeof navigator.mediaDevices.enumerateDevices !== 'function') {
      return [];
    }
    try {
      const list = await navigator.mediaDevices.enumerateDevices();
      const cameras = list
        .filter((device) => device.kind === 'videoinput')
        .map<DeviceInfo>((device, index) => ({
          deviceId: device.deviceId,
          label: device.label || `Camera ${index + 1}`,
          isDefault: device.deviceId === 'default',
        }));
      setDevices(cameras);
      return cameras;
    } catch {
      return [];
    }
  }, []);

  const switchCamera = useCallback(async () => {
    const list = devices.length > 0 ? devices : await refreshDevices();
    if (list.length < 2) return;
    const currentId = trackRef.current?.getSettings().deviceId;
    const index = list.findIndex((device) => device.deviceId === currentId);
    const next = list[(index + 1 + list.length) % list.length];
    if (!next) return;

    stop();
    // Give the previous pipeline a tick to fully release the device.
    await new Promise((resolve) => window.setTimeout(resolve, 120));
    if (!enabledRef.current) return;

    try {
      const acquired = await navigator.mediaDevices.getUserMedia(
        buildConstraints(next.deviceId, idealWidth, idealHeight),
      );
      const [videoTrack] = acquired.getVideoTracks();
      if (!videoTrack) {
        acquired.getTracks().forEach((track) => track.stop());
        return;
      }
      streamRef.current = acquired;
      attachTrack(videoTrack);
      setStream(acquired);
      setStatus('ready');
    } catch (caught) {
      const mapped = cameraErrorFromException(caught);
      setError(mapped);
      setStatus(STATUS_BY_CODE[mapped.code] ?? 'error');
    }
  }, [attachTrack, devices, idealHeight, idealWidth, refreshDevices, stop]);

  /* --------------------------------------------------------------- lifecycle */

  useEffect(() => {
    return () => {
      generationRef.current += 1;
      releaseStream();
    };
  }, [releaseStream]);

  useEffect(() => {
    if (enabled) {
      void start();
    } else {
      stop();
    }
    return () => {
      // Route change / dependency change: always release the device.
      generationRef.current += 1;
      releaseStream();
    };
  }, [enabled, start, stop, releaseStream]);

  useEffect(() => {
    const handleVisibility = () => {
      if (document.hidden) {
        stop();
      } else if (enabledRef.current) {
        void start();
      }
    };
    document.addEventListener('visibilitychange', handleVisibility);
    return () => document.removeEventListener('visibilitychange', handleVisibility);
  }, [start, stop]);

  useEffect(() => {
    if (!hasMediaDevices() || typeof navigator.mediaDevices.addEventListener !== 'function') {
      return;
    }
    const handleDeviceChange = () => {
      void refreshDevices().then((list) => {
        // The camera we were using disappeared — try to recover.
        const currentId = trackRef.current?.getSettings().deviceId;
        if (enabledRef.current && currentId && !list.some((d) => d.deviceId === currentId)) {
          void retry();
        }
      });
    };
    navigator.mediaDevices.addEventListener('devicechange', handleDeviceChange);
    return () => navigator.mediaDevices.removeEventListener('devicechange', handleDeviceChange);
  }, [refreshDevices, retry]);

  useEffect(() => {
    if (!enabled) return;
    void refreshDevices();
  }, [enabled, refreshDevices, stream]);

  return useMemo(
    () => ({
      stream,
      status,
      error,
      capabilities,
      torchOn,
      torchBusy,
      zoom,
      focusLocked,
      resolution,
      devices,
      trackedEnded,
      start,
      stop,
      retry,
      setTorch,
      setZoom,
      focusAt,
      toggleFocusLock,
      switchCamera,
      refreshDevices,
    }),
    [
      stream,
      status,
      error,
      capabilities,
      torchOn,
      torchBusy,
      zoom,
      focusLocked,
      resolution,
      devices,
      trackedEnded,
      start,
      stop,
      retry,
      setTorch,
      setZoom,
      focusAt,
      toggleFocusLock,
      switchCamera,
      refreshDevices,
    ],
  );
}
