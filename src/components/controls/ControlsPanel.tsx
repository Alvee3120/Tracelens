/**
 * Collapsible bottom control panel for the Trace screen. Everything sits on a
 * blurred scrim, and all touch targets meet the 48 px minimum.
 */
import { useCallback } from 'react';
import {
  ChevronDown,
  ChevronUp,
  FlipHorizontal2,
  FlipVertical2,
  Grid3x3,
  Lock,
  RotateCcw,
  SunMedium,
  Timer,
  Unlock,
} from 'lucide-react';
import { cn } from '@/lib/cn';
import { strings } from '@/lib/strings';
import { getOverlayController } from '@/lib/overlayController';
import { haptics } from '@/lib/haptics';
import { useTraceStore } from '@/store/useTraceStore';
import { useSettingsStore } from '@/store/useSettingsStore';
import { IconButton } from '@/components/ui/IconButton';
import { Slider } from '@/components/ui/Slider';
import { Switch } from '@/components/ui/Switch';
import { OpacitySlider } from '@/components/controls/OpacitySlider';
import { ModeChips } from '@/components/controls/ModeChips';
import { TintPicker } from '@/components/controls/TintPicker';
import { HoldToHideButton } from '@/components/controls/HoldToHideButton';

export interface ControlsPanelProps {
  /** Persist the session after a change completes. */
  onCommit?: () => void;
  /** Pre-formatted elapsed time, or null when the timer is off. */
  timerText?: string | null;
  className?: string;
}

const GRID_PRESETS = [2, 3, 4] as const;

