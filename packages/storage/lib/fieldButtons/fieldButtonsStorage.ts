import { StorageEnum } from "../base/enums.js";
import { createStorage } from "../base/base.js";
import type { BaseStorage } from "../base/types.js";

// Interface for field button settings
export interface FieldButtonSettings {
  enabled: boolean; // Whether field buttons are enabled
  preferTestMode: boolean; // Whether to use test mode by default
}

// Default settings
const defaultSettings: FieldButtonSettings = {
  enabled: true,
  preferTestMode: false,
};

// Storage type with additional helper methods
type FieldButtonsStorage = BaseStorage<FieldButtonSettings> & {
  toggleEnabled: () => Promise<boolean>;
  setEnabled: (enabled: boolean) => Promise<void>;
  togglePreferTestMode: () => Promise<boolean>;
  setPreferTestMode: (preferTestMode: boolean) => Promise<void>;
  resetSettings: () => Promise<void>;
};

// Create the base storage
const storage = createStorage<FieldButtonSettings>("field-buttons-settings", defaultSettings, {
  storageEnum: StorageEnum.Local,
  liveUpdate: true,
});

// Export the storage with helper methods
export const fieldButtonsStorage: FieldButtonsStorage = {
  ...storage,

  // Toggle enabled state and return new value
  toggleEnabled: async (): Promise<boolean> => {
    const settings = await storage.get();
    const newEnabled = !settings.enabled;
    await storage.set({ ...settings, enabled: newEnabled });
    return newEnabled;
  },

  // Set enabled state
  setEnabled: async (enabled: boolean): Promise<void> => {
    const settings = await storage.get();
    await storage.set({ ...settings, enabled });
  },

  // Toggle test mode preference and return new value
  togglePreferTestMode: async (): Promise<boolean> => {
    const settings = await storage.get();
    const newPreferTestMode = !settings.preferTestMode;
    await storage.set({ ...settings, preferTestMode: newPreferTestMode });
    return newPreferTestMode;
  },

  // Set test mode preference
  setPreferTestMode: async (preferTestMode: boolean): Promise<void> => {
    const settings = await storage.get();
    await storage.set({ ...settings, preferTestMode });
  },

  // Reset to default settings
  resetSettings: async (): Promise<void> => {
    await storage.set(defaultSettings);
  },
};
