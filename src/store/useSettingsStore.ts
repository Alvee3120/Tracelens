import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import type { ImageMode } from '@/types';

export type ThemePreference = 'system' | 'light' | 'dark';

export interface SettingsState {
  theme: ThemePreference;
  defaultOpacity: number;
  defaultMode: ImageMode;
  defaultGridEnabled: boolean;
  defaultGridDivisions: number;
  gridColor: string;
  gridThickness: number;
  keepScreenOn: boolean;
  hapticsEnabled: boolean;
  showTimer: boolean;
  cameraDeviceId: string | null;
  language: string;
  hasCompletedOnboarding: boolean;

  setTheme: (theme: ThemePreference) => void;
  setDefaultOpacity: (value: number) => void;
  setDefaultMode: (mode: ImageMode) => void;
  setDefaultGridEnabled: (enabled: boolean) => void;
  setDefaultGridDivisions: (divisions: number) => void;
  setGridColor: (color: string) => void;
  setGridThickness: (thickness: number) => void;
  setKeepScreenOn: (value: boolean) => void;
  setHapticsEnabled: (value: boolean) => void;
  setShowTimer: (value: boolean) => void;
  setCameraDeviceId: (deviceId: string | null) => void;
  setLanguage: (language: string) => void;
  setHasCompletedOnboarding: (value: boolean) => void;
  resetToDefaults: () => void;
}

const DEFAULTS = {
  theme: 'system' as ThemePreference,
  defaultOpacity: 0.5,
  defaultMode: 'original' as ImageMode,
  defaultGridEnabled: false,
  defaultGridDivisions: 3,
  gridColor: '#5eead4',
  gridThickness: 1,
  keepScreenOn: true,
  hapticsEnabled: true,
  showTimer: false,
  cameraDeviceId: null,
  language: 'en',
  hasCompletedOnboarding: false,
} satisfies Omit<
  SettingsState,
  | 'setTheme'
  | 'setDefaultOpacity'
  | 'setDefaultMode'
  | 'setDefaultGridEnabled'
  | 'setDefaultGridDivisions'
  | 'setGridColor'
  | 'setGridThickness'
  | 'setKeepScreenOn'
  | 'setHapticsEnabled'
  | 'setShowTimer'
  | 'setCameraDeviceId'
  | 'setLanguage'
  | 'setHasCompletedOnboarding'
  | 'resetToDefaults'
>;

export const SETTINGS_STORAGE_KEY = 'tracelens:settings';

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      ...DEFAULTS,
      setTheme: (theme) => set({ theme }),
      setDefaultOpacity: (defaultOpacity) => set({ defaultOpacity }),
      setDefaultMode: (defaultMode) => set({ defaultMode }),
      setDefaultGridEnabled: (defaultGridEnabled) => set({ defaultGridEnabled }),
      setDefaultGridDivisions: (defaultGridDivisions) => set({ defaultGridDivisions }),
      setGridColor: (gridColor) => set({ gridColor }),
      setGridThickness: (gridThickness) => set({ gridThickness }),
      setKeepScreenOn: (keepScreenOn) => set({ keepScreenOn }),
      setHapticsEnabled: (hapticsEnabled) => set({ hapticsEnabled }),
      setShowTimer: (showTimer) => set({ showTimer }),
      setCameraDeviceId: (cameraDeviceId) => set({ cameraDeviceId }),
      setLanguage: (language) => set({ language }),
      setHasCompletedOnboarding: (hasCompletedOnboarding) => set({ hasCompletedOnboarding }),
      resetToDefaults: () => set({ ...DEFAULTS }),
    }),
    {
      name: SETTINGS_STORAGE_KEY,
      version: 1,
      storage: createJSONStorage(() => localStorage),
      // Only the lightweight preference values are persisted — never image data.
      partialize: (state) => ({
        theme: state.theme,
        defaultOpacity: state.defaultOpacity,
        defaultMode: state.defaultMode,
        defaultGridEnabled: state.defaultGridEnabled,
        defaultGridDivisions: state.defaultGridDivisions,
        gridColor: state.gridColor,
        gridThickness: state.gridThickness,
        keepScreenOn: state.keepScreenOn,
        hapticsEnabled: state.hapticsEnabled,
        showTimer: state.showTimer,
        cameraDeviceId: state.cameraDeviceId,
        language: state.language,
        hasCompletedOnboarding: state.hasCompletedOnboarding,
      }),
    },
  ),
);

export const SETTINGS_DEFAULTS = DEFAULTS;
