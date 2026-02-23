/**
 * Directory Handle Storage
 *
 * IndexedDB-based storage for FileSystemDirectoryHandle objects.
 * These handles cannot be stored in chrome.storage (not serializable),
 * so we use IndexedDB which supports structured cloning.
 */

/** Extended handle type with permission methods (not yet in all TS lib definitions) */
interface FileSystemHandleWithPermission extends FileSystemDirectoryHandle {
  requestPermission?: (descriptor: { mode: 'read' | 'readwrite' }) => Promise<PermissionState>;
  queryPermission?: (descriptor: { mode: 'read' | 'readwrite' }) => Promise<PermissionState>;
}

const DB_NAME = 'filliny-directory-handles';
const DB_VERSION = 1;
const STORE_NAME = 'handles';
const DB_OPEN_TIMEOUT = 5_000;

const openDatabase = (): Promise<IDBDatabase> =>
  new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('IndexedDB open timed out')), DB_OPEN_TIMEOUT);

    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME);
      }
    };

    request.onsuccess = () => {
      clearTimeout(timer);
      resolve(request.result);
    };

    request.onerror = () => {
      clearTimeout(timer);
      reject(request.error);
    };
  });

/** Run a transaction and ensure the DB connection is always closed. */
const withTransaction = async <T>(
  mode: IDBTransactionMode,
  operation: (store: IDBObjectStore) => IDBRequest,
  extractResult: (request: IDBRequest) => T,
): Promise<T> => {
  const db = await openDatabase();
  try {
    return await new Promise<T>((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, mode);
      const store = tx.objectStore(STORE_NAME);
      const request = operation(store);
      request.onsuccess = () => resolve(extractResult(request));
      request.onerror = () => reject(request.error);
      tx.onerror = () => reject(tx.error);
    });
  } finally {
    db.close();
  }
};

/**
 * Store a directory handle for a profile.
 */
const setDirectoryHandle = async (profileId: string, handle: FileSystemDirectoryHandle): Promise<void> => {
  try {
    await withTransaction(
      'readwrite',
      store => store.put(handle, `profile:${profileId}`),
      () => undefined,
    );
  } catch (err) {
    console.warn('Failed to store directory handle:', err);
  }
};

/**
 * Retrieve a stored directory handle for a profile.
 */
const getDirectoryHandle = async (profileId: string): Promise<FileSystemDirectoryHandle | null> => {
  try {
    return await withTransaction(
      'readonly',
      store => store.get(`profile:${profileId}`),
      request => (request.result as FileSystemDirectoryHandle) || null,
    );
  } catch {
    return null;
  }
};

/**
 * Remove a stored directory handle for a profile.
 */
const removeDirectoryHandle = async (profileId: string): Promise<void> => {
  try {
    await withTransaction(
      'readwrite',
      store => store.delete(`profile:${profileId}`),
      () => undefined,
    );
  } catch (err) {
    console.warn('Failed to remove directory handle:', err);
  }
};

/**
 * Verify that we have write permission on a directory handle.
 * Returns true if write permission is granted.
 */
const verifyWritePermission = async (handle: FileSystemDirectoryHandle): Promise<boolean> => {
  try {
    const extHandle = handle as FileSystemHandleWithPermission;
    if (extHandle.queryPermission) {
      // Check existing permission first (no prompt)
      const existing = await extHandle.queryPermission({ mode: 'readwrite' });
      if (existing === 'granted') return true;
    }
    if (extHandle.requestPermission) {
      const permission = await extHandle.requestPermission({ mode: 'readwrite' });
      return permission === 'granted';
    }
    return false;
  } catch {
    return false;
  }
};

/**
 * Write a file to the authorized directory.
 * Creates or overwrites a file with the given name and content.
 * Ensures the writable stream is always closed to prevent resource leaks.
 */
const writeFileToDirectory = async (handle: FileSystemDirectoryHandle, filename: string, blob: Blob): Promise<void> => {
  const fileHandle = await handle.getFileHandle(filename, { create: true });
  const writable = await fileHandle.createWritable();
  try {
    await writable.write(blob);
  } finally {
    await writable.close();
  }
};

export { setDirectoryHandle, getDirectoryHandle, removeDirectoryHandle, verifyWritePermission, writeFileToDirectory };
