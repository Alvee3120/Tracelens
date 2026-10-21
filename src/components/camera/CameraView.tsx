/**
 * Live camera preview.
 *
 * Only presents the surface: the MediaStream is attached by effect, and taps are
 * handled by the overlay gesture layer (which sits above the preview) so that
 * tap-to-focus and overlay dragging never fight over pointer events.
 */
import { useEffect, useRef } from 'react';
import { CameraOff, RefreshCw } from 'lucide-react';
import type { MutableRefObject } from 'react';
import { cn } from '@/lib/cn';
import { strings } from '@/lib/strings';
import { bodyFor, isAppError } from '@/lib/errors';
import type { AppError, CameraStatus } from '@/types';
import { Button } from '@/components/ui/Button';

export interface CameraViewProps {
  stream: MediaStream | null;
  status: CameraStatus;
  error: AppError | null;
  mirror: boolean;
  brightness: number;
  contrast: number;
  /** Owned by the parent so tap-to-focus can map through the same element. */
  videoRef?: MutableRefObject<HTMLVideoElement | null>;
  onRetry: () => void;
  /** Rendered instead of the preview when the camera is unavailable. */
  fallback?: React.ReactNode;
  className?: string;
}

export function CameraView({
  stream,
  status,
  error,
  mirror,
  brightness,
  contrast,
  videoRef: externalVideoRef,
  onRetry,
  fallback,
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

  const showFallback = stream === null;

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

      {showFallback ? (
        <div className="absolute inset-0 flex items-center justify-center bg-ink-900/95 px-6">
          {fallback ?? (
            <div className="w-full max-w-sm text-center">
              <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl border border-white/10 bg-white/5">
                <CameraOff size={24} aria-hidden="true" />
              </div>
              <h2 className="text-lg font-semibold">
                {error && isAppError(error) ? error.message : strings.camera.off}
              </h2>
              <p className="mt-2 text-sm leading-relaxed text-muted">
                {error && isAppError(error) ? bodyFor(error.code) : strings.camera.start}
              </p>
              {status !== 'requesting' ? (
                <Button
                  className="mt-5"
                  variant="primary"
                  onClick={onRetry}
                  leadingIcon={<RefreshCw size={18} aria-hidden="true" />}
                >
                  {strings.onboarding.tryAgain}
                </Button>
              ) : (
                <p className="mt-5 text-sm text-muted">{strings.camera.starting}</p>
              )}
            </div>
          )}
        </div>
      ) : null}
    </div>
  );
}
