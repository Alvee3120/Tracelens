/**
 * Maps a screen tap onto the camera sensor.
 *
 * The preview uses `object-fit: cover`, so the visible frame is a center-crop of
 * the sensor image. This reproduces that geometry so a tap-to-focus point lands
 * where the user actually touched.
 */

export interface SensorPoint {
  /** Normalized 0..1 across the sensor image. */
  x: number;
  y: number;
}

export interface SensorMappingOptions {
  /** True when the preview is mirrored (front camera / reflective tracing setup). */
  mirror?: boolean;
}

function clamp01(value: number): number {
  if (Number.isNaN(value)) return 0.5;
  return Math.min(1, Math.max(0, value));
}

export function clientToSensorPoint(
  video: HTMLVideoElement | null,
  clientX: number,
  clientY: number,
  options: SensorMappingOptions = {},
): SensorPoint | null {
  if (!video) return null;

  const rect = video.getBoundingClientRect();
  if (rect.width <= 0 || rect.height <= 0) return null;

  const sensorAspect = (video.videoWidth || 1) / (video.videoHeight || 1);
  const elementAspect = rect.width / rect.height;

  let displayWidth: number;
  let displayHeight: number;
  let offsetX: number;
  let offsetY: number;

  if (sensorAspect > elementAspect) {
    // Cropped horizontally: the frame is wider than the viewport.
    displayHeight = rect.height;
    displayWidth = displayHeight * sensorAspect;
    offsetX = (rect.width - displayWidth) / 2;
    offsetY = 0;
  } else {
    // Cropped vertically: the frame is taller than the viewport.
    displayWidth = rect.width;
    displayHeight = displayWidth / sensorAspect;
    offsetX = 0;
    offsetY = (rect.height - displayHeight) / 2;
  }

  const rawX = (clientX - rect.left - offsetX) / displayWidth;
  const rawY = (clientY - rect.top - offsetY) / displayHeight;

  return {
    x: clamp01(options.mirror ? 1 - rawX : rawX),
    y: clamp01(rawY),
  };
}
