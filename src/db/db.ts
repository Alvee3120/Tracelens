/**
 * IndexedDB access via `idb`. Three stores:
 *   images  — the full-resolution overlay currently in use (one row per import)
 *   recents — downscaled copies of the last 20 imports, for the quick picker
 *   session — a single "last" row holding the restorable trace session
 */
import { openDB, type DBSchema, type IDBPDatabase } from 'idb';
import type { StoredImage, TraceSessionSnapshot } from '@/types';

export const DB_NAME = 'tracelens';
export const DB_VERSION = 1;
export const MAX_RECENTS = 20;
export const SESSION_KEY = 'last';

interface TraceLensDB extends DBSchema {
  images: {
    key: string;
    value: StoredImage;
    indexes: { 'by-created': number };
  };
  recents: {
    key: string;
    value: StoredImage;
    indexes: { 'by-created': number };
  };
  session: {
    key: string;
    value: TraceSessionSnapshot;
  };
}

let dbPromise: Promise<IDBPDatabase<TraceLensDB>> | null = null;

function getDb(): Promise<IDBPDatabase<TraceLensDB>> {
  if (!dbPromise) {
    dbPromise = openDB<TraceLensDB>(DB_NAME, DB_VERSION, {
      upgrade(db) {
        if (!db.objectStoreNames.contains('images')) {
          const images = db.createObjectStore('images', { keyPath: 'id' });
          images.createIndex('by-created', 'createdAt');
        }
        if (!db.objectStoreNames.contains('recents')) {
          const recents = db.createObjectStore('recents', { keyPath: 'id' });
          recents.createIndex('by-created', 'createdAt');
        }
        if (!db.objectStoreNames.contains('session')) {
          db.createObjectStore('session');
        }
      },
      terminated() {
        // The browser killed the connection (usually a version change elsewhere).
        dbPromise = null;
      },
    });
  }
  return dbPromise;
}

export function resetDbConnection(): void {
  dbPromise = null;
}

export function createId(prefix = 'img'): string {
  const random =
    typeof crypto !== 'undefined' && 'randomUUID' in crypto
      ? crypto.randomUUID()
      : Math.random().toString(36).slice(2);
  return `${prefix}_${random}`;
}

/* ------------------------------------------------------------------ images -- */

export async function saveImage(image: StoredImage): Promise<void> {
  const db = await getDb();
  await db.put('images', image);
}

export async function getImage(id: string): Promise<StoredImage | undefined> {
  const db = await getDb();
  return db.get('images', id);
}

export async function deleteImage(id: string): Promise<void> {
  const db = await getDb();
  await db.delete('images', id);
}

export async function pruneImages(keepIds: string[]): Promise<void> {
  const db = await getDb();
  const keys = await db.getAllKeys('images');
  const keep = new Set(keepIds);
  const tx = db.transaction('images', 'readwrite');
  await Promise.all(
    keys.filter((key) => !keep.has(key)).map((key) => tx.store.delete(key)),
  );
  await tx.done;
}

/* ----------------------------------------------------------------- recents -- */

export async function listRecents(): Promise<StoredImage[]> {
  const db = await getDb();
  const all = await db.getAllFromIndex('recents', 'by-created');
  return all.reverse(); // newest first
}

export async function addRecent(image: StoredImage): Promise<void> {
  const db = await getDb();
  await db.put('recents', image);

  // Trim to the newest MAX_RECENTS entries.
  const keys = await db.getAllKeysFromIndex('recents', 'by-created');
  if (keys.length > MAX_RECENTS) {
    const excess = keys.slice(0, keys.length - MAX_RECENTS);
    const tx = db.transaction('recents', 'readwrite');
    await Promise.all(excess.map((key) => tx.store.delete(key)));
    await tx.done;
  }
}

export async function deleteRecent(id: string): Promise<void> {
  const db = await getDb();
  await db.delete('recents', id);
}

export async function clearRecents(): Promise<void> {
  const db = await getDb();
  await db.clear('recents');
}

/* ----------------------------------------------------------------- session -- */

export async function saveSession(snapshot: TraceSessionSnapshot): Promise<void> {
  const db = await getDb();
  await db.put('session', snapshot, SESSION_KEY);
}

export async function loadSession(): Promise<TraceSessionSnapshot | undefined> {
  const db = await getDb();
  return db.get('session', SESSION_KEY);
}

export async function clearSession(): Promise<void> {
  const db = await getDb();
  await db.delete('session', SESSION_KEY);
}

/* --------------------------------------------------------------------- all -- */

export async function clearAllData(): Promise<void> {
  const db = await getDb();
  const tx = db.transaction(['images', 'recents', 'session'], 'readwrite');
  await Promise.all([tx.objectStore('images').clear(), tx.objectStore('recents').clear(), tx.objectStore('session').clear()]);
  await tx.done;
}

export interface StorageUsage {
  usage: number;
  quota: number;
  ratio: number;
}

export async function estimateStorage(): Promise<StorageUsage | null> {
  if (typeof navigator === 'undefined' || !navigator.storage?.estimate) return null;
  try {
    const estimate = await navigator.storage.estimate();
    const usage = estimate.usage ?? 0;
    const quota = estimate.quota ?? 0;
    return { usage, quota, ratio: quota > 0 ? usage / quota : 0 };
  } catch {
    return null;
  }
}
