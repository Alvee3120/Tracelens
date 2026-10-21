import { describe, expect, it } from 'vitest';
import { clientToSensorPoint } from '@/lib/focusPoint';

interface RectSpec {
  left: number;
  top: number;
  width: number;
  height: number;
}

function fakeVideo(sensorWidth: number, sensorHeight: number, rect: RectSpec): HTMLVideoElement {
  return {
    videoWidth: sensorWidth,
    videoHeight: sensorHeight,
    getBoundingClientRect: () => ({
      ...rect,
      right: rect.left + rect.width,
      bottom: rect.top + rect.height,
      x: rect.left,
      y: rect.top,
      toJSON: () => ({}),
    }),
  } as unknown as HTMLVideoElement;
}

describe('clientToSensorPoint', () => {
  it('returns null without a video element or a zero-sized box', () => {
    expect(clientToSensorPoint(null, 10, 10)).toBeNull();
    expect(clientToSensorPoint(fakeVideo(1920, 1080, { left: 0, top: 0, width: 0, height: 0 }), 1, 1)).toBeNull();
  });

  it('maps the center of the preview to the center of the sensor', () => {
    // Landscape sensor shown in a tall portrait viewport → cropped horizontally.
    const video = fakeVideo(1920, 1080, { left: 0, top: 0, width: 400, height: 800 });
    const point = clientToSensorPoint(video, 200, 400);
    expect(point?.x).toBeCloseTo(0.5, 6);
    expect(point?.y).toBeCloseTo(0.5, 6);
  });

  it('respects the element offset on the page', () => {
    const video = fakeVideo(1920, 1080, { left: 60, top: 40, width: 400, height: 800 });
    const point = clientToSensorPoint(video, 260, 440);
    expect(point?.x).toBeCloseTo(0.5, 6);
    expect(point?.y).toBeCloseTo(0.5, 6);
  });

  it('accounts for horizontal cropping when the sensor is wider than the viewport', () => {
    const video = fakeVideo(1920, 1080, { left: 0, top: 0, width: 400, height: 400 });
    // displayed width = 400 * (1920/1080) = 711.11, offsetX = (400 - 711.11) / 2
    const displayWidth = 400 * (1920 / 1080);
    const offsetX = (400 - displayWidth) / 2;

    const left = clientToSensorPoint(video, 0, 200);
    const right = clientToSensorPoint(video, 400, 200);

    expect(left?.x).toBeCloseTo((0 - offsetX) / displayWidth, 6);
    expect(right?.x).toBeCloseTo((400 - offsetX) / displayWidth, 6);
    // The visible edges must sit inside the sensor, not at 0 and 1.
    expect(left?.x).toBeGreaterThan(0);
    expect(right?.x).toBeLessThan(1);
  });

  it('accounts for vertical cropping when the sensor is taller than the viewport', () => {
    // Portrait sensor (1080x1920) in a landscape viewport (800x400).
    const video = fakeVideo(1080, 1920, { left: 0, top: 0, width: 800, height: 400 });
    const displayHeight = 800 / (1080 / 1920);
    const offsetY = (400 - displayHeight) / 2;

    const top = clientToSensorPoint(video, 400, 0);
    const bottom = clientToSensorPoint(video, 400, 400);

    expect(top?.y).toBeCloseTo((0 - offsetY) / displayHeight, 6);
    expect(bottom?.y).toBeCloseTo((400 - offsetY) / displayHeight, 6);
    expect(top?.y).toBeGreaterThan(0);
    expect(bottom?.y).toBeLessThan(1);
  });

  it('mirrors the x axis when requested', () => {
    const video = fakeVideo(1920, 1080, { left: 0, top: 0, width: 400, height: 800 });
    const plain = clientToSensorPoint(video, 250, 300);
    const mirrored = clientToSensorPoint(video, 250, 300, { mirror: true });
    expect(mirrored?.x).toBeCloseTo(1 - (plain?.x ?? 0), 6);
    expect(mirrored?.y).toBeCloseTo(plain?.y ?? 0, 6);
  });

  it('clamps out-of-frame taps into 0..1', () => {
    const video = fakeVideo(1920, 1080, { left: 0, top: 0, width: 400, height: 800 });
    const point = clientToSensorPoint(video, -5000, 5000);
    expect(point?.x).toBe(0);
    expect(point?.y).toBe(1);
  });
});
