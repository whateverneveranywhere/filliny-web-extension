import { createStorage } from '../base/base.js';
import { StorageEnum } from '../base/enums.js';
import type { BaseStorageType } from '../base/types.js';
import type { DTOFillingProfileItem, DTOProfileFillingForm } from '../types/index.js';

/**
 * Accepted profile types for storage.
 * Accepts either a full profile form (from detail endpoint) or a lightweight
 * profile list item (from list endpoint, used during profile switching).
 */
type StorableProfile = DTOProfileFillingForm | DTOFillingProfileItem;

type ProfileStorage = BaseStorageType<DTOProfileFillingForm | undefined> & {
  setDefaultProfile: (activeProfile: StorableProfile | undefined) => Promise<void>;
  resetDefaultProfile: () => Promise<void>;
};

const storage = createStorage<DTOProfileFillingForm | undefined>('default-profile', undefined, {
  storageEnum: StorageEnum.Local,
  liveUpdate: true,
});

export const profileStorage: ProfileStorage = {
  ...storage,
  setDefaultProfile: async (activeProfile: StorableProfile | undefined) =>
    await storage.set(activeProfile as DTOProfileFillingForm | undefined),
  resetDefaultProfile: async () => await storage.set(undefined),
};
