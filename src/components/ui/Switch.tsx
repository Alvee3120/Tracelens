import { useId } from 'react';
import { cn } from '@/lib/cn';

export interface SwitchProps {
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  label: string;
  /** Hide the visible label but keep it for screen readers. */
  hideLabel?: boolean;
  description?: string;
  disabled?: boolean;
  className?: string;
}

export function Switch({
  checked,
  onCheckedChange,
  label,
  hideLabel = false,
  description,
  disabled = false,
  className,
}: SwitchProps) {
  const id = useId();
  const descriptionId = description ? `${id}-description` : undefined;

  return (
    <div className={cn('flex items-center justify-between gap-4', className)}>
      <div className={cn('min-w-0', hideLabel && 'sr-only')}>
        <label htmlFor={id} className="block text-sm font-medium text-primary">
          {label}
        </label>
        {description ? (
          <p id={descriptionId} className="mt-0.5 text-xs leading-relaxed text-muted">
            {description}
          </p>
        ) : null}
      </div>

      <button
        id={id}
        type="button"
        role="switch"
        aria-checked={checked}
        aria-label={hideLabel ? label : undefined}
        aria-describedby={descriptionId}
        disabled={disabled}
        onClick={() => onCheckedChange(!checked)}
        className={cn(
          // The hit area is a full 48px tall even though the track is 32px.
          'relative inline-flex h-12 w-14 shrink-0 items-center justify-center rounded-full',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-ink-900',
          'disabled:cursor-not-allowed disabled:opacity-40',
        )}
      >
        <span className="sr-only">{label}</span>
        <span
          aria-hidden="true"
          className={cn(
            'relative flex h-8 w-14 items-center rounded-full border transition-colors duration-200 ease-swift',
            checked ? 'border-accent/40 bg-accent' : 'border-white/15 bg-white/10',
          )}
        >
          <span
            className={cn(
              'pointer-events-none absolute left-1 h-6 w-6 rounded-full bg-white shadow-md transition-transform duration-200 ease-swift motion-reduce:transition-none',
              checked ? 'translate-x-6' : 'translate-x-0',
            )}
          />
        </span>
      </button>
    </div>
  );
}
