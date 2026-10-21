/**
 * Ambient type extensions for non-standard media track capabilities
 * (`torch`, `zoom`, `focusMode`, `pointsOfInterest`) and the install prompt
 * event. These are shipped by Chromium on Android but are not part of the
 * TypeScript DOM lib, so we merge them into the global interfaces.
 */

/** A focus point normalized to 0..1 across the sensor image. */
export interface FocusPoint {
  x: number;
  y: number;
}

declare global {
  interface MediaTrackCapabilities {
    torch?: boolean;
    zoom?: { min: number; max: number; step: number };
    focusMode?: string[];
    focusDistance?: { min: number; max: number; step: number };
    pointsOfInterest?: boolean;
  }

  interface MediaTrackConstraintSet {
    torch?: ConstrainBoolean;
    zoom?: ConstrainDouble;
    focusMode?: ConstrainDOMString;
    focusDistance?: ConstrainDouble;
    pointsOfInterest?: FocusPoint[];
  }

  interface MediaTrackSettings {
    torch?: boolean;
    zoom?: number;
    focusMode?: string;
    focusDistance?: number;
    pointsOfInterest?: FocusPoint[];
  }

  interface BeforeInstallPromptEvent extends Event {
    readonly platforms: string[];
    readonly userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
    prompt(): Promise<void>;
  }

  interface WindowEventMap {
    beforeinstallprompt: BeforeInstallPromptEvent;
    appinstalled: Event;
  }
}

export {};
