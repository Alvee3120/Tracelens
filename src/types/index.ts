import type { Rgb } from '@/lib/edgeDetector';
import type { Transform } from '@/lib/transformMath';

export type ImageMode = 'original' | 'outline' | 'grayscale' | 'invert';

export type TintId = 'black' | 'white' | 'red' | 'green' | 'cyan' | 'custom';

export interface TintOption {
  id: TintId;
  label: string;
  hex: string;
  rgb: Rgb;
}

export interface GridConfig {
  enabled: boolean;
  /** Number of equal divisions per axis (2 = 2x2 quadrants, 3 = 3x3, ...). */
  divisions: number;
  color: string;
  thickness: number;
}

export interface TraceSettings {
  opacity: number;
  mode: ImageMode;
  edgeThreshold: number;
  tint: string;
  grid: GridConfig;
  brightness: number;
  boostContrast: number;
  mirrorCamera: boolean;
  flipH: boolean;
  flipV: boolean;
  locked: boolean;
  timerEnabled: boolean;
  timerSeconds: number;
}

export interface TraceSessionSnapshot {
  version: number;
  updatedAt: number;
  imageId: string | null;
  transform: Transform;
  settings: TraceSettings;
}

export type ImageSource = 'gallery' | 'camera' | 'sample' | 'drop';

export interface StoredImage {
  id: string;
  name: string;
  blob: Blob;
  width: number;
  height: number;
  createdAt: number;
  source: ImageSource;
}

export type CameraStatus =
  | 'idle'
  | 'requesting'
  | 'ready'
  | 'denied'
  | 'dismissed'
  | 'notfound'
  | 'insecure'
  | 'unsupported'
  | 'error';

export interface ZoomCapability {
  min: number;
  max: number;
  step: number;
}

export interface CameraCapabilities {
  torch: boolean;
  zoom: ZoomCapability | null;
  focusModes: string[];
  focusDistance: ZoomCapability | null;
  pointsOfInterest: boolean;
}

export type ErrorCode =
  | 'CAMERA_PERMISSION_DENIED'
  | 'CAMERA_DISMISSED'
  | 'CAMERA_NOT_FOUND'
  | 'CAMERA_UNSUPPORTED'
  | 'CAMERA_INSECURE_CONTEXT'
  | 'CAMERA_OVERCONSTRAINED'
  | 'CAMERA_FAILED'
  | 'IMAGE_DECODE_FAILED'
  | 'IMAGE_TOO_LARGE'
  | 'STORAGE_FAILED'
  | 'WORKER_FAILED'
  | 'UNKNOWN';

export interface AppError {
  code: ErrorCode;
  message: string;
  detail?: string;
  recoverable: boolean;
}

export interface DeviceInfo {
  deviceId: string;
  label: string;
  isDefault: boolean;
}
