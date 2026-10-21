/** Object-URL lifecycle helpers — always revoked on change/unmount. */
import { useEffect, useState } from 'react';

export function useBlobUrl(blob: Blob | null | undefined): string | null {
  const [url, setUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!blob) {
      setUrl(null);
      return;
    }
    const next = URL.createObjectURL(blob);
    setUrl(next);
    return () => URL.revokeObjectURL(next);
  }, [blob]);

  return url;
}

/** Creates one URL per blob, preserving order; revokes them all on cleanup. */
export function useBlobUrls(blobs: readonly Blob[]): (string | null)[] {
  const [urls, setUrls] = useState<(string | null)[]>(() => blobs.map(() => null));

  useEffect(() => {
    const created = blobs.map((blob) => URL.createObjectURL(blob));
    setUrls(created);
    return () => created.forEach((url) => URL.revokeObjectURL(url));
  }, [blobs]);

  return urls;
}
