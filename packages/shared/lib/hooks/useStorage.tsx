import { useRef, useSyncExternalStore } from 'react';
import type { BaseStorageType } from '@extension/storage';

/**
 * Generic wrapped promise for storage data
 */
interface WrappedPromiseResult<T> {
  read: () => T;
}

type WrappedPromise<T = unknown> = WrappedPromiseResult<T>;

/**
 * Storage map key interface - captures the read-only structure of BaseStorageType
 * that we need for Map key comparison (object identity).
 * This avoids contravariance issues with the 'set' method while maintaining type safety.
 */
interface StorageMapKey {
  get: () => Promise<unknown>;
  getSnapshot: () => unknown;
  subscribe: (listener: () => void) => () => void;
}

/**
 * Storage map for caching wrapped promises.
 * Uses StorageMapKey as the key type since it's covariant and compatible
 * with all BaseStorageType<T> instances through structural typing.
 */
const storageMap = new Map<StorageMapKey, WrappedPromise>();

const wrapPromise = <R,>(promise: Promise<R>) => {
  let status = 'pending';
  let result: R;

  const suspender = promise.then(
    r => {
      status = 'success';
      result = r;
    },
    e => {
      status = 'error';
      result = e;
    },
  );

  return {
    read() {
      switch (status) {
        case 'pending':
          throw suspender;
        case 'error':
          throw result;
        default:
          return result;
      }
    },
  };
};

/**
 * Hook for accessing storage data with React Suspense support
 * @template Storage - The storage type being used
 * @template Data - The data type stored (inferred from Storage)
 */
export const useStorage = <
  Storage extends BaseStorageType<Data>,
  Data = Storage extends BaseStorageType<infer D> ? D : never,
>(
  storage: Storage,
): NonNullable<Data> => {
  const initializedRef = useRef(false);
  const _data = useSyncExternalStore<Data | null>(storage.subscribe, storage.getSnapshot);

  if (!storageMap.has(storage)) {
    storageMap.set(storage, wrapPromise(storage.get()));
  }

  if (_data || initializedRef.current) {
    storageMap.set(storage, { read: () => _data });
    initializedRef.current = true;
  }

  // The non-null assertion is safe here because wrapPromise will throw if pending/error
  const storedPromise = storageMap.get(storage);
  return (_data ?? storedPromise?.read()) as NonNullable<Data>;
};
