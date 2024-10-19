import { StorageEnum } from '../base/enums';
import { createStorage } from '../base/base';
import type { BaseStorage } from '../base/types';

type AuthTokenType = string;

type AuthStorage = BaseStorage<AuthTokenType> & {
  setToken: (token: AuthTokenType) => Promise<void>;
};

const storage = createStorage<AuthTokenType>('auth-token', '', {
  storageEnum: StorageEnum.Local,
  liveUpdate: true,
});

export const authStorage: AuthStorage = {
  ...storage,
  setToken: async (token: AuthTokenType) => await storage.set(token),
};
