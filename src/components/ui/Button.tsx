import type { ButtonHTMLAttributes, ReactNode } from 'react';
import { cn } from '@/lib/cn';

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger';
type Size = 'sm' | 'md' | 'lg';

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  fullWidth?: boolean;
  leadingIcon?: ReactNode;
  trailingIcon?: ReactNode;
}

const VARIANTS: Record<Variant, string> = {
  primary:
    'bg-accent text-accent-contrast hover:bg-accent-soft active:bg-accent-deep active:text-white shadow-lg shadow-accent/20',
  secondary:
    'bg-white/10 text-primary hover:bg-white/15 active:bg-white/20 border border-white/10 backdrop-blur',
  ghost: 'bg-transparent text-secondary hover:bg-white/10 active:bg-white/15',
  danger:
    'bg-red-700 text-white hover:bg-red-600 active:bg-red-800 border border-red-400/30 shadow-lg shadow-red-900/30',
};

// Every size keeps a 48px minimum touch target.
const SIZES: Record<Size, string> = {
  sm: 'min-h-12 px-4 text-sm gap-1.5 rounded-xl',
  md: 'min-h-12 px-5 text-base gap-2 rounded-2xl',
  lg: 'min-h-14 px-6 text-lg gap-2.5 rounded-2.5xl',
};

export function Button({
  variant = 'secondary',
  size = 'md',
  fullWidth = false,
  leadingIcon,
  trailingIcon,
  className,
  children,
  type = 'button',
  ...rest
}: ButtonProps) {
  return (
    <button
      type={type}
      className={cn(
        'inline-flex select-none items-center justify-center font-semibold tracking-tight transition-[transform,background-color,color] duration-150 ease-swift',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-ink-900',
        'disabled:cursor-not-allowed disabled:opacity-40',
        'active:scale-[0.98] motion-reduce:active:scale-100 motion-reduce:transition-none',
        VARIANTS[variant],
        SIZES[size],
        fullWidth && 'w-full',
        className,
      )}
      {...rest}
    >
      {leadingIcon ? <span className="shrink-0">{leadingIcon}</span> : null}
      <span className="truncate">{children}</span>
      {trailingIcon ? <span className="shrink-0">{trailingIcon}</span> : null}
    </button>
  );
}
