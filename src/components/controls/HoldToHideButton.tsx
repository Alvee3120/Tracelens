/**
 * Press-and-hold to hide the overlay so the user can compare their paper with
 * the reference. Uses pointer events so mouse and touch behave identically,
 * and supports keyboard activation (hold Space/Enter).
 */
import { useCallback, useRef } from 'react';
import { EyeOff } from 'lucide-react';
import { cn } from '@/lib/cn';
import { strings } from '@/lib/strings';
import { useTraceStore } from '@/store/useTraceStore';
import { haptics } from '@/lib/haptics';

export interface HoldToHideButtonProps {
  className?: string;
}

export function HoldToHideButton({ className }: HoldToHideButtonProps) {
  const hideOverlay = useTraceStore((state) => state.hideOverlay);
  const setHideOverlay = useTraceStore((state) => state.setHideOverlay);
  const locked = useTraceStore((state) => state.locked);
  const keyboardHeld = useRef(false);

  const show = useCallback(() => {
    setHideOverlay(true);
  }, [setHideOverlay]);

  const restore = useCallback(() => {
    setHideOverlay(false);
  }, [setHideOverlay]);

  return (
    <button
      type="button"
      aria-label={strings.trace.hide}
      aria-pressed={hideOverlay}
      title={strings.trace.hideHint}
      disabled={locked}
      onPointerDown={(event) => {
        if (locked) return;
        event.currentTarget.setPointerCapture(event.pointerId);
        haptics.trigger('light');
        show();
      }}
      onPointerUp={restore}
      onPointerCancel={restore}
      onPointerLeave={(event) => {
        // Pointer capture keeps the press alive across the edge on touch.
        if (event.pointerType === 'mouse') restore();
      }}
      onLostPointerCapture={restore}
      onContextMenu={(event) => event.preventDefault()}
      onKeyDown={(event) => {
        if (locked) return;
        if ((event.key === ' ' || event.key === 'Enter') && !keyboardHeld.current) {
          keyboardHeld.current = true;
          show();
        }
      }}
      onKeyUp={(event) => {
        if (event.key === ' ' || event.key === 'Enter') {
          keyboardHeld.current = false;
          restore();
        }
      }}
      onBlur={restore}
      className={cn(
        'inline-flex min-h-12 select-none items-center justify-center gap-2 rounded-2xl border px-4 text-sm font-semibold',
        'touch-none transition-colors duration-150 ease-swift active:scale-[0.98] motion-reduce:transition-none motion-reduce:active:scale-100',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-ink-900',
        'disabled:cursor-not-allowed disabled:opacity-40',
        hideOverlay
          ? 'border-accent/50 bg-accent text-accent-contrast'
          : 'border-white/10 bg-white/10 text-primary hover:bg-white/15',
        className,
      )}
    >
      <EyeOff size={17} aria-hidden="true" />
      <span className="hidden sm:inline">{strings.trace.holdToHide}</span>
      <span className="sm:hidden">{strings.trace.holdToHide}</span>
    </button>
  );
}
