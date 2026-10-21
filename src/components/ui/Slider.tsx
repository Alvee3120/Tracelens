import { useId, type CSSProperties, type ReactNode } from 'react';
import { cn } from '@/lib/cn';

export interface SliderProps {
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  onChange: (value: number) => void;
  /** Rendered to the right of the label, e.g. "62%". */
  valueText?: string;
  disabled?: boolean;
  icon?: ReactNode;
  className?: string;
  onPointerUp?: () => void;
}

export function Slider({
  label,
  value,
  min,
  max,
  step = 1,
  onChange,
  valueText,
  disabled = false,
  icon,
  className,
  onPointerUp,
}: SliderProps) {
  const id = useId();
  const percent = max > min ? ((value - min) / (max - min)) * 100 : 0;

  return (
    <div className={cn('w-full', className)}>
      <div className="mb-1.5 flex items-center justify-between gap-3">
        <label
          htmlFor={id}
          className="flex min-w-0 items-center gap-2 text-xs font-medium uppercase tracking-wide text-secondary"
        >
          {icon ? <span aria-hidden="true">{icon}</span> : null}
          <span className="truncate">{label}</span>
        </label>
        {valueText ? (
          <span className="shrink-0 font-mono text-xs text-muted">{valueText}</span>
        ) : null}
      </div>

      <input
        id={id}
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        disabled={disabled}
        onChange={(event) => onChange(Number(event.target.value))}
        onPointerUp={onPointerUp}
        onKeyUp={onPointerUp}
        aria-valuetext={valueText}
        className={cn(
          'h-12 w-full cursor-pointer appearance-none bg-transparent',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-ink-900',
          'disabled:cursor-not-allowed disabled:opacity-40',
          // Track
          '[&::-webkit-slider-runnable-track]:h-1.5 [&::-webkit-slider-runnable-track]:rounded-full',
          '[&::-moz-range-track]:h-1.5 [&::-moz-range-track]:rounded-full [&::-moz-range-track]:bg-white/15',
          // Thumb
          '[&::-webkit-slider-thumb]:mt-[-9px] [&::-webkit-slider-thumb]:h-6 [&::-webkit-slider-thumb]:w-6 [&::-webkit-slider-thumb]:appearance-none',
          '[&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:border-ink-900',
          '[&::-webkit-slider-thumb]:bg-accent [&::-webkit-slider-thumb]:shadow-lg',
          '[&::-moz-range-thumb]:h-6 [&::-moz-range-thumb]:w-6 [&::-moz-range-thumb]:rounded-full',
          '[&::-moz-range-thumb]:border-2 [&::-moz-range-thumb]:border-ink-900 [&::-moz-range-thumb]:bg-accent',
        )}
        style={
          {
            // Progressive filled track; the custom property feeds the gradient.
            backgroundImage:
              'linear-gradient(to right, rgb(94 234 212) 0%, rgb(94 234 212) var(--p), rgba(255,255,255,0.15) var(--p), rgba(255,255,255,0.15) 100%)',
            backgroundSize: '100% 6px',
            backgroundPosition: 'center',
            backgroundRepeat: 'no-repeat',
            '--p': `${percent}%`,
          } as CSSProperties
        }
      />
    </div>
  );
}
