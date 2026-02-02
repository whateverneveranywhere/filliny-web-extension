/**
 * Profile types for storage
 *
 * These types are Zod-inferred to ensure type safety and validation.
 * Due to package dependency constraints (storage can't import from shared),
 * we define local Zod schemas that match the API contract.
 */
import { z } from 'zod';

// ============================================================================
// Zod Schemas
// ============================================================================

/**
 * Filling profile list item schema (used by list endpoint)
 *
 * NOTE: The list endpoint uses 'name' while the detail/CRUD endpoints use 'profileName'.
 * This is intentional - list endpoints return lightweight objects with different field names
 * than detail endpoints.
 */
export const DTOFillingProfileItemSchema = z.object({
  id: z.number(),
  isActive: z.boolean(),
  name: z.string(),
});

/**
 * Suggested website schema
 */
export const DTOSuggestedWebsiteSchema = z.object({
  label: z.string(),
  value: z.string(),
  id: z.number(),
});

/**
 * Tone option schema
 */
export const DTOToneSchema = z.object({
  label: z.string(),
  value: z.string(),
  id: z.number(),
});

/**
 * Point of view option schema
 */
export const DTOPovSchema = z.object({
  label: z.string(),
  value: z.string(),
  id: z.number(),
});

/**
 * Filling website schema
 */
export const DTOFillingWebsiteSchema = z.object({
  id: z.number().optional(), // Optional because it may not exist on creation
  websiteUrl: z.string(),
  isRootLoad: z.boolean(),
  fillingContext: z.string(),
});

/**
 * Filling preferences schema
 */
export const DTOFillingPreferencesSchema = z.object({
  isFormal: z.boolean(),
  isGapFillingAllowed: z.boolean(),
  toneId: z.number(),
  povId: z.number(),
});

/**
 * Profile filling form schema (used by detail/create/edit endpoints)
 *
 * NOTE: Uses 'profileName' while DTOFillingProfileItem uses 'name'.
 * This is intentional - the list endpoint returns lightweight objects with 'name',
 * while detail/CRUD endpoints use the full schema with 'profileName'.
 */
export const DTOProfileFillingFormSchema = z.object({
  id: z.union([z.string(), z.number()]).optional(),
  profileName: z.string(),
  defaultFillingContext: z.string(),
  preferences: DTOFillingPreferencesSchema,
  fillingWebsites: z.array(DTOFillingWebsiteSchema),
});

// ============================================================================
// Type Exports (inferred from schemas)
// ============================================================================

export type DTOFillingProfileItem = z.infer<typeof DTOFillingProfileItemSchema>;
export type DTOSuggestedWebsite = z.infer<typeof DTOSuggestedWebsiteSchema>;
export type DTOTone = z.infer<typeof DTOToneSchema>;
export type DTOPov = z.infer<typeof DTOPovSchema>;
export type DTOFillingWebsite = z.infer<typeof DTOFillingWebsiteSchema>;
export type DTOFillingPreferences = z.infer<typeof DTOFillingPreferencesSchema>;
export type DTOProfileFillingForm = z.infer<typeof DTOProfileFillingFormSchema>;

/** @deprecated Use DTOFillingPreferences instead */
export type DTOFillingPrefrences = DTOFillingPreferences;
