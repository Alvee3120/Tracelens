/**
 * Camera-specific controls. Every control is feature-detected against the
 * live track capabilities, so nothing is shown that the device cannot honour.
 */
import { Focus, Lock, RefreshCcw, Sun, Zap, ZapOff } from 'lucide-react';
import { cn } from '@/lib/cn';
import { strings } from '@/lib/strings';
import { format } from '@/lib/strings';
import type { UseCameraResult } from '@/components/camera/useCamera';
import { IconButton } from '@/components/ui/IconButton';
import { Slider } from '@/components/ui/Slider';

export interface CameraControlsProps {
  camera: UseCameraResult;
  className?: string;
  /** Whether a torch button should be rendered. */
  showTorch?: boolean;
  showZoom?: boolean;
  showFocus?: boolean;
  showSwitch?: boolean;
  layout?: 'bar' | 'panel';
}

export function CameraControls({
  camera,
  className,
  showTorch = true,
  showZoom = true,
  showFocus = true,
  showSwitch = true,
  layout = 'panel',
}: CameraControlsProps) {
  const { capabilities, torchOn, torchBusy, zoom, focusLocked, devices } = camera;

  const hasTorch = showTorch && capabilities.torch;
  const hasZoom = showZoom && capabilities.zoom !== null;
  const hasFocus = showFocus && capabilities.focusModes.length > 0;
  const hasSwitch = showSwitch && devices.length > 1;

  if (!hasTorch && !hasZoom && !hasFocus && !hasSwitch) return null;

  const isBar = layout === 'bar';

  return (
    <div
      className={cn(
        isBar ? 'flex items-center gap-2' : 'flex flex-wrap items-center gap-3',
        className,
      )}
    >
      {hasTorch ? (
        <IconButton
          label={torchOn ? strings.camera.torchOff : strings.camera.torchOn}
          icon={torchOn ? <Zap size={20} /> : <ZapOff size={20} />}
          active={torchOn}
          disabled={torchBusy}
          onClick={() => void camera.setTorch(!torchOn)}
        />
      ) : null}

      {hasFocus ? (
        <IconButton
          label={focusLocked ? strings.camera.focusUnlock : strings.camera.focusLock}
          icon={focusLocked ? <Lock size={20} /> : <Focus size={20} />}
          active={focusLocked}
          onClick={() => void camera.toggleFocusLock()}
        />
      ) : null}

      {hasSwitch ? (
        <IconButton
          label={strings.camera.switchCamera}
          icon={<RefreshCcw size={20} />}
          onClick={() => void camera.switchCamera()}
        />
      ) : null}

      {hasZoom && capabilities.zoom ? (
        <div className={cn('min-w-[10rem] flex-1', isBar && 'hidden max-w-xs sm:block')}>
          <Slider
            label={strings.camera.zoom}
            icon={<Sun size={13} aria-hidden="true" />}
            min={capabilities.zoom.min}
            max={capabilities.zoom.max}
            step={capabilities.zoom.step}
            value={zoom ?? capabilities.zoom.min}
            valueText={`${(zoom ?? capabilities.zoom.min).toFixed(1)}×`}
            onChange={(value) => void camera.setZoom(value)}
          />
        </div>
      ) : null}

      {hasZoom && isBar && capabilities.zoom ? (
        <span className="hidden text-xs text-muted lg:inline">
          {format('{{count}}×', { count: (zoom ?? capabilities.zoom.min).toFixed(1) })}
        </span>
      ) : null}

      {!hasFocus ? (
        <p className={cn('text-xs leading-snug text-muted', !isBar && 'w-full')}>
          {strings.camera.focusNotSupportedHint}
        </p>
      ) : null}
    </div>
  );
}
