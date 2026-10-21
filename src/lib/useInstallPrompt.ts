/**
 * PWA install prompt. Chrome/Edge (Android + desktop) fire
 * `beforeinstallprompt`, which we capture and replay from the Install button.
 * iOS Safari never fires it, so we expose detection for the manual
 * "Add to Home Screen" instructions instead.
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import { isAndroid, isIOS, isStandalone } from '@/lib/capabilities';

export interface UseInstallPromptResult {
  canInstall: boolean;
  installed: boolean;
  standalone: boolean;
  isIOSDevice: boolean;
  isAndroidDevice: boolean;
  promptInstall: () => Promise<'accepted' | 'dismissed' | 'unavailable'>;
}

export function useInstallPrompt(): UseInstallPromptResult {
  const deferredRef = useRef<BeforeInstallPromptEvent | null>(null);
  const [canInstall, setCanInstall] = useState(false);
  const [installed, setInstalled] = useState(false);
  const [standalone, setStandalone] = useState(() => isStandalone());

  useEffect(() => {
    const onBeforeInstall = (event: BeforeInstallPromptEvent) => {
      event.preventDefault();
      deferredRef.current = event;
      setCanInstall(true);
    };
    const onInstalled = () => {
      deferredRef.current = null;
      setCanInstall(false);
      setInstalled(true);
      setStandalone(true);
    };

    window.addEventListener('beforeinstallprompt', onBeforeInstall);
    window.addEventListener('appinstalled', onInstalled);

    const media = window.matchMedia('(display-mode: standalone)');
    const onDisplayChange = (event: MediaQueryListEvent) => setStandalone(event.matches);
    media.addEventListener('change', onDisplayChange);

    return () => {
      window.removeEventListener('beforeinstallprompt', onBeforeInstall);
      window.removeEventListener('appinstalled', onInstalled);
      media.removeEventListener('change', onDisplayChange);
    };
  }, []);

  const promptInstall = useCallback(async (): Promise<'accepted' | 'dismissed' | 'unavailable'> => {
    const deferred = deferredRef.current;
    if (!deferred) return 'unavailable';
    try {
      await deferred.prompt();
      const choice = await deferred.userChoice;
      deferredRef.current = null;
      setCanInstall(false);
      return choice.outcome;
    } catch {
      return 'unavailable';
    }
  }, []);

  return {
    canInstall,
    installed,
    standalone,
    isIOSDevice: isIOS(),
    isAndroidDevice: isAndroid(),
    promptInstall,
  };
}
