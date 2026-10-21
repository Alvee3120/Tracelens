import { useEffect, useRef, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import { cn } from '@/lib/cn';
import { strings } from '@/lib/strings';
import { IconButton } from '@/components/ui/IconButton';

export interface BottomSheetProps {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  /** Optional footer rendered outside the scroll area. */
  footer?: ReactNode;
  className?: string;
}

export function BottomSheet({ open, onClose, title, children, footer, className }: BottomSheetProps) {
  const panelRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!open) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKeyDown);

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const timer = window.setTimeout(() => panelRef.current?.focus(), 30);

    return () => {
      document.removeEventListener('keydown', onKeyDown);
      document.body.style.overflow = previousOverflow;
      window.clearTimeout(timer);
    };
  }, [open, onClose]);

  if (!open) return null;

  return createPortal(
    <div className="fixed inset-0 z-50 flex flex-col justify-end" role="presentation">
      <button
        type="button"
        aria-label={strings.common.close}
        onClick={onClose}
        className="absolute inset-0 h-full w-full cursor-default bg-black/60 backdrop-blur-[2px] animate-fade-in motion-reduce:animate-none"
      />

      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        tabIndex={-1}
        className={cn(
          'relative flex max-h-[82dvh] flex-col rounded-t-3xl border-t border-white/10 bg-ink-800/95 shadow-2xl backdrop-blur-xl',
          'animate-slide-up motion-reduce:animate-none',
          'pb-[max(env(safe-area-inset-bottom),0.75rem)]',
          className,
        )}
      >
        <div className="flex items-center justify-between gap-3 px-4 pb-2 pt-3">
          <div
            aria-hidden="true"
            className="absolute left-1/2 top-1.5 h-1 w-10 -translate-x-1/2 rounded-full bg-white/20"
          />
          <h2 className="pl-1 text-base font-semibold text-primary">{title}</h2>
          <IconButton
            label={strings.common.close}
            icon={<X size={20} />}
            variant="ghost"
            size="sm"
            onClick={onClose}
          />
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 pb-4">{children}</div>

        {footer ? <div className="border-t border-white/10 px-4 pt-3">{footer}</div> : null}
      </div>
    </div>,
    document.body,
  );
}
