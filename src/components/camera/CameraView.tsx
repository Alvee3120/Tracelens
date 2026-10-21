/**
 * Live camera preview surface.
 *
 * Only presents the video. Everything interactive lives elsewhere: taps are
 * handled by the overlay gesture layer (which sits above the preview, so
 * tap-to-focus and overlay dragging never fight for pointer events), and the
 * "camera unavailable" card is owned by the Trace screen so it can never
 * collide with the bottom control bar.
 */
import { useEffect, useRef } from 'react';
import type { MutableRefObject } from 'react';
import { cn } from '@/lib/cn';
import { strings } from '@/lib/strings';

export interface CameraViewProps {
  stream: MediaStream | null;
  mirror: boolean;
  brightness: number;
  contrast: number;
  /** Owned by the parent so tap-to-focus can map through the same element. */
  videoRef?: MutableRefObject<HTMLVideoElement | null>;
  className?: string;
}

export function CameraView({
  stream,
  mirror,
  brightness,
  contrast,
  videoRef: externalVideoRef,
  className,
}: CameraViewProps) {
  const internalRef = useRef<HTMLVideoElement | null>(null);
  const videoRef = externalVideoRef ?? internalRef;

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    if (video.srcObject !== stream) {
      video.srcObject = stream;
    }
    if (!stream) return;

    // iOS refuses to play unless the element is muted; setting the property
    // directly is more reliable than relying on the JSX attribute alone.
    video.muted = true;
    void video.play().catch(() => {
      /* Autoplay blocked until the next user gesture — the poster remains. */
    });
  }, [stream, videoRef]);

  useEffect(() => {
    const video = videoRef.current;
    return () => {
      if (video) video.srcObject = null;
    };
  }, [videoRef]);

  return (
    <div className={cn('absolute inset-0 overflow-hidden bg-black', className)}>
      <video
        ref={videoRef}
        className="h-full w-full object-cover"
        style={{
          transform: mirror ? 'scaleX(-1)' : undefined,
          filter: `brightness(${brightness}) contrast(${contrast})`,
        }}
        playsInline
        autoPlay
        muted
        controls={false}
        disablePictureInPicture
        aria-label={strings.a11y.cameraPreview}
      />

      {/* Opaque backdrop while there is no feed; the Trace screen layers the
          explanatory card on top of it. */}
      {stream === null ? (
        <div aria-hidden="true" className="absolute inset-0 bg-ink-900/95" />
      ) : null}
    </div>
  );
}
