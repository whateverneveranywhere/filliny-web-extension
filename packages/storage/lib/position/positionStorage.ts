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
  y: window.innerHeight * 0.25,
};

const storage = createStorage<Position>('filliny-button-position', defaultPosition, {
  storageEnum: StorageEnum.Local,
  liveUpdate: true,
});

export const positionStorage: PositionStorage = {
  ...storage,
  setPosition: async (position: Position) => await storage.set(position),
  resetPosition: async () => await storage.set(defaultPosition),
};
