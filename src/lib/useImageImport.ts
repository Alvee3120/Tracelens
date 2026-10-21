/**
 * The single entry point for getting an image onto the tracing surface —
 * whether it came from a file input, a drag-and-drop, or the built-in gallery.
 *
 * Responsibilities:
 *  - validate + decode (EXIF-aware) and downscale for processing
 *  - persist the full image and a downscaled recent thumbnail in IndexedDB
 *  - publish the display URL, blob and size to the trace store
 *  - turn every failure into a typed, user-visible error
 */
import { useCallback, useState } from 'react';
import type { AppError, ImageSource, StoredImage } from '@/types';
import { addRecent, createId, pruneImages, saveImage } from '@/db/db';
import { appError } from '@/lib/errors';
import {
  MAX_PROCESS_LONG_SIDE,
  MAX_RECENT_LONG_SIDE,
  closeBitmap,
  decodeImage,
  downscaleBlob,
  isImageFile,
} from '@/lib/imageUtils';
import { sampleDisplayUrl, sampleToRaster, type Sample } from '@/lib/samples';
import { useTraceStore } from '@/store/useTraceStore';

export interface ImportTarget {
  blob: Blob;
  name: string;
  source: ImageSource;
  /** Overrides the on-screen image (used by samples: transparent SVG for display). */
  displayUrl?: string;
}

export interface UseImageImportResult {
  importBlob: (target: ImportTarget) => Promise<boolean>;
  importFile: (file: File, source?: ImageSource) => Promise<boolean>;
  importSample: (sample: Sample) => Promise<boolean>;
  isImporting: boolean;
  error: AppError | null;
  clearError: () => void;
}

export function useImageImport(): UseImageImportResult {
  const setImage = useTraceStore((state) => state.setImage);
  const setImageLoading = useTraceStore((state) => state.setImageLoading);
  const pushToast = useTraceStore((state) => state.pushToast);
  const [isImporting, setIsImporting] = useState(false);
  const [error, setError] = useState<AppError | null>(null);

  const importBlob = useCallback(
    async ({ blob, name, source, displayUrl }: ImportTarget): Promise<boolean> => {
      setIsImporting(true);
      setImageLoading(true);
      setError(null);

      let decoded: Awaited<ReturnType<typeof decodeImage>> | null = null;
      try {
        decoded = await decodeImage(blob, MAX_PROCESS_LONG_SIDE);
      } catch (caught) {
        const failure = appError(
          'IMAGE_DECODE_FAILED',
          caught instanceof Error ? caught.message : undefined,
        );
        setError(failure);
        setImageLoading(false);
        pushToast(failure.message, 'error');
        return false;
      }

      const { width, height } = decoded;
      closeBitmap(decoded.bitmap);

      const id = createId();
      const record: StoredImage = {
        id,
        name,
        blob,
        width,
        height,
        createdAt: Date.now(),
        source,
      };

      // Persist the full image (restorable) and a small recent thumbnail.
      // Storage failures must never block tracing this session.
      try {
        await saveImage(record);
        const thumb = await downscaleBlob(blob, MAX_RECENT_LONG_SIDE, 'image/jpeg');
        await addRecent({ ...record, id: createId(), blob: thumb.blob, width: thumb.width, height: thumb.height });
        await pruneImages([id]);
      } catch (caught) {
        pushToast(
          appError('STORAGE_FAILED', caught instanceof Error ? caught.message : undefined).message,
          'warn',
        );
      }

      const url = displayUrl ?? URL.createObjectURL(blob);
      setImage({ id, url, blob, size: { width, height }, name, source });
      setIsImporting(false);
      return true;
    },
    [pushToast, setImage, setImageLoading],
  );

  const importFile = useCallback(
    async (file: File, source: ImageSource = 'gallery'): Promise<boolean> => {
      if (!isImageFile(file)) {
        const failure = appError('IMAGE_DECODE_FAILED', `Unsupported type: ${file.type || 'unknown'}`);
        setError(failure);
        pushToast(failure.message, 'error');
        return false;
      }
      return importBlob({ blob: file, name: file.name || 'Imported image', source });
    },
    [importBlob, pushToast],
  );

  const importSample = useCallback(
    async (sample: Sample): Promise<boolean> => {
      try {
        const raster = await sampleToRaster(sample);
        return await importBlob({
          blob: raster.blob,
          name: sample.name,
          source: 'sample',
          displayUrl: sampleDisplayUrl(sample),
        });
      } catch (caught) {
        const failure = appError(
          'IMAGE_DECODE_FAILED',
          caught instanceof Error ? caught.message : undefined,
        );
        setError(failure);
        pushToast(failure.message, 'error');
        return false;
      }
    },
    [importBlob, pushToast],
  );

  const clearError = useCallback(() => setError(null), []);

  return { importBlob, importFile, importSample, isImporting, error, clearError };
}
