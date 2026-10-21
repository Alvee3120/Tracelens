import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from 'react';
import { cn } from '@/lib/cn';

export interface IconButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  /** Required: icon-only buttons always need an accessible name. */
  label: string;
  icon: ReactNode;
  active?: boolean;
  size?: 'sm' | 'md' | 'lg';
  variant?: 'scrim' | 'solid' | 'ghost';
}

// Every size keeps a 48px minimum touch target.
const SIZE_CLASSES = {
  sm: 'h-12 w-12 min-h-[48px] min-w-[48px]',
  md: 'h-12 w-12 min-h-[48px] min-w-[48px]',
  lg: 'h-14 w-14 min-h-[56px] min-w-[56px]',
} as const;

const VARIANT_CLASSES = {
  // Sits on the camera feed, so it keeps light text in both themes.
  scrim: 'bg-black/45 text-white backdrop-blur-md border border-white/10 hover:bg-black/60',
  solid: 'bg-white/12 text-primary border border-white/10 hover:bg-white/20',
  ghost: 'bg-transparent text-secondary hover:bg-white/10',
} as const;

export const IconButton = forwardRef<HTMLButtonElement, IconButtonProps>(function IconButton(
  {
    label,
    icon,
    active = false,
    size = 'md',
    variant = 'scrim',
    className,
    type = 'button',
    'aria-pressed': ariaPressed,
    ...rest
  },
  ref,
) {
  return (
    <button
      ref={ref}
      type={type}
      aria-label={label}
      title={label}
      aria-pressed={ariaPressed ?? (active ? true : undefined)}
      className={cn(
        'inline-flex items-center justify-center rounded-2xl transition-[transform,background-color,color] duration-150 ease-swift',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-ink-900',
        'disabled:cursor-not-allowed disabled:opacity-40 active:scale-95 motion-reduce:active:scale-100 motion-reduce:transition-none',
        SIZE_CLASSES[size],
        VARIANT_CLASSES[variant],
        active && 'bg-accent text-accent-contrast hover:bg-accent',
        className,
      )}
      {...rest}
    >
      <span aria-hidden="true" className="flex items-center justify-center">
        {icon}
      </span>
    </button>
  );
});
