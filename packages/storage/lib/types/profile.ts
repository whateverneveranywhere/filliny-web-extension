/**
 * Profile types for storage
 *
 * NOTE: These types mirror the Zod schemas in @extension/shared/lib/services/schemas
 * If you update these types, ensure the schemas are also updated for consistency.
 * The types here exist due to package dependency constraints (storage can't import from shared).
 */

/**
 * Filling profile list item (used by list endpoint)
 *
 * NOTE: The list endpoint uses 'name' while the detail/CRUD endpoints use 'profileName'.
 * This is intentional - list endpoints return lightweight objects with different field names
 * than detail endpoints.
 */
export interface DTOFillingProfileItem {
  id: number;
  isActive: boolean;
  name: string;
}

export interface DTOSuggestedWebsite {
  label: string;
  value: string;
  id: number;
}

export interface DTOTone {
  label: string;
  value: string;
  id: number;
}

export interface DTOPov {
  label: string;
  value: string;
  id: number;
}

export interface DTOFillingWebsite {
  id?: number; // Optional because it may not exist on creation
  websiteUrl: string;
  isRootLoad: boolean;
  fillingContext: string;
}

export interface DTOFillingPreferences {
  isFormal: boolean;
  isGapFillingAllowed: boolean;
  toneId: number;
  povId: number;
}

/** @deprecated Use DTOFillingPreferences instead */
export type DTOFillingPrefrences = DTOFillingPreferences;

/**
 * Profile filling form (used by detail/create/edit endpoints)
 *
 * NOTE: Uses 'profileName' while DTOFillingProfileItem uses 'name'.
 * This is intentional - the list endpoint returns lightweight objects with 'name',
 * while detail/CRUD endpoints use the full schema with 'profileName'.
 */
export interface DTOProfileFillingForm {
  id?: string | number;
  profileName: string;
  defaultFillingContext: string;
  preferences: DTOFillingPreferences;
  fillingWebsites: DTOFillingWebsite[];
}
