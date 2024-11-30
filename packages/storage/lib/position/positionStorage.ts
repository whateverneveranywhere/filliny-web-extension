import { StorageEnum } from '../base/enums';
import { createStorage } from '../base/base';
import type { BaseStorage } from '../base/types';

interface Position {
  x: number;
  y: number;
}

type PositionStorage = BaseStorage<Position> & {
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

export const positionStorage: PositionStorage = {
  get: async () => storage?.get() ?? defaultPosition,
  set: async value => storage?.set(value),
  getSnapshot: () => storage?.getSnapshot() ?? defaultPosition,
  subscribe: listener => storage?.subscribe(listener) ?? (() => {}),
  setPosition: async position => storage?.set(position),
  resetPosition: async () => storage?.set(defaultPosition),
};
