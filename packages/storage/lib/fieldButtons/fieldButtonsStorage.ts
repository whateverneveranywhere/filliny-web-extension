import { createStorage } from '../base/base.js';
import { StorageEnum } from '../base/enums.js';
import { z } from 'zod';
import type { BaseStorageType } from '../base/types.js';

// ============================================================================
// Zod Schemas
// ============================================================================

/**
 * Field button settings schema
 */
const FieldButtonSettingsSchema = z.object({
  enabled: z.boolean(), // Whether field buttons are enabled
  preferTestMode: z.boolean(), // Whether to use test mode by default
});

// ============================================================================
// Type Exports (inferred from schemas)
// ============================================================================

type FieldButtonSettings = z.infer<typeof FieldButtonSettingsSchema>;

// Default settings
const defaultSettings: FieldButtonSettings = {
  enabled: true,
  preferTestMode: false,
};

// Storage type with additional helper methods
type FieldButtonsStorage = BaseStorageType<FieldButtonSettings> & {
  toggleEnabled: () => Promise<boolean>;
  setEnabled: (enabled: boolean) => Promise<void>;
  togglePreferTestMode: () => Promise<boolean>;
  setPreferTestMode: (preferTestMode: boolean) => Promise<void>;
  resetSettings: () => Promise<void>;
};

// Create the base storage
const storage = createStorage<FieldButtonSettings>('field-buttons-settings', defaultSettings, {
  storageEnum: StorageEnum.Local,
  liveUpdate: true,
});

// Export the storage with helper methods
const fieldButtonsStorage: FieldButtonsStorage = {
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

export { FieldButtonSettingsSchema, fieldButtonsStorage };
export type { FieldButtonSettings };
