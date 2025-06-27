import { createStorage } from "../base/base.js";
import { StorageEnum } from "../base/enums.js";
import type { BaseStorageType } from "../base/types.js";

type AuthTokenType = string;

type AuthStorage = BaseStorageType<AuthTokenType> & {
  setToken: (token: AuthTokenType) => Promise<void>;
  deleteToken: () => Promise<void>;
};

const storage = createStorage<AuthTokenType>("auth-token", "", {
  storageEnum: StorageEnum.Local,
  liveUpdate: true,
});

export const authStorage: AuthStorage = {
  ...storage,
  setToken: async (token: AuthTokenType) => await storage.set(token),
  deleteToken: async () => await storage.set(""),
};
