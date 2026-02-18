import { createStorage } from '../base/base.js';
import { StorageEnum } from '../base/enums.js';
import type { BaseStorageType } from '../base/types.js';

/**
 * Information about a single local file that was scanned from the user's authorized folder
 */
interface LocalFileInfo {
  /** File name including extension, e.g., "John_Doe_Resume.pdf" */
  name: string;
  /** Relative path within the authorized folder, e.g., "resumes/John_Doe_Resume.pdf" */
  relativePath: string;
  /** File extension without dot, e.g., "pdf" */
  extension: string;
  /** File size in bytes */
  size: number;
  /** Last modified timestamp */
  lastModified: number;
  /** MIME type, e.g., "application/pdf" */
  mimeType: string;
}

/**
 * Data for an authorized folder associated with a profile
 */
interface AuthorizedFolderData {
  /** Display name of the folder (typically the folder name) */
  folderName: string;
  /** List of scanned files from the folder */
  files: LocalFileInfo[];
  /** Timestamp when the folder was last scanned */
  lastScanned: number;
}

/**
 * Storage type keyed by profileId
 */
type LocalFilesStorageData = Record<string, AuthorizedFolderData>;

/**
 * Extended storage type for local files with helper methods
 */
type LocalFilesStorageType = BaseStorageType<LocalFilesStorageData> & {
  /** Set authorized folder data for a specific profile */
  setProfileFolder: (profileId: string, folderData: AuthorizedFolderData) => Promise<void>;
  /** Get authorized folder data for a specific profile */
  getProfileFolder: (profileId: string) => Promise<AuthorizedFolderData | undefined>;
  /** Clear authorized folder for a specific profile */
  clearProfileFolder: (profileId: string) => Promise<void>;
  /** Get files for a specific profile */
  getProfileFiles: (profileId: string) => Promise<LocalFileInfo[]>;
};

const storage = createStorage<LocalFilesStorageData>(
  'local-authorized-files',
  {},
  {
    storageEnum: StorageEnum.Local,
    liveUpdate: true,
  },
);

const localFilesStorage: LocalFilesStorageType = {
  ...storage,

  setProfileFolder: async (profileId: string, folderData: AuthorizedFolderData) => {
    const current = await storage.get();
    await storage.set({
      ...current,
      [profileId]: folderData,
    });
  },

  getProfileFolder: async (profileId: string) => {
    const current = await storage.get();
    return current[profileId];
  },

  clearProfileFolder: async (profileId: string) => {
    const current = await storage.get();
    const updated = Object.fromEntries(Object.entries(current).filter(([key]) => key !== profileId));
    await storage.set(updated);
  },

  getProfileFiles: async (profileId: string) => {
    const current = await storage.get();
    return current[profileId]?.files || [];
  },
};

export { localFilesStorage };
export type { LocalFileInfo, AuthorizedFolderData, LocalFilesStorageData };
