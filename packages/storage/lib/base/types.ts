import { z } from 'zod';
import type { StorageEnum } from './index.js';

export type ValueOrUpdateType<D> = D | ((prev: D) => Promise<D> | D);

export type BaseStorageType<D> = {
  get: () => Promise<D>;
  set: (value: ValueOrUpdateType<D>) => Promise<void>;
  getSnapshot: () => D | null;
  subscribe: (listener: () => void) => () => void;
};

export type StorageConfigType<D = string> = {
  /**
   * Assign the {@link StorageEnum} to use.
   * @default Local
   */
  storageEnum?: StorageEnum;
  /**
   * Only for {@link StorageEnum.Session}: Grant Content scripts access to storage area?
   * @default false
   */
  sessionAccessForContentScripts?: boolean;
  /**
   * Keeps state live in sync between all instances of the extension. Like between popup, side panel and content scripts.
   * To allow chrome background scripts to stay in sync as well, use {@link StorageEnum.Session} storage area with
   * {@link StorageConfigType.sessionAccessForContentScripts} potentially also set to true.
   * @see https://stackoverflow.com/a/75637138/2763239
   * @default false
   */
  liveUpdate?: boolean;
  /**
   * An optional props for converting values from storage and into it.
   * @default undefined
   */
  serialization?: {
    /**
     * convert non-native values to string to be saved in storage
     */
    serialize: (value: D) => string;
    /**
     * convert string value from storage to non-native values
     */
    deserialize: (text: string) => D;
  };
};

// ============================================================================
// Zod Schemas for Theme Storage
// ============================================================================

/**
 * Binary theme schema (light/dark only, no system option)
 * Compatible with BinaryTheme enum from @extension/shared
 */
export const BinaryThemeSchema = z.enum(['light', 'dark']);

/**
 * Theme state schema
 */
export const ThemeStateSchema = z.object({
  theme: BinaryThemeSchema,
  isLight: z.boolean(),
});

// ============================================================================
// Type Exports (inferred from schemas)
// ============================================================================

/**
 * Binary theme type for storage (light/dark only, no system option)
 */
export type BinaryThemeType = z.infer<typeof BinaryThemeSchema>;

/**
 * Theme state type
 */
export type ThemeStateType = z.infer<typeof ThemeStateSchema>;

export type ThemeStorageType = BaseStorageType<ThemeStateType> & {
  toggle: () => Promise<void>;
};
