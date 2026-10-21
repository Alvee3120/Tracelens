import { useEffect } from 'react';
import { AlertTriangle, CheckCircle2, Info, XCircle } from 'lucide-react';
import { cn } from '@/lib/cn';
import { useTraceStore, type ToastMessage } from '@/store/useTraceStore';

const VARIANT_STYLES: Record<ToastMessage['variant'], string> = {
  info: 'border-white/10 bg-ink-800/95 text-primary',
  success: 'border-emerald-400/30 bg-emerald-950/90 text-emerald-50',
  warn: 'border-amber-400/30 bg-amber-950/90 text-amber-50',
  error: 'border-red-400/30 bg-red-950/90 text-red-50',
};

const ICONS = {
  info: Info,
  success: CheckCircle2,
  warn: AlertTriangle,
  error: XCircle,
} as const;

const AUTO_DISMISS_MS = 3600;

export function Toast() {
  const toast = useTraceStore((state) => state.toast);
  const dismissToast = useTraceStore((state) => state.dismissToast);

  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => dismissToast(toast.id), AUTO_DISMISS_MS);
    return () => window.clearTimeout(timer);
  }, [toast, dismissToast]);

  if (!toast) return null;

  const Icon = ICONS[toast.variant];

  return (
    // Sits below the app's top bar so it never blocks the controls.
    <div
      role="status"
      aria-live="polite"
      className="pointer-events-none fixed inset-x-0 top-0 z-[60] flex justify-center px-4 pt-[calc(max(env(safe-area-inset-top),0.75rem)_+_4.75rem)]"
    >
      <div
        className={cn(
          'pointer-events-auto flex w-full max-w-md items-start gap-3 rounded-2xl border px-4 py-3 shadow-2xl backdrop-blur-xl',
          'animate-slide-up motion-reduce:animate-none',
          VARIANT_STYLES[toast.variant],
        )}
      >
        <Icon size={18} className="mt-0.5 shrink-0" aria-hidden="true" />
        <p className="min-w-0 flex-1 text-sm leading-snug">{toast.message}</p>
        <button
          type="button"
          onClick={() => dismissToast(toast.id)}
          // Inherits the toast's own text color so it works for every variant.
          className="min-h-12 min-w-12 shrink-0 rounded-lg px-3 text-xs font-semibold opacity-80 hover:bg-white/10 hover:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
        >
          OK
        </button>
      </div>
    </div>
  );
}
