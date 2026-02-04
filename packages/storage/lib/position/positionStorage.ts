import { createStorage } from '../base/base.js';
import { StorageEnum } from '../base/enums.js';
import { z } from 'zod';
import type { BaseStorageType } from '../base/types.js';

// ============================================================================
// Position Schema
// ============================================================================

/**
 * Position schema for button position storage
 */
const PositionSchema = z.object({
  x: z.number(),
  y: z.number(),
});

type Position = z.infer<typeof PositionSchema>;

type PositionStorage = BaseStorageType<Position> & {
  setPosition: (position: Position) => Promise<void>;
  resetPosition: () => Promise<void>;
};

const defaultPosition: Position = {
  x: 0,
  y: 0,
};

const isClient = typeof window !== 'undefined';
const storage = isClient
  ? createStorage<Position>('filliny-button-position', defaultPosition, {
      storageEnum: StorageEnum.Local,
      liveUpdate: true,
    })
  : null;

const positionStorage: PositionStorage = {
  get: async () => storage?.get() ?? defaultPosition,
  set: async value => storage?.set(value),
  getSnapshot: () => storage?.getSnapshot() ?? defaultPosition,
  subscribe: listener => storage?.subscribe(listener) ?? (() => {}),
  setPosition: async position => storage?.set(position),
  resetPosition: async () => storage?.set(defaultPosition),
};

// ============================================================================
// Exports (at end of file per ESLint import-x/exports-last rule)
// ============================================================================

export { PositionSchema, positionStorage };
export type { Position };
