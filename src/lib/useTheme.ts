/** Applies the theme preference to <html> and follows the system setting. */
import { useEffect } from 'react';
import { useSettingsStore } from '@/store/useSettingsStore';

export function useTheme(): void {
  const theme = useSettingsStore((state) => state.theme);

  useEffect(() => {
    const root = document.documentElement;
    const media = window.matchMedia('(prefers-color-scheme: dark)');

    const apply = () => {
      const resolved = theme === 'system' ? (media.matches ? 'dark' : 'light') : theme;
      root.classList.toggle('dark', resolved === 'dark');
      root.style.colorScheme = resolved;
    };

    apply();

    if (theme !== 'system') return;
    media.addEventListener('change', apply);
    return () => media.removeEventListener('change', apply);
  }, [theme]);
}
