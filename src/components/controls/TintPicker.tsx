import { useCallback, useId } from 'react';
import { Pipette } from 'lucide-react';
import { cn } from '@/lib/cn';
import { strings } from '@/lib/strings';
import { TINTS, isLightColor } from '@/lib/tints';
import { useTraceStore } from '@/store/useTraceStore';
import { haptics } from '@/lib/haptics';

export interface TintPickerProps {
  className?: string;
}

export function TintPicker({ className }: TintPickerProps) {
  const tint = useTraceStore((state) => state.tint);
  const setTint = useTraceStore((state) => state.setTint);
  const customId = useId();

  const select = useCallback(
    (id: (typeof TINTS)[number]['id'], hex: string) => {
      setTint(id, hex);
      haptics.trigger('tap');
    },
    [setTint],
  );

  return (
    <div className={cn('flex flex-wrap items-center gap-2', className)}>
      <span className="mr-1 text-xs font-medium uppercase tracking-wide text-secondary">
        {strings.trace.tint}
      </span>

      {TINTS.map((option) => {
        const active = option.hex.toLowerCase() === tint.toLowerCase();
        return (
          <button
            key={option.id}
            type="button"
            aria-label={option.label}
            aria-pressed={active}
            onClick={() => select(option.id, option.hex)}
            className={cn(
              'h-12 w-12 rounded-xl border-2 transition-transform duration-150 ease-swift active:scale-95 motion-reduce:transition-none',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-ink-900',
              active ? 'border-accent scale-105' : 'border-white/20 hover:border-white/40',
            )}
            style={{ backgroundColor: option.hex }}
            title={option.label}
          >
            <span className="sr-only">{option.label}</span>
          </button>
        );
      })}

      <label
        htmlFor={customId}
        className={cn(
          'relative inline-flex h-12 cursor-pointer items-center gap-2 rounded-xl border-2 px-3 text-xs font-medium',
          'focus-within:ring-2 focus-within:ring-accent focus-within:ring-offset-2 focus-within:ring-offset-ink-900',
          'border-white/20 bg-white/5 text-secondary hover:border-white/40',
        )}
        style={isLightColor(tint) ? undefined : { color: '#e2e8f0' }}
      >
        <Pipette size={15} aria-hidden="true" />
        {strings.tints.custom}
        <span
          aria-hidden="true"
          className="h-5 w-5 rounded-md border border-white/25"
          style={{ backgroundColor: tint }}
        />
        <input
          id={customId}
          type="color"
          value={tint}
          onChange={(event) => setTint('custom', event.target.value)}
          aria-label={strings.trace.tint}
          className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
        />
      </label>
    </div>
  );
}
