/**
 * Trace — the main screen.
 *
 * Composition: camera preview → overlay (image + gestures + grid) → chrome.
 * The only state that lives in React here is UI chrome (bars, sheets, timer);
 * the overlay transform is owned imperatively by the overlay layer.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  ArrowLeft,
  Camera,
  Grid3x3,
  ImagePlus,
  Minimize2,
  Upload,
} from 'lucide-react';
import { cn } from '@/lib/cn';
import { helpStepsForBrowser, strings } from '@/lib/strings';
import { bodyFor } from '@/lib/errors';
import { getCapabilityReport, supportsFullscreen } from '@/lib/capabilities';
import { getOverlayController } from '@/lib/overlayController';
import { useWakeLock } from '@/lib/useWakeLock';
import { useImageImport } from '@/lib/useImageImport';
import { useRecents } from '@/lib/useRecents';
import { MAX_PROCESS_LONG_SIDE, bitmapToRgbaBuffer, closeBitmap, decodeImage } from '@/lib/imageUtils';
import { clientToSensorPoint } from '@/lib/focusPoint';
import { buildSnapshot, useTraceStore } from '@/store/useTraceStore';
import { useSettingsStore } from '@/store/useSettingsStore';
import { getImage, loadSession, saveSession } from '@/db/db';
import { haptics } from '@/lib/haptics';
import type { Transform } from '@/lib/transformMath';
import type { TraceSessionSnapshot } from '@/types';
import { useCamera } from '@/components/camera/useCamera';
import { CameraView } from '@/components/camera/CameraView';
import { CameraControls } from '@/components/camera/CameraControls';
import { OverlayLayer } from '@/components/overlay/OverlayLayer';
import type { OutlineSource } from '@/components/overlay/useOutlineProcessor';
import { ControlsPanel } from '@/components/controls/ControlsPanel';
import { Button } from '@/components/ui/Button';
import { IconButton } from '@/components/ui/IconButton';
import { BottomSheet } from '@/components/ui/BottomSheet';
import { RecentImages } from '@/components/home/RecentImages';
import { SampleGallery } from '@/components/home/SampleGallery';

const FOCUS_HINT_KEY = 'tracelens:focusHintShown';
const NUDGE_STEP = 0.006;
const NUDGE_STEP_LARGE = 0.03;
const SAVE_DEBOUNCE_MS = 500;

function formatDuration(totalSeconds: number): string {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}

export default function Trace() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const wantsAutostart = searchParams.get('autostart') === '1';
  const wantsResume = searchParams.get('resume') === '1';
  const overlayOnly = searchParams.get('overlayOnly') === '1';

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const transformRef = useRef<Transform>({ x: 0, y: 0, scale: 1, rotation: 0 });
  const initialTransformRef = useRef<Transform | undefined>(undefined);
  const elapsedRef = useRef(0);
  const saveTimerRef = useRef<number | null>(null);
  const focusRingTimerRef = useRef<number | null>(null);

  const [cameraEnabled, setCameraEnabled] = useState(() => !overlayOnly && (wantsAutostart || wantsResume));
  const [pickerOpen, setPickerOpen] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [outlineSource, setOutlineSource] = useState<OutlineSource | null>(null);
  const [outlineStatus, setOutlineStatus] = useState({ isProcessing: false, coverage: null as number | null });
  const [focusRing, setFocusRing] = useState<{ x: number; y: number; key: number } | null>(null);

  const settingsKeepScreenOn = useSettingsStore((state) => state.keepScreenOn);
  const cameraDeviceId = useSettingsStore((state) => state.cameraDeviceId);

  const mode = useTraceStore((state) => state.mode);
  const imageId = useTraceStore((state) => state.imageId);
  const imageBlob = useTraceStore((state) => state.imageBlob);
  const mirrorCamera = useTraceStore((state) => state.mirrorCamera);
  const brightness = useTraceStore((state) => state.brightness);
  const boostContrast = useTraceStore((state) => state.boostContrast);
  const gridEnabled = useTraceStore((state) => state.grid.enabled);
  const setGrid = useTraceStore((state) => state.setGrid);
  const locked = useTraceStore((state) => state.locked);
  const setLocked = useTraceStore((state) => state.setLocked);
  const immersive = useTraceStore((state) => state.immersive);
  const setImmersive = useTraceStore((state) => state.setImmersive);
  const timerEnabled = useTraceStore((state) => state.timerEnabled);
  const toggleFlipH = useTraceStore((state) => state.toggleFlipH);
  const setHideOverlay = useTraceStore((state) => state.setHideOverlay);
  const pushToast = useTraceStore((state) => state.pushToast);

  const camera = useCamera({ enabled: cameraEnabled, deviceId: cameraDeviceId });
  const { importFile, importBlob, importSample, isImporting } = useImageImport();
  const { recents, isLoading: recentsLoading, remove, refresh: refreshRecents } = useRecents();

  const handleTransformChange = useCallback((transform: Transform) => {
    transformRef.current = transform;
  }, []);

  // Tap-to-focus reads live camera state through refs so the handler identity
  // stays stable and never forces the overlay to re-render.
  const focusAtRef = useRef(camera.focusAt);
  focusAtRef.current = camera.focusAt;
  const focusSupportedRef = useRef(false);
  focusSupportedRef.current = camera.capabilities.focusModes.length > 0;
  const mirrorRef = useRef(mirrorCamera);
  mirrorRef.current = mirrorCamera;

  const handleOverlayTap = useCallback((point: { clientX: number; clientY: number }) => {
    if (!focusSupportedRef.current) return;

    const sensor = clientToSensorPoint(videoRef.current, point.clientX, point.clientY, {
      mirror: mirrorRef.current,
    });

    setFocusRing({ x: point.clientX, y: point.clientY, key: Date.now() });
    if (focusRingTimerRef.current !== null) window.clearTimeout(focusRingTimerRef.current);
    focusRingTimerRef.current = window.setTimeout(() => setFocusRing(null), 900);

    haptics.trigger('light');
    if (sensor) void focusAtRef.current(sensor.x, sensor.y);
  }, []);

  useEffect(() => {
    return () => {
      if (focusRingTimerRef.current !== null) window.clearTimeout(focusRingTimerRef.current);
    };
  }, []);

  /* ------------------------------------------------------------ persistence */

  const saveSessionNow = useCallback(async () => {
    const state = useTraceStore.getState();
    if (!state.imageId) return;
    const snapshot: TraceSessionSnapshot = buildSnapshot(
      { ...state, timerSeconds: elapsedRef.current },
      transformRef.current,
    );
    try {
      await saveSession(snapshot);
    } catch {
      /* storage full or private mode — the live session is unaffected */
    }
  }, []);

  const scheduleSave = useCallback(() => {
    if (saveTimerRef.current !== null) window.clearTimeout(saveTimerRef.current);
    saveTimerRef.current = window.setTimeout(() => {
      saveTimerRef.current = null;
      void saveSessionNow();
    }, SAVE_DEBOUNCE_MS);
  }, [saveSessionNow]);

  useEffect(() => {
    const unsubscribe = useTraceStore.subscribe(() => scheduleSave());
    return () => {
      unsubscribe();
      if (saveTimerRef.current !== null) window.clearTimeout(saveTimerRef.current);
    };
  }, [scheduleSave]);

  useEffect(() => {
    const onHide = () => {
      if (document.hidden) void saveSessionNow();
    };
    const onPageHide = () => {
      void saveSessionNow();
    };
    document.addEventListener('visibilitychange', onHide);
    window.addEventListener('pagehide', onPageHide);
    return () => {
      document.removeEventListener('visibilitychange', onHide);
      window.removeEventListener('pagehide', onPageHide);
      void saveSessionNow();
    };
  }, [saveSessionNow]);

  /* ---------------------------------------------------------------- restore */

  useEffect(() => {
    if (!wantsResume) return;
    let cancelled = false;

    void (async () => {
      try {
        const snapshot = await loadSession();
        if (!snapshot?.imageId) return;
        const stored = await getImage(snapshot.imageId);
        if (!stored || cancelled) return;

        initialTransformRef.current = snapshot.transform;
        useTraceStore.getState().applySnapshot(snapshot);
        await importBlob({ blob: stored.blob, name: stored.name, source: stored.source });
      } catch {
        if (!cancelled) pushToast(strings.errors.storageBody, 'warn');
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [importBlob, pushToast, wantsResume]);

  /* ------------------------------------------------------------ outline source */

  useEffect(() => {
    if (mode !== 'outline' || !imageBlob || !imageId) {
      setOutlineSource(null);
      return;
    }

    let cancelled = false;
    void (async () => {
      try {
        const decoded = await decodeImage(imageBlob, MAX_PROCESS_LONG_SIDE);
        if (cancelled) {
          closeBitmap(decoded.bitmap);
          return;
        }
        const rgba = bitmapToRgbaBuffer(decoded.bitmap, '#ffffff');
        closeBitmap(decoded.bitmap);
        setOutlineSource({
          id: imageId,
          buffer: rgba.data,
          width: rgba.width,
          height: rgba.height,
        });
      } catch {
        if (!cancelled) pushToast(strings.errors.imageDecodeBody, 'error');
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [mode, imageBlob, imageId, pushToast]);

  /* ------------------------------------------------------------------ timer */

  useEffect(() => {
    if (!timerEnabled) return;
    const interval = window.setInterval(() => {
      elapsedRef.current += 1;
      setElapsed(elapsedRef.current);
    }, 1000);
    return () => window.clearInterval(interval);
  }, [timerEnabled]);

  /* -------------------------------------------------------------- wake lock */

  const wake = useWakeLock(settingsKeepScreenOn);

  useEffect(() => {
    if (wake.notice) pushToast(wake.notice, 'warn');
  }, [wake.notice, pushToast]);

  /* ------------------------------------------------------------ focus hint */

  useEffect(() => {
    if (camera.status !== 'ready') return;
    if (camera.capabilities.focusModes.length > 0) return;
    try {
      if (window.localStorage.getItem(FOCUS_HINT_KEY) === '1') return;
      window.localStorage.setItem(FOCUS_HINT_KEY, '1');
    } catch {
      /* private mode: show it once per session instead */
    }
    pushToast(strings.camera.focusNotSupportedHint, 'info');
  }, [camera.capabilities.focusModes.length, camera.status, pushToast]);

  /* ------------------------------------------------------- keyboard shortcuts */

  useEffect(() => {
    const isTypingTarget = (target: EventTarget | null): boolean => {
      if (!(target instanceof HTMLElement)) return false;
      const tag = target.tagName;
      return tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || target.isContentEditable;
    };

    const onKeyDown = (event: KeyboardEvent) => {
      if (isTypingTarget(event.target) || event.metaKey || event.ctrlKey || event.altKey) return;
      const controller = getOverlayController();
      const key = event.key.toLowerCase();

      switch (key) {
        case 'l':
          setLocked(!useTraceStore.getState().locked);
          haptics.trigger('tap');
          break;
        case 'g':
          setGrid({ enabled: !useTraceStore.getState().grid.enabled });
          break;
        case 'h':
          setHideOverlay(true);
          break;
        case 'r':
          controller?.reset();
          break;
        case 'f':
          toggleFlipH();
          break;
        case 'arrowleft':
          event.preventDefault();
          controller?.nudge(-(event.shiftKey ? NUDGE_STEP_LARGE : NUDGE_STEP), 0);
          break;
        case 'arrowright':
          event.preventDefault();
          controller?.nudge(event.shiftKey ? NUDGE_STEP_LARGE : NUDGE_STEP, 0);
          break;
        case 'arrowup':
          event.preventDefault();
          controller?.nudge(0, -(event.shiftKey ? NUDGE_STEP_LARGE : NUDGE_STEP));
          break;
        case 'arrowdown':
          event.preventDefault();
          controller?.nudge(0, event.shiftKey ? NUDGE_STEP_LARGE : NUDGE_STEP);
          break;
        case '+':
        case '=':
          event.preventDefault();
          controller?.zoomBy(1.1);
          break;
        case '-':
        case '_':
          event.preventDefault();
          controller?.zoomBy(1 / 1.1);
          break;
        case 'escape':
          if (immersive) setImmersive(false);
          break;
        default:
          break;
      }
    };

    const onKeyUp = (event: KeyboardEvent) => {
      if (event.key.toLowerCase() === 'h') setHideOverlay(false);
    };

    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
    };
  }, [immersive, setGrid, setHideOverlay, setImmersive, setLocked, toggleFlipH]);

  /* -------------------------------------------------------------- fullscreen */

  const toggleImmersive = useCallback(async () => {
    const next = !useTraceStore.getState().immersive;
    setImmersive(next);
    haptics.trigger('medium');

    if (next) {
      if (supportsFullscreen() && !document.fullscreenElement) {
        try {
          await document.documentElement.requestFullscreen();
        } catch {
          /* iOS has no Fullscreen API — immersive mode still hides the chrome. */
        }
      }
    } else if (document.fullscreenElement) {
      try {
        await document.exitFullscreen();
      } catch {
        /* already exited */
      }
    }
  }, [setImmersive]);

  useEffect(() => {
    const onFullscreenChange = () => {
      if (!document.fullscreenElement && useTraceStore.getState().immersive) {
        setImmersive(false);
      }
    };
    document.addEventListener('fullscreenchange', onFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', onFullscreenChange);
  }, [setImmersive]);

  /* ------------------------------------------------------------------ import */

  const handleFile = useCallback(
    async (file: File) => {
      const ok = await importFile(file);
      if (ok) {
        setPickerOpen(false);
        await refreshRecents();
      }
    },
    [importFile, refreshRecents],
  );

  const handleSample = useCallback(
    async (sample: Parameters<typeof importSample>[0]) => {
      const ok = await importSample(sample);
      if (ok) {
        setPickerOpen(false);
        await refreshRecents();
      }
    },
    [importSample, refreshRecents],
  );

  /* ------------------------------------------------------------------- render */

  const capabilityReport = useMemo(() => getCapabilityReport(), []);
  const helpSteps = helpStepsForBrowser(capabilityReport.browser);

  const handleBack = useCallback(() => {
    void saveSessionNow();
    navigate('/');
  }, [navigate, saveSessionNow]);

  const timerText = timerEnabled ? formatDuration(elapsed) : null;

  const cameraDown = camera.stream === null;
  const cameraStarting = camera.status === 'requesting';
  const showEmptyState = !imageId && !immersive;
  // With an image loaded the bottom control bar is on screen, so the camera
  // notice is anchored under the top bar rather than the centre — otherwise the
  // bar covers the buttons on short/landscape viewports.
  const showCameraNotice = imageId !== null && cameraDown && !immersive;

  /** Starts the camera whether it was never enabled or the track just died. */
  const retryCameraRef = useRef(camera.retry);
  retryCameraRef.current = camera.retry;

  const handleStartCamera = useCallback(() => {
    if (!cameraEnabled) {
      setCameraEnabled(true);
      return;
    }
    void retryCameraRef.current();
  }, [cameraEnabled]);

  return (
    <div
      className="relative h-[100dvh] w-full touch-none overflow-hidden overscroll-none bg-ink-950"
      onDragOver={(event) => event.preventDefault()}
      onDrop={(event) => {
        event.preventDefault();
        const [file] = Array.from(event.dataTransfer.files);
        if (file) void handleFile(file);
      }}
    >
      <CameraView
        stream={camera.stream}
        mirror={mirrorCamera}
        brightness={brightness}
        contrast={boostContrast}
        videoRef={videoRef}
      />

      <OverlayLayer
        outlineSource={outlineSource}
        initialTransform={initialTransformRef.current}
        onTransformChange={handleTransformChange}
        onOutlineStatusChange={setOutlineStatus}
        onTap={handleOverlayTap}
      />

      {/* ------------------------------------------------------------------ top */}
      <header
        className={cn(
          'pointer-events-none absolute inset-x-0 top-0 z-30 flex items-start justify-between gap-2 px-3 pt-[max(env(safe-area-inset-top),0.75rem)]',
          immersive && 'hidden',
        )}
      >
        <div className="pointer-events-auto flex items-center gap-2 rounded-2xl border border-white/10 bg-ink-900/70 p-1.5 backdrop-blur-xl">
          <IconButton label={strings.nav.back} icon={<ArrowLeft size={20} />} onClick={handleBack} />
        </div>

        <div className="pointer-events-auto flex flex-wrap items-center justify-end gap-2 rounded-2xl border border-white/10 bg-ink-900/70 p-1.5 backdrop-blur-xl">
          <IconButton
            label={strings.trace.changeImage}
            icon={<ImagePlus size={20} />}
            onClick={() => setPickerOpen(true)}
          />
          <IconButton
            label={strings.trace.grid}
            icon={<Grid3x3 size={20} />}
            active={gridEnabled}
            aria-pressed={gridEnabled}
            onClick={() => setGrid({ enabled: !gridEnabled })}
          />
          <CameraControls
            camera={camera}
            layout="bar"
            showZoom={false}
            showFocus
            showSwitch
            showTorch
          />
          <IconButton
            label={immersive ? strings.trace.exitImmersive : strings.trace.immersiveOn}
            icon={<Minimize2 size={20} />}
            active={immersive}
            onClick={() => void toggleImmersive()}
          />
        </div>
      </header>

      {immersive ? (
        <button
          type="button"
          onClick={() => void toggleImmersive()}
          aria-label={strings.trace.exitImmersive}
          className="absolute right-3 top-[max(env(safe-area-inset-top),0.75rem)] z-40 flex h-12 w-12 items-center justify-center rounded-full border border-white/15 bg-black/50 text-white opacity-40 backdrop-blur transition-opacity hover:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
        >
          <Minimize2 size={16} aria-hidden="true" />
        </button>
      ) : null}

      {/* ------------------------------------------------------------- empty state */}
      {showEmptyState ? (
        <div className="pointer-events-none absolute inset-0 z-20 flex items-center justify-center px-6 pb-4 pt-[max(env(safe-area-inset-top),5rem)] short:pb-4 short:pt-[7.5rem]">
          <div className="pointer-events-auto max-h-full w-full max-w-sm overflow-y-auto rounded-3xl border border-white/10 bg-ink-900/90 p-5 text-center backdrop-blur-xl">
            <h2 className="text-base font-semibold text-primary">{strings.trace.noImage}</h2>
            <p className="mt-1.5 text-sm text-muted">
              {cameraDown ? strings.camera.startHint : strings.trace.noImageBody}
            </p>
            <div className="mt-4 flex flex-col gap-2">
              {cameraDown && !cameraStarting ? (
                <Button
                  variant="primary"
                  fullWidth
                  onClick={handleStartCamera}
                  leadingIcon={<Camera size={18} aria-hidden="true" />}
                >
                  {strings.onboarding.startCamera}
                </Button>
              ) : null}
              <Button
                variant={cameraDown ? 'secondary' : 'primary'}
                fullWidth
                onClick={() => setPickerOpen(true)}
                leadingIcon={<ImagePlus size={18} aria-hidden="true" />}
              >
                {strings.trace.pickImage}
              </Button>
              <Button
                variant="secondary"
                fullWidth
                onClick={() => fileInputRef.current?.click()}
                leadingIcon={<Upload size={18} aria-hidden="true" />}
              >
                {strings.home.pickFromGallery}
              </Button>
            </div>
            {cameraStarting ? (
              <p className="mt-3 text-xs text-muted">{strings.camera.starting}</p>
            ) : null}
          </div>
        </div>
      ) : null}

      {/* -------------------------------------------------- camera needs attention */}
      {showCameraNotice ? (
        <div className="pointer-events-none absolute inset-0 z-40 flex items-start justify-center px-4 pt-[max(env(safe-area-inset-top),4.5rem)] short:pointer-events-auto short:items-center short:bg-black/55 short:pt-0">
          <div className="pointer-events-auto h-fit w-full max-w-md rounded-2xl border border-white/10 bg-ink-900/90 p-4 backdrop-blur-xl">
            <h2 className="text-sm font-semibold text-primary">
              {camera.error ? camera.error.message : strings.camera.off}
            </h2>
            <p className="mt-1 text-xs leading-relaxed text-muted">
              {camera.error ? bodyFor(camera.error.code) : strings.camera.startHint}
            </p>
            {camera.trackedEnded ? (
              <p className="mt-1 text-xs leading-relaxed text-amber-200">
                {strings.camera.deviceEnded}
              </p>
            ) : null}
            {camera.error ? (
              <ol className="mt-2 list-decimal space-y-1 pl-4 text-xs leading-relaxed text-muted">
                {helpSteps.map((step) => (
                  <li key={step}>{step}</li>
                ))}
              </ol>
            ) : null}
            <div className="mt-3 flex flex-wrap gap-2">
              <Button
                size="sm"
                variant="primary"
                onClick={handleStartCamera}
                leadingIcon={<Camera size={16} aria-hidden="true" />}
              >
                {camera.status === 'idle' || camera.trackedEnded
                  ? strings.onboarding.startCamera
                  : strings.onboarding.tryAgain}
              </Button>
              {camera.error ? (
                <Button size="sm" variant="secondary" onClick={() => setCameraEnabled(false)}>
                  {strings.onboarding.continueWithout}
                </Button>
              ) : null}
            </div>
          </div>
        </div>
      ) : null}

      {/* -------------------------------------------------------------- bottom */}
      {imageId && !immersive ? (
        <div className="absolute inset-x-0 bottom-0 z-30">
          <ControlsPanel onCommit={scheduleSave} timerText={timerText} />
        </div>
      ) : null}

      {/* -------------------------------------------------------- status badges */}
      {!immersive && !showCameraNotice ? (
        <div className="pointer-events-none absolute left-3 top-[max(env(safe-area-inset-top),4.25rem)] z-20 flex flex-col items-start gap-1.5">
          {mode === 'outline' && outlineStatus.isProcessing ? (
            <span className="rounded-full border border-white/10 bg-black/50 px-2.5 py-1 text-[11px] text-white backdrop-blur">
              {strings.trace.processingHint}
            </span>
          ) : null}
          {locked ? (
            <span className="rounded-full border border-white/10 bg-black/50 px-2.5 py-1 text-[11px] text-white backdrop-blur">
              {strings.trace.lockHint}
            </span>
          ) : null}
          {camera.resolution && !locked ? (
            <span className="hidden rounded-full border border-white/10 bg-black/50 px-2.5 py-1 font-mono text-[11px] text-white/90 backdrop-blur sm:inline">
              {camera.resolution.width}×{camera.resolution.height}
            </span>
          ) : null}
        </div>
      ) : null}

      {!immersive && timerEnabled && timerText ? (
        <div className="pointer-events-none absolute left-1/2 top-[max(env(safe-area-inset-top),0.9rem)] z-20 hidden -translate-x-1/2 sm:block">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-black/50 px-2.5 py-1 font-mono text-xs text-white backdrop-blur">
            {timerText}
          </span>
        </div>
      ) : null}

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="sr-only"
        onChange={(event) => {
          const file = event.target.files?.[0];
          event.target.value = '';
          if (file) void handleFile(file);
        }}
      />

      {focusRing ? (
        <span
          key={focusRing.key}
          aria-hidden="true"
          className="pointer-events-none fixed z-40 h-16 w-16 -translate-x-1/2 -translate-y-1/2 rounded-xl border-2 border-accent/90 animate-pulse-ring motion-reduce:animate-none"
          style={{ left: focusRing.x, top: focusRing.y }}
        />
      ) : null}

      <BottomSheet
        open={pickerOpen}
        onClose={() => setPickerOpen(false)}
        title={strings.trace.changeImage}
      >
        <Button
          variant="primary"
          fullWidth
          disabled={isImporting}
          onClick={() => fileInputRef.current?.click()}
          leadingIcon={<Upload size={18} aria-hidden="true" />}
        >
          {isImporting ? strings.common.loading : strings.home.pickFromGallery}
        </Button>

        <h3 className="mt-5 text-xs font-semibold uppercase tracking-wide text-muted">
          {strings.home.recentsTitle}
        </h3>
        <RecentImages
          className="mt-2"
          layout="grid"
          recents={recents}
          isLoading={recentsLoading}
          onSelect={(image) =>
            void importBlob({ blob: image.blob, name: image.name, source: image.source }).then(
              (ok) => {
                if (ok) setPickerOpen(false);
              },
            )
          }
          onDelete={(id) => void remove(id)}
          onClear={() => void refreshRecents()}
        />

        <h3 className="mt-5 text-xs font-semibold uppercase tracking-wide text-muted">
          {strings.home.samplesTitle}
        </h3>
        <SampleGallery className="mt-2" compact limit={4} onSelect={(sample) => void handleSample(sample)} />
      </BottomSheet>
    </div>
  );
}
