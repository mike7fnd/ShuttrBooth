import { PhotoStripData } from '../types';

const DB_NAME = 'photobooth_db';
const DB_VERSION = 1;
const STORE_NAME = 'photostrips';
const LS_FALLBACK_KEY = 'photobooth_strips_backup';

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined' || !window.indexedDB) {
      return reject(new Error('IndexedDB not supported'));
    }
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        const store = db.createObjectStore(STORE_NAME, { keyPath: 'id' });
        store.createIndex('createdAt', 'createdAt', { unique: false });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

/**
 * Save a new photo strip to IndexedDB (with fallback)
 */
export async function savePhotoStrip(strip: PhotoStripData): Promise<void> {
  try {
    const db = await openDB();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      const req = store.put(strip);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  } catch {
    // Fallback to localStorage
    try {
      const existing = getStripsFromLocalStorage();
      const filtered = existing.filter((s) => s.id !== strip.id);
      filtered.unshift(strip);
      // Keep max 20 in localStorage to avoid quota limits
      localStorage.setItem(LS_FALLBACK_KEY, JSON.stringify(filtered.slice(0, 20)));
    } catch {
      // Storage quota exceeded or unavailable
    }
  }
}

/**
 * Retrieve all saved photo strips, sorted newest first
 */
export async function getAllPhotoStrips(): Promise<PhotoStripData[]> {
  try {
    const db = await openDB();
    return await new Promise<PhotoStripData[]>((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const req = store.getAll();
      req.onsuccess = () => {
        const results = req.result as PhotoStripData[];
        results.sort((a, b) => b.createdAt - a.createdAt);
        resolve(results);
      };
      req.onerror = () => reject(req.error);
    });
  } catch {
    return getStripsFromLocalStorage();
  }
}

/**
 * Delete a photo strip by ID
 */
export async function deletePhotoStrip(id: string): Promise<void> {
  try {
    const db = await openDB();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      const req = store.delete(id);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  } catch {
    const existing = getStripsFromLocalStorage();
    const filtered = existing.filter((s) => s.id !== id);
    localStorage.setItem(LS_FALLBACK_KEY, JSON.stringify(filtered));
  }
}

function getStripsFromLocalStorage(): PhotoStripData[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(LS_FALLBACK_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as PhotoStripData[];
    return parsed.sort((a, b) => b.createdAt - a.createdAt);
  } catch {
    return [];
  }
}