export function ControlsPanel({ onCommit, timerText, className }: ControlsPanelProps) {
  const collapsed = useTraceStore((state) => state.controlsCollapsed);
  const toggleCollapsed = useTraceStore((state) => state.toggleControlsCollapsed);
  const locked = useTraceStore((state) => state.locked);
  const setLocked = useTraceStore((state) => state.setLocked);
  const flipH = useTraceStore((state) => state.flipH);
  const flipV = useTraceStore((state) => state.flipV);
  const toggleFlipH = useTraceStore((state) => state.toggleFlipH);
  const toggleFlipV = useTraceStore((state) => state.toggleFlipV);
  const mode = useTraceStore((state) => state.mode);
  const edgeThreshold = useTraceStore((state) => state.edgeThreshold);
  const setEdgeThreshold = useTraceStore((state) => state.setEdgeThreshold);
  const grid = useTraceStore((state) => state.grid);
  const setGrid = useTraceStore((state) => state.setGrid);
  const brightness = useTraceStore((state) => state.brightness);
  const setBrightness = useTraceStore((state) => state.setBrightness);
  const boostContrast = useTraceStore((state) => state.boostContrast);
  const setBoostContrast = useTraceStore((state) => state.setBoostContrast);
  const timerEnabled = useTraceStore((state) => state.timerEnabled);
  const setTimerEnabled = useTraceStore((state) => state.setTimerEnabled);
  const setShowTimer = useSettingsStore((state) => state.setShowTimer);

  const handleLock = useCallback(() => {
    const next = !locked;
    setLocked(next);
    haptics.trigger(next ? 'lock' : 'unlock');
    onCommit?.();
  }, [locked, onCommit, setLocked]);

  const handleReset = useCallback(() => {
    getOverlayController()?.reset();
    haptics.trigger('medium');
    onCommit?.();
  }, [onCommit]);

  return (
    <div
      className={cn(
        'pointer-events-auto mx-auto w-full max-w-2xl rounded-t-3xl border-t border-white/10 bg-ink-900/80 backdrop-blur-xl',
        'pb-[max(env(safe-area-inset-bottom),0.5rem)] shadow-[0_-8px_40px_rgba(0,0,0,0.45)]',
        className,
      )}
    >
      <div className="flex items-center justify-between px-3 pt-2">
        <div className="flex items-center gap-2">
          {timerText ? (
            <span
              className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/5 px-2.5 py-1 font-mono text-xs text-secondary"
              aria-live="off"
            >
              <Timer size={13} aria-hidden="true" />
              {timerText}
            </span>
          ) : null}
          {grid.enabled ? (
            <span className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-xs text-secondary">
              <Grid3x3 size={13} aria-hidden="true" />
              {grid.divisions}×{grid.divisions}
            </span>
          ) : null}
        </div>

        <IconButton
          label={collapsed ? strings.trace.moreControls : strings.trace.fewerControls}
          icon={collapsed ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
          variant="ghost"
          size="sm"
          aria-expanded={!collapsed}
          onClick={toggleCollapsed}
        />
      </div>

      <div className="px-4 pb-3 pt-2">
        <OpacitySlider onCommit={onCommit} />

        {/* Mode chips are dropped on very short (landscape) viewports so the
            panel never eats the whole screen. */}
        <div className="mt-2 flex items-center gap-2 short:hidden">
          <ModeChips className="flex-1" />
        </div>

        {/* Core actions stay visible: they are used constantly while tracing. */}
        <div className="mt-2 flex flex-wrap items-center gap-2">
          <IconButton
            label={locked ? strings.trace.unlock : strings.trace.lock}
            icon={locked ? <Lock size={20} /> : <Unlock size={20} />}
            active={locked}
            onClick={handleLock}
          />
          <IconButton
            label={strings.trace.flipH}
            icon={<FlipHorizontal2 size={20} />}
            active={flipH}
            aria-pressed={flipH}
            onClick={() => {
              toggleFlipH();
              haptics.trigger('tap');
              onCommit?.();
            }}
          />
          <IconButton
            label={strings.trace.flipV}
            icon={<FlipVertical2 size={20} />}
            active={flipV}
            aria-pressed={flipV}
            onClick={() => {
              toggleFlipV();
              haptics.trigger('tap');
              onCommit?.();
            }}
          />
          <IconButton
            label={strings.trace.reset}
            icon={<RotateCcw size={20} />}
            onClick={handleReset}
          />
          <HoldToHideButton />
        </div>
      </div>

      {!collapsed ? (
        <div className="max-h-[42dvh] space-y-4 overflow-y-auto overscroll-contain px-4 pb-4">
          {mode === 'outline' ? (
            <div className="space-y-3 rounded-2xl border border-white/10 bg-white/5 p-3">
              <TintPicker />
              <Slider
                label={strings.trace.edgeThreshold}
                min={1}
                max={60}
                step={1}
                value={Math.round(edgeThreshold * 100)}
                valueText={`${Math.round(edgeThreshold * 100)}%`}
                onChange={(value) => setEdgeThreshold(value / 100)}
                onPointerUp={onCommit}
              />
            </div>
          ) : null}

          <div className="space-y-3 rounded-2xl border border-white/10 bg-white/5 p-3">
            <Switch
              label={strings.trace.grid}
              checked={grid.enabled}
              onCheckedChange={(enabled) => {
                setGrid({ enabled });
                onCommit?.();
              }}
            />

            {grid.enabled ? (
              <>
                <div className="flex flex-wrap items-center gap-2">
                  {GRID_PRESETS.map((divisions) => (
                    <button
                      key={divisions}
                      type="button"
                      aria-pressed={grid.divisions === divisions}
                      onClick={() => {
                        setGrid({ divisions });
                        onCommit?.();
                      }}
                      className={cn(
                        'min-h-12 min-w-12 rounded-xl border px-3 text-sm font-semibold',
                        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-ink-900',
                        grid.divisions === divisions
                          ? 'border-accent/40 bg-accent text-accent-contrast'
                          : 'border-white/10 bg-white/8 text-secondary hover:bg-white/15',
                      )}
                    >
                      {divisions}×{divisions}
                    </button>
                  ))}

                  <label className="flex min-h-12 items-center gap-2 rounded-xl border border-white/10 bg-white/8 px-3 text-sm text-secondary">
                    {strings.trace.customDivisions}
                    <input
                      type="number"
                      min={2}
                      max={12}
                      value={grid.divisions}
                      onChange={(event) => {
                        const value = Number(event.target.value);
                        if (Number.isFinite(value)) setGrid({ divisions: Math.min(12, Math.max(2, value)) });
                      }}
                      onBlur={onCommit}
                      className="w-14 rounded-lg border border-white/15 bg-ink-950/60 px-2 py-1 text-center font-mono text-sm text-primary focus:border-accent focus:outline-none"
                    />
                  </label>
                </div>

                <div className="flex flex-wrap items-center gap-3">
                  <label className="flex items-center gap-2 text-xs uppercase tracking-wide text-secondary">
                    {strings.trace.gridColor}
                    <input
                      type="color"
                      value={grid.color}
                      onChange={(event) => setGrid({ color: event.target.value })}
                      onBlur={onCommit}
                      aria-label={strings.trace.gridColor}
                      className="h-12 w-14 cursor-pointer rounded-lg border border-white/15 bg-transparent"
                    />
                  </label>

                  <div className="min-w-[9rem] flex-1">
                    <Slider
                      label={strings.trace.gridThickness}
                      min={1}
                      max={4}
                      step={0.5}
                      value={grid.thickness}
                      valueText={`${grid.thickness}px`}
                      onChange={(thickness) => setGrid({ thickness })}
                      onPointerUp={onCommit}
                    />
                  </div>
                </div>
              </>
            ) : null}
          </div>

          <div className="space-y-3 rounded-2xl border border-white/10 bg-white/5 p-3">
            <Slider
              label={strings.trace.brightness}
              icon={<SunMedium size={13} aria-hidden="true" />}
              min={40}
              max={300}
              step={5}
              value={Math.round(brightness * 100)}
              valueText={`${Math.round(brightness * 100)}%`}
              onChange={(value) => setBrightness(value / 100)}
              onPointerUp={onCommit}
            />
            <Slider
              label={strings.trace.contrast}
              min={50}
              max={300}
              step={5}
              value={Math.round(boostContrast * 100)}
              valueText={`${Math.round(boostContrast * 100)}%`}
              onChange={(value) => setBoostContrast(value / 100)}
              onPointerUp={onCommit}
            />
            <Switch
              label={strings.trace.timer}
              checked={timerEnabled}
              onCheckedChange={(enabled) => {
                setTimerEnabled(enabled);
                setShowTimer(enabled);
                onCommit?.();
              }}
            />
          </div>
        </div>
      ) : null}
    </div>
  );
}
