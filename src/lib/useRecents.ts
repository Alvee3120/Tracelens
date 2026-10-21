/**
 * Recent images: the last 20 imports, stored as downscaled blobs.
 */
import { useCallback, useEffect, useState } from 'react';
import type { AppError, StoredImage } from '@/types';
import { clearRecents, deleteRecent, listRecents } from '@/db/db';
import { appError } from '@/lib/errors';

export interface UseRecentsResult {
  recents: StoredImage[];
  isLoading: boolean;
  error: AppError | null;
  refresh: () => Promise<void>;
  remove: (id: string) => Promise<void>;
  clear: () => Promise<void>;
}

export function useRecents(): UseRecentsResult {
  const [recents, setRecents] = useState<StoredImage[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<AppError | null>(null);

  const refresh = useCallback(async () => {
    try {
      const list = await listRecents();
      setRecents(list);
      setError(null);
    } catch (caught) {
      setError(appError('STORAGE_FAILED', caught instanceof Error ? caught.message : undefined));
    } finally {
      setIsLoading(false);
    }
  }, []);

  const remove = useCallback(
    async (id: string) => {
      try {
        await deleteRecent(id);
        setRecents((prev) => prev.filter((item) => item.id !== id));
      } catch (caught) {
        setError(appError('STORAGE_FAILED', caught instanceof Error ? caught.message : undefined));
      }
    },
    [],
  );

  const clear = useCallback(async () => {
    try {
      await clearRecents();
      setRecents([]);
    } catch (caught) {
      setError(appError('STORAGE_FAILED', caught instanceof Error ? caught.message : undefined));
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return { recents, isLoading, error, refresh, remove, clear };
}
