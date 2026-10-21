/**
 * Session state for the Trace screen. Deliberately *not* persisted to
 * localStorage: the durable copy lives in IndexedDB as a session snapshot, and
 * the live transform lives outside React entirely.
 */
import { create } from 'zustand';
import type { GridConfig, ImageMode, ImageSource, TraceSessionSnapshot } from '@/types';
import type { Size, Transform } from '@/lib/transformMath';
import { clamp } from '@/lib/transformMath';
import type { TintId } from '@/types';

export interface ToastMessage {
  id: number;
  message: string;
  variant: 'info' | 'success' | 'error' | 'warn';
}

export type SheetKind = 'recents' | 'samples' | 'grid' | 'mode' | null;

export interface TraceState {
  /* image */
  imageId: string | null;
  imageUrl: string | null;
  /** Source bytes used for edge detection (may differ from the display URL). */
  imageBlob: Blob | null;
  imageSize: Size;
  imageName: string | null;
  imageSource: ImageSource | null;
  isImageLoading: boolean;

  /* trace settings */
  mode: ImageMode;
  edgeThreshold: number;
  tintId: TintId;
  tint: string;
  opacity: number;
  brightness: number;
  boostContrast: number;
  mirrorCamera: boolean;
  flipH: boolean;
  flipV: boolean;
  locked: boolean;
  grid: GridConfig;
  timerEnabled: boolean;
  timerSeconds: number;

  /* ui */
  immersive: boolean;
  controlsCollapsed: boolean;
  openSheet: SheetKind;
  hideOverlay: boolean;
  toast: ToastMessage | null;

  /* actions */
  setImage: (payload: {
    id: string;
    url: string;
    blob: Blob;
    size: Size;
    name: string;
    source: ImageSource;
  }) => void;
  clearImage: () => void;
  setImageLoading: (loading: boolean) => void;

  setMode: (mode: ImageMode) => void;
  setEdgeThreshold: (value: number) => void;
  setTint: (id: TintId, hex: string) => void;
  setOpacity: (value: number) => void;
  setBrightness: (value: number) => void;
  setBoostContrast: (value: number) => void;
  setMirrorCamera: (value: boolean) => void;
  toggleFlipH: () => void;
  toggleFlipV: () => void;
  setLocked: (value: boolean) => void;
  setGrid: (patch: Partial<GridConfig>) => void;
  setTimerEnabled: (value: boolean) => void;
  setTimerSeconds: (value: number) => void;

  setImmersive: (value: boolean) => void;
  toggleControlsCollapsed: () => void;
  setControlsCollapsed: (value: boolean) => void;
  setOpenSheet: (sheet: SheetKind) => void;
  setHideOverlay: (value: boolean) => void;
  pushToast: (message: string, variant?: ToastMessage['variant']) => void;
  dismissToast: (id?: number) => void;

  applySnapshot: (snapshot: TraceSessionSnapshot) => void;
}

let toastCounter = 0;

