import { createStorage } from '../base/base.js';
import { StorageEnum } from '../base/enums.js';
import { DTOProfileFillingFormSchema } from '../types/profile.js';
import { z } from 'zod';
import type { BaseStorageType } from '../base/types.js';

// ============================================================================
// Constants
// ============================================================================

/** Draft expiration time in milliseconds (24 hours) */
const DRAFT_EXPIRATION_MS = 24 * 60 * 60 * 1000;

// ============================================================================
// Zod Schemas
// ============================================================================

/**
 * Profile draft schema for storing unsaved form data
 *
 * Stores form data, timestamp for expiration, and editing context.
 */
const ProfileDraftSchema = z.object({
  /** Form data matching the profile form values */
  formData: DTOProfileFillingFormSchema,
  /** Unix timestamp (ms) of last update - used for expiration check */
  lastUpdated: z.number(),
  /** Whether the user is editing an existing profile vs creating new */
  isEditing: z.boolean(),
  /** ID of the profile being edited (only present when isEditing is true) */
  editingProfileId: z.string().optional(),
});

// ============================================================================
// Type Exports (inferred from schemas)
// ============================================================================

type ProfileDraft = z.infer<typeof ProfileDraftSchema>;

// ============================================================================
// Storage Type Definition
// ============================================================================

type ProfileDraftStorage = BaseStorageType<ProfileDraft | null> & {
  /** Save draft form data with automatic timestamp */
  saveDraft: (formData: ProfileDraft['formData'], isEditing: boolean, editingProfileId?: string) => Promise<void>;
  /** Load draft if exists and not expired, returns null otherwise */
  loadDraft: () => Promise<ProfileDraft | null>;
  /** Clear the draft storage (call after successful save) */
  clearDraft: () => Promise<void>;
  /** Check if a valid (non-expired) draft exists */
  hasDraft: () => Promise<boolean>;
  /** Check if draft is for a specific profile */
  isDraftForProfile: (profileId: string) => Promise<boolean>;
};

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Check if a draft has expired based on lastUpdated timestamp
 */
const isDraftExpired = (draft: ProfileDraft): boolean => {
  const now = Date.now();
  const elapsed = now - draft.lastUpdated;
  return elapsed > DRAFT_EXPIRATION_MS;
};

// ============================================================================
// Storage Implementation
// ============================================================================

const storage = createStorage<ProfileDraft | null>('profile-draft', null, {
  storageEnum: StorageEnum.Local,
  liveUpdate: true,
});

/**
 * Profile draft storage for auto-saving form data
 *
 * Features:
 * - Auto-save form data during editing
 * - 24-hour expiration for drafts
 * - Tracks whether editing existing profile or creating new
 * - Clean up after successful save
 *
 * @example
 * ```ts
 * // Save draft (debounced in component)
 * await profileDraftStorage.saveDraft(formData, true, 'profile-123');
 *
 * // Load draft on mount
 * const draft = await profileDraftStorage.loadDraft();
 * if (draft) {
 *   form.reset(draft.formData);
 * }
 *
 * // Clear after successful save
 * await profileDraftStorage.clearDraft();
 * ```
 */
const profileDraftStorage: ProfileDraftStorage = {
  ...storage,

  saveDraft: async (
    formData: ProfileDraft['formData'],
    isEditing: boolean,
    editingProfileId?: string,
  ): Promise<void> => {
    const draft: ProfileDraft = {
      formData,
      lastUpdated: Date.now(),
      isEditing,
      editingProfileId,
    };

    // Validate before saving
    const result = ProfileDraftSchema.safeParse(draft);
    if (!result.success) {
      console.error('[Profile Draft Storage] Invalid draft data:', result.error.format());
      return;
    }

    await storage.set(result.data);
  },

  loadDraft: async (): Promise<ProfileDraft | null> => {
    const draft = await storage.get();

    // No draft exists
    if (!draft) {
      return null;
    }

    // Validate the stored draft
    const result = ProfileDraftSchema.safeParse(draft);
    if (!result.success) {
      console.warn('[Profile Draft Storage] Invalid draft in storage, clearing:', result.error.format());
      await storage.set(null);
      return null;
    }

    // Check expiration
    if (isDraftExpired(result.data)) {
      console.log('[Profile Draft Storage] Draft expired, clearing');
      await storage.set(null);
      return null;
    }

    return result.data;
  },

  clearDraft: async (): Promise<void> => {
    await storage.set(null);
  },

  hasDraft: async (): Promise<boolean> => {
    const draft = await profileDraftStorage.loadDraft();
    return draft !== null;
  },

  isDraftForProfile: async (profileId: string): Promise<boolean> => {
    const draft = await profileDraftStorage.loadDraft();
    if (!draft) {
      return false;
    }
    return draft.isEditing && draft.editingProfileId === profileId;
  },
};

// ============================================================================
// Exports (at end of file per ESLint import-x/exports-last rule)
// ============================================================================

export { ProfileDraftSchema, profileDraftStorage };
export type { ProfileDraft };
