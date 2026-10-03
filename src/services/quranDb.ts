import { Ayah } from '../types';

// IndexedDB Helper for "Nur" Quran storage
// Caches opened Surahs offline in IndexedDB without localStorage 5MB quota limits.

const DB_NAME = 'nur_quran_db';
const DB_VERSION = 1;
const STORE_NAME = 'surahs';

function openDb(): Promise<IDBDatabase | null> {
  if (typeof window === 'undefined' || !('indexedDB' in window)) {
    return Promise.resolve(null);
  }

  return new Promise((resolve) => {
    try {
      const request = window.indexedDB.open(DB_NAME, DB_VERSION);

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          db.createObjectStore(STORE_NAME, { keyPath: 'surahNumber' });
        }
      };

      request.onsuccess = () => {
        resolve(request.result);
      };

      request.onerror = (e) => {
        console.warn('[quranDb] IndexedDB open error:', e);
        resolve(null);
      };
    } catch (err) {
      console.warn('[quranDb] IndexedDB initialization failed:', err);
      resolve(null);
    }
  });
}

function isValidAyahArray(ayahs: unknown): ayahs is Ayah[] {
  if (!Array.isArray(ayahs) || ayahs.length === 0) return false;
  return ayahs.every(
    (item) =>
      item &&
      typeof item === 'object' &&
      typeof (item as Ayah).numberInSurah === 'number' &&
      typeof (item as Ayah).arabic === 'string' &&
      typeof (item as Ayah).translation === 'string'
  );
}

// Retrieve Ayahs for a given Surah number from IndexedDB
export async function getSurahFromIndexedDB(surahNumber: number): Promise<Ayah[] | null> {
  const db = await openDb();
  if (!db) return null;

  return new Promise((resolve) => {
    try {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const req = store.get(surahNumber);

      req.onsuccess = () => {
        if (req.result && isValidAyahArray(req.result.ayahs)) {
          resolve(req.result.ayahs);
        } else {
          resolve(null);
        }
      };

      req.onerror = () => {
        resolve(null);
      };

      tx.onerror = () => resolve(null);
      tx.onabort = () => resolve(null);
    } catch (_e) {
      resolve(null);
    }
  });
}

// Save Ayahs for a given Surah number into IndexedDB
export async function saveSurahToIndexedDB(surahNumber: number, ayahs: Ayah[]): Promise<boolean> {
  if (!isValidAyahArray(ayahs)) return false;
  const db = await openDb();
  if (!db) return false;

  return new Promise((resolve) => {
    try {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      const req = store.put({
        surahNumber,
        ayahs,
        updatedAt: Date.now(),
      });

      req.onsuccess = () => resolve(true);
      req.onerror = () => resolve(false);
      tx.onerror = () => resolve(false);
      tx.onabort = () => resolve(false);
    } catch (_e) {
      resolve(false);
    }
  });
}

// Check which Surahs have been cached offline in IndexedDB
export async function getCachedSurahNumbers(): Promise<number[]> {
  const db = await openDb();
  if (!db) return [];

  return new Promise((resolve) => {
    try {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const req = store.getAllKeys();

      req.onsuccess = () => {
        const keys = req.result;
        resolve((keys as number[]).map(Number));
      };

      req.onerror = () => resolve([]);
    } catch (_e) {
      resolve([]);
    }
  });
}