export const useTraceStore = create<TraceState>()((set) => ({
  imageId: null,
  imageUrl: null,
  imageBlob: null,
  imageSize: { width: 0, height: 0 },
  imageName: null,
  imageSource: null,
  isImageLoading: false,

  mode: 'original',
  edgeThreshold: 0.18,
  tintId: 'black',
  tint: '#000000',
  opacity: 0.5,
  brightness: 1,
  boostContrast: 1,
  mirrorCamera: false,
  flipH: false,
  flipV: false,
  locked: false,
  grid: { enabled: false, divisions: 3, color: '#5eead4', thickness: 1 },
  timerEnabled: false,
  timerSeconds: 0,

  immersive: false,
  // Starts collapsed so the panel never covers the middle of the screen, which
  // would block overlay gestures on a phone.
  controlsCollapsed: true,
  openSheet: null,
  hideOverlay: false,
  toast: null,

  setImage: ({ id, url, blob, size, name, source }) =>
    set((state) => {
      if (state.imageUrl && state.imageUrl !== url) URL.revokeObjectURL(state.imageUrl);
      return {
        imageId: id,
        imageUrl: url,
        imageBlob: blob,
        imageSize: size,
        imageName: name,
        imageSource: source,
        isImageLoading: false,
        timerSeconds: 0,
      };
    }),

  clearImage: () =>
    set((state) => {
      if (state.imageUrl) URL.revokeObjectURL(state.imageUrl);
      return {
        imageId: null,
        imageUrl: null,
        imageBlob: null,
        imageSize: { width: 0, height: 0 },
        imageName: null,
        imageSource: null,
      };
    }),

  setImageLoading: (isImageLoading) => set({ isImageLoading }),

  setMode: (mode) => set({ mode }),
  setEdgeThreshold: (value) => set({ edgeThreshold: clamp(value, 0.01, 1) }),
  setTint: (tintId, tint) => set({ tintId, tint }),
  setOpacity: (value) => set({ opacity: clamp(value, 0, 1) }),
  setBrightness: (value) => set({ brightness: clamp(value, 0.4, 3) }),
  setBoostContrast: (value) => set({ boostContrast: clamp(value, 0.5, 3) }),
  setMirrorCamera: (mirrorCamera) => set({ mirrorCamera }),
  toggleFlipH: () => set((state) => ({ flipH: !state.flipH })),
  toggleFlipV: () => set((state) => ({ flipV: !state.flipV })),
  setLocked: (locked) => set({ locked, hideOverlay: false }),
  setGrid: (patch) => set((state) => ({ grid: { ...state.grid, ...patch } })),
  setTimerEnabled: (timerEnabled) => set({ timerEnabled }),
  setTimerSeconds: (timerSeconds) => set({ timerSeconds }),

  setImmersive: (immersive) => set({ immersive }),
  toggleControlsCollapsed: () => set((state) => ({ controlsCollapsed: !state.controlsCollapsed })),
  setControlsCollapsed: (controlsCollapsed) => set({ controlsCollapsed }),
  setOpenSheet: (openSheet) => set({ openSheet }),
  setHideOverlay: (hideOverlay) => set({ hideOverlay }),

  pushToast: (message, variant = 'info') =>
    set(() => {
      toastCounter += 1;
      return { toast: { id: toastCounter, message, variant } };
    }),

  dismissToast: (id) =>
    set((state) => {
      if (id !== undefined && state.toast?.id !== id) return state;
      return { toast: null };
    }),

  applySnapshot: (snapshot) =>
    set((state) => {
      const settings = snapshot.settings;
      return {
        mode: settings.mode,
        edgeThreshold: settings.edgeThreshold,
        tint: settings.tint,
        tintId: state.tintId,
        opacity: settings.opacity,
        brightness: settings.brightness,
        boostContrast: settings.boostContrast,
        mirrorCamera: settings.mirrorCamera,
        flipH: settings.flipH,
        flipV: settings.flipV,
        locked: false,
        grid: settings.grid,
        timerEnabled: settings.timerEnabled,
        timerSeconds: settings.timerSeconds,
      };
    }),
}));

/** Builds the snapshot persisted to IndexedDB at the end of a session. */
export function buildSnapshot(state: TraceState, transform: Transform): TraceSessionSnapshot {
  return {
    version: 1,
    updatedAt: Date.now(),
    imageId: state.imageId,
    transform,
    settings: {
      opacity: state.opacity,
      mode: state.mode,
      edgeThreshold: state.edgeThreshold,
      tint: state.tint,
      grid: state.grid,
      brightness: state.brightness,
      boostContrast: state.boostContrast,
      mirrorCamera: state.mirrorCamera,
      flipH: state.flipH,
      flipV: state.flipV,
      locked: false,
      timerEnabled: state.timerEnabled,
      timerSeconds: state.timerSeconds,
    },
  };
}
