/**
 * App shell: theme wiring, routing, toasts, and the service-worker update
 * prompt. Everything below the shell is route-driven.
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import { BrowserRouter } from 'react-router-dom';
import { Download, RefreshCw, X } from 'lucide-react';
import { registerSW } from 'virtual:pwa-register';
import { strings } from '@/lib/strings';
import { useTheme } from '@/lib/useTheme';
import { AppRoutes } from '@/routes';
import { Toast } from '@/components/ui/Toast';
import { Button } from '@/components/ui/Button';
import { IconButton } from '@/components/ui/IconButton';

type UpdatePromptType = ((reloadPage?: boolean) => Promise<void>) | null;

export default function App() {
  useTheme();

  const [needRefresh, setNeedRefresh] = useState(false);
  const [offlineReady, setOfflineReady] = useState(false);
  const updateServiceWorkerRef = useRef<UpdatePromptType>(null);

  useEffect(() => {
    updateServiceWorkerRef.current = registerSW({
      immediate: true,
      onNeedRefresh: () => setNeedRefresh(true),
      onOfflineReady: () => setOfflineReady(true),
      onRegisteredSW: () => undefined,
    });
  }, []);

  useEffect(() => {
    if (!offlineReady) return;
    const timer = window.setTimeout(() => setOfflineReady(false), 3200);
    return () => window.clearTimeout(timer);
  }, [offlineReady]);

  const applyUpdate = useCallback(() => {
    void updateServiceWorkerRef.current?.(true);
  }, []);

  return (
    <BrowserRouter>
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:left-3 focus:top-3 focus:z-[70] focus:rounded-xl focus:bg-accent focus:px-3 focus:py-2 focus:text-sm focus:font-semibold focus:text-accent-contrast"
      >
        {strings.a11y.skipToContent}
      </a>

      <div id="main-content">
        <AppRoutes />
      </div>

      <Toast />

      {needRefresh ? (
        <div className="fixed inset-x-0 bottom-0 z-[65] flex justify-center px-4 pb-[max(env(safe-area-inset-bottom),0.75rem)]">
          <div className="flex w-full max-w-md items-center gap-3 rounded-2xl border border-white/10 bg-ink-800/95 px-4 py-3 shadow-2xl backdrop-blur-xl animate-slide-up motion-reduce:animate-none">
            <RefreshCw size={18} className="shrink-0 text-accent-strong" aria-hidden="true" />
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-primary">{strings.update.title}</p>
              <p className="text-xs text-muted">{strings.update.body}</p>
            </div>
            <Button size="sm" variant="primary" onClick={applyUpdate}>
              {strings.update.action}
            </Button>
            <IconButton
              label={strings.update.later}
              icon={<X size={16} />}
              variant="ghost"
              size="sm"
              onClick={() => setNeedRefresh(false)}
            />
          </div>
        </div>
      ) : null}

      {offlineReady && !needRefresh ? (
        <div
          role="status"
          className="pointer-events-none fixed inset-x-0 bottom-0 z-[64] flex justify-center px-4 pb-[max(env(safe-area-inset-bottom),0.75rem)]"
        >
          <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-ink-800/95 px-3 py-1.5 text-xs text-secondary backdrop-blur-xl animate-slide-up motion-reduce:animate-none">
            <Download size={14} aria-hidden="true" />
            {strings.app.name} · offline ready
          </span>
        </div>
      ) : null}
    </BrowserRouter>
  );
}
