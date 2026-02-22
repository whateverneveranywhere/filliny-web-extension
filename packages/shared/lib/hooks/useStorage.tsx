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
 * Assertion function that guarantees a value is non-null/non-undefined.
 * Throws if the value is null or undefined, which should never happen
 * because wrapPromise throws (suspends) if the data is not yet available.
 */
const assertNonNullable = <T,>(value: T, message: string): NonNullable<T> => {
  if (value === null || value === undefined) {
    throw new Error(message);
  }
  return value as NonNullable<T>;
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

  // wrapPromise will throw (triggering Suspense) if the data is pending or errored,
  // so by this point the resolved value is guaranteed to be non-null.
  const storedPromise = storageMap.get(storage);
  const resolvedData = _data ?? storedPromise?.read();
  return assertNonNullable<Data>(resolvedData as Data, 'useStorage: unexpected null data after storage resolution');
};
