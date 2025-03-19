import { StorageEnum } from '../base/enums.js';
import { createStorage } from '../base/base.js';
import type { BaseStorage } from '../base/types.js';
import type { DTOProfileFillingForm } from '../types/index.js';

type ProfileStrorage = BaseStorage<DTOProfileFillingForm | undefined> & {
  setDefaultProfile: (activeProfile: DTOProfileFillingForm | undefined) => Promise<void>;
  resetDefaultProfile: () => Promise<void>;
};

const storage = createStorage<DTOProfileFillingForm | undefined>('default-profile', undefined, {
  storageEnum: StorageEnum.Local,
  liveUpdate: true,
});

export const profileStrorage: ProfileStrorage = {
  ...storage,
  setDefaultProfile: async (activeProfile: DTOProfileFillingForm | undefined) => await storage.set(activeProfile),
  resetDefaultProfile: async () => await storage.set(undefined),
};
