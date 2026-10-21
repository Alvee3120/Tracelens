/**
 * Shared Button/anchor styling. Links and buttons must look identical, so the
 * class maps live here rather than being duplicated per component.
 */
export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger';
export type ButtonSize = 'sm' | 'md' | 'lg';

export const BUTTON_BASE =
  'inline-flex select-none items-center justify-center font-semibold tracking-tight transition-[transform,background-color,color] duration-150 ease-swift focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-ink-900 active:scale-[0.98] motion-reduce:active:scale-100 motion-reduce:transition-none';

export const BUTTON_VARIANTS: Record<ButtonVariant, string> = {
  primary:
    'bg-accent text-accent-contrast hover:bg-accent-soft active:bg-accent-deep active:text-white shadow-lg shadow-accent/20',
  secondary:
    'bg-white/10 text-primary hover:bg-white/15 active:bg-white/20 border border-white/10 backdrop-blur',
  ghost: 'bg-transparent text-secondary hover:bg-white/10 active:bg-white/15',
  danger:
    'bg-red-700 text-white hover:bg-red-600 active:bg-red-800 border border-red-400/30 shadow-lg shadow-red-900/30',
};

// Every size keeps a 48px minimum touch target.
export const BUTTON_SIZES: Record<ButtonSize, string> = {
  sm: 'min-h-12 px-4 text-sm gap-1.5 rounded-xl',
  md: 'min-h-12 px-5 text-base gap-2 rounded-2xl',
  lg: 'min-h-14 px-6 text-lg gap-2.5 rounded-2.5xl',
};
