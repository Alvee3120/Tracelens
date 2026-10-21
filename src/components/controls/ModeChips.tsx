import { Contrast, Image as ImageIcon, ScanLine, SunMoon } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/cn';
import { strings } from '@/lib/strings';
import type { ImageMode } from '@/types';
import { useTraceStore } from '@/store/useTraceStore';
import { haptics } from '@/lib/haptics';

interface ModeDefinition {
  id: ImageMode;
  label: string;
  icon: LucideIcon;
}

const MODES: ModeDefinition[] = [
  { id: 'original', label: strings.modes.original, icon: ImageIcon },
  { id: 'outline', label: strings.modes.outline, icon: ScanLine },
  { id: 'grayscale', label: strings.modes.grayscale, icon: Contrast },
  { id: 'invert', label: strings.modes.invert, icon: SunMoon },
];

export interface ModeChipsProps {
  className?: string;
}

export function ModeChips({ className }: ModeChipsProps) {
  const mode = useTraceStore((state) => state.mode);
  const setMode = useTraceStore((state) => state.setMode);

  return (
    <div
      role="radiogroup"
      aria-label={strings.trace.mode}
      className={cn('flex items-center gap-2 overflow-x-auto pb-0.5', className)}
    >
      {MODES.map(({ id, label, icon: Icon }) => {
        const active = mode === id;
        return (
          <button
            key={id}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => {
              setMode(id);
              haptics.trigger('tap');
            }}
            className={cn(
              'inline-flex min-h-12 shrink-0 items-center gap-2 rounded-2xl border px-3.5 text-sm font-medium transition-colors duration-150 ease-swift',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-ink-900',
              active
                ? 'border-accent/40 bg-accent text-accent-contrast'
                : 'border-white/10 bg-white/8 text-secondary hover:bg-white/15',
            )}
          >
            <Icon size={16} aria-hidden="true" />
            {label}
          </button>
        );
      })}
    </div>
  );
}
