/**
 * Object-URL lifecycle for blob collections.
 *
 * The effect is keyed on a content *signature* rather than the array identity.
 * Callers build their entry list during render (e.g. `recents.map(...)`), so
 * depending on the array would re-create and revoke every URL on every render:
 * the thumbnails blink and the browser chases URLs that were already revoked.
 */
import { useEffect, useRef, useState } from 'react';

export interface BlobEntry {
  /** Stable identity for the blob (a record id) used to detect real changes. */
  key: string;
  blob: Blob;
}

function signatureOf(entries: readonly BlobEntry[]): string {
  return entries.map((entry) => `${entry.key}:${entry.blob.size}:${entry.blob.type}`).join('|');
}

/** Creates one object URL per entry, preserving order; revokes them on change/unmount. */
export function useBlobUrls(entries: readonly BlobEntry[]): (string | null)[] {
  const entriesRef = useRef(entries);
  entriesRef.current = entries;

  const signature = signatureOf(entries);
  const [urls, setUrls] = useState<(string | null)[]>(() => entries.map(() => null));

  useEffect(() => {
    const created = entriesRef.current.map((entry) => URL.createObjectURL(entry.blob));
    setUrls(created);
    return () => created.forEach((url) => URL.revokeObjectURL(url));
  }, [signature]);

  return urls;
}
