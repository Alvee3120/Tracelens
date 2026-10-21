/**
 * Keeps the screen awake while tracing. The browser drops the wake lock
 * whenever the tab is hidden, so we re-acquire it on every visibility change
 * and surface a notice when the API is unavailable or the request fails.
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import { strings } from '@/lib/strings';
import { wakeLock } from '@/lib/wakeLock';

export interface UseWakeLockResult {
  supported: boolean;
  active: boolean;
  notice: string | null;
  acquire: () => Promise<void>;
  release: () => Promise<void>;
}

export function useWakeLock(enabled: boolean): UseWakeLockResult {
  const [active, setActive] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const enabledRef = useRef(enabled);
  enabledRef.current = enabled;

  const acquire = useCallback(async () => {
    if (!wakeLock.isSupported) {
      setNotice(strings.wakeLock.unavailable);
      setActive(false);
      return;
    }
    const ok = await wakeLock.request();
    setActive(ok);
    setNotice(ok ? null : strings.wakeLock.failed);
  }, []);

  const release = useCallback(async () => {
    await wakeLock.release();
    setActive(false);
  }, []);

  useEffect(() => {
    if (!enabled) {
      void release();
      setNotice(null);
      return;
    }

    void acquire();

    const handleVisibility = () => {
      if (!enabledRef.current) return;
      if (document.hidden) {
        void release();
      } else {
        void acquire();
      }
    };

    document.addEventListener('visibilitychange', handleVisibility);
    window.addEventListener('focus', handleVisibility);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibility);
      window.removeEventListener('focus', handleVisibility);
      void release();
    };
  }, [enabled, acquire, release]);

  return { supported: wakeLock.isSupported, active, notice, acquire, release };
}
