/**
 * Zod schemas for API response validation
 * These schemas provide runtime validation and type inference for API responses
 *
 * IMPORTANT: All types in the codebase should be inferred from these schemas using z.infer<>
 * Do NOT define types manually - always use schema inference for type safety
 */
import { Framework } from '../../utils/frameworkDetection.js';
import { isValid, parseISO } from 'date-fns';
import { z } from 'zod';

// ============================================================================
// URL Validation Schema
// ============================================================================

/**
 * URL validation schema with support for relative URLs
 * Validates that a string is a valid URL (absolute or relative)
 */
const UrlSchema = z.string().refine(
  url => {
    if (!url) return false;

    // Handle relative URLs by prepending a dummy origin
    const urlToTest = url.startsWith('/') ? `https://example.com${url}` : url;

    try {
      new URL(urlToTest);
      return true;
    } catch {
      try {
        // Try adding https:// if no protocol is specified
        new URL(`https://${url}`);
        return true;
      } catch {
        return false;
      }
    }
  },
  { message: 'Invalid URL format' },
);

/**
 * Validates a URL string and returns whether it's valid
 * Use this instead of manual URL validation functions
 */
const isValidUrl = (url: string): boolean => UrlSchema.safeParse(url).success;

// ============================================================================
// Auth Schemas
// ============================================================================

/**
 * Plan schema for subscription information
 * NOTE: This schema is kept for backwards compatibility but may be deprecated
 * as the new pricing model uses LimitationsSchema directly
 */
const PlanSchema = z.object({
  id: z.number(),
  planName: z.string(),
  maxFillingProfiles: z.number(),
  maxWebsitesPerProfile: z.number(),
  extraFeatures: z.string(),
  isOnSale: z.boolean(),
  afterSalePrice: z.string().nullable(),
  currentPrice: z.string(),
  stripePaymentLink: z.string(),
});

/**
 * User schema for authenticated user information
 * Updated to match the API's AuthHealthUserSchema
 */
const UserSchema = z.object({
  id: z.string(),
  email: z.string(),
  name: z.string().nullable(),
  image: z.string().nullable(),
  phone: z.string().nullable(),
  emailVerified: z.string().nullable(),
  stripeCustomerId: z.string().nullable().optional(),
  createdAt: z.string().optional(),
  updatedAt: z.string().optional(),
});

/**
 * Limitations schema for user plan limitations
 * Updated to match the new pricing model from API
 *
 * Pricing Model:
 * - Free tier: 5 free form fills, 1 profile, 3 websites per profile
 * - Pro tier: $29/month, 50M tokens, 100 profiles, 500 websites per profile
 */
const LimitationsSchema = z.object({
  maxFillingProfiles: z.number(),
  maxWebsitesPerProfile: z.number(),
  tokensRemaining: z.number(),
  freeFormsRemaining: z.number().optional(), // Only for free tier users
  isProSubscriber: z.boolean().optional(), // True if user has Pro subscription
});

/**
 * Auth health check response schema
 * Matches the API's AuthHealthDataSchema
 */
const AuthHealthCheckSchema = z.object({
  status: z.literal('success'),
  user: UserSchema,
  limitations: LimitationsSchema,
});

// ============================================================================
// Dashboard Schemas
// ============================================================================

/**
 * Dashboard overview response schema
 *
 * For free users: remainingTokens = 0, freeFormsRemaining >= 0
 * For Pro users: remainingTokens > 0, freeFormsRemaining = undefined
 */
const DTOOverviewSchema = z.object({
  aiHistoryCount: z.number(),
  fillingProfilesCount: z.number(),
  fillingWebsitesCount: z.number(),
  remainingTokens: z.number(),
  freeFormsRemaining: z.number().optional(), // Only for free tier users
  isProSubscriber: z.boolean().optional(), // True if user has Pro subscription
});

// ============================================================================
// Profile Schemas
// ============================================================================

/**
 * Filling profile list item schema (used by list endpoint)
 *
 * NOTE: The list endpoint uses 'name' while the detail/CRUD endpoints use 'profileName'.
 * This is intentional - list endpoints return lightweight objects with different field names
 * than detail endpoints. The DTOProfileFillingFormSchema uses 'profileName' to match the
 * detail/create/edit API contracts.
 */
const DTOFillingProfileItemSchema = z.object({
  id: z.number(),
  isActive: z.boolean(),
  name: z.string(),
});

/**
 * Suggested website schema
 */
const DTOSuggestedWebsiteSchema = z.object({
  label: z.string(),
  value: z.string(),
  id: z.number(),
});

/**
 * Tone option schema
 */
const DTOToneSchema = z.object({
  label: z.string(),
  value: z.string(),
  id: z.number(),
});

/**
 * Point of view option schema
 */
const DTOPovSchema = z.object({
  label: z.string(),
  value: z.string(),
  id: z.number(),
});

/**
 * Filling website schema
 */
const DTOFillingWebsiteSchema = z.object({
  id: z.number().optional(), // Optional because it may not exist on creation
  websiteUrl: z.string(),
  isRootLoad: z.boolean(),
  fillingContext: z.string(),
});

/**
 * Filling preferences schema
 */
const DTOFillingPreferencesSchema = z.object({
  isFormal: z.boolean(),
  isGapFillingAllowed: z.boolean(),
  toneId: z.number().positive(),
  povId: z.number().positive(),
});

/**
 * Profile filling form schema (used by detail/create/edit endpoints)
 *
 * NOTE: Uses 'profileName' while DTOFillingProfileItemSchema uses 'name'.
 * This is intentional - the list endpoint returns lightweight objects with 'name',
 * while detail/CRUD endpoints use the full schema with 'profileName'.
 */
const DTOProfileFillingFormSchema = z.object({
  id: z.union([z.string(), z.number()]).optional(),
  profileName: z.string(),
  defaultFillingContext: z.string(),
  preferences: DTOFillingPreferencesSchema,
  fillingWebsites: z.array(DTOFillingWebsiteSchema),
});

// ============================================================================
// Field Type Schemas (for form detection and AI filling)
// ============================================================================

/**
 * Input field type enum schema
 * Includes all form field types matching the API's INPUT_FIELD_TYPES constant
 */
const InputFieldTypeSchema = z.enum([
  'text',
  'password',
  'email',
  'number',
  'tel',
  'url',
  'search',
  'color',
  'date',
  'datetime-local',
  'month',
  'week',
  'time',
  'range',
  'checkbox',
  'radio',
  'select',
  'textarea',
  'button',
  'file',
  'fieldset',
]);

/**
 * Field type schema (includes all form field types)
 */
const FieldTypeSchema = z.enum([
  'text',
  'password',
  'email',
  'number',
  'tel',
  'url',
  'search',
  'color',
  'date',
  'datetime-local',
  'month',
  'week',
  'time',
  'range',
  'select',
  'checkbox',
  'radio',
  'textarea',
  'button',
  'file',
  'fieldset',
]);

/**
 * Accept type category schema for file uploads
 */
const AcceptTypeCategorySchema = z.enum(['image', 'document', 'video', 'audio', 'archive', 'text', 'other']);

/**
 * Accept type schema for file input validation
 */
const AcceptTypeSchema = z.object({
  type: z.enum(['mime', 'extension']),
  value: z.string(),
  category: AcceptTypeCategorySchema,
});

/**
 * Custom schema for HTMLInputElement
 * Uses z.custom() with proper type guard instead of z.any()
 */
const HTMLInputElementSchema = z.custom<HTMLInputElement>(
  val => typeof window !== 'undefined' && val instanceof HTMLInputElement,
  { message: 'Expected HTMLInputElement' },
);

/**
 * Custom schema for HTMLElement
 * Uses z.custom() with proper type guard instead of z.any()
 */
const HTMLElementSchema = z.custom<HTMLElement>(val => typeof window !== 'undefined' && val instanceof HTMLElement, {
  message: 'Expected HTMLElement',
});

/**
 * File upload data schema
 * Uses custom schemas for DOM elements with proper type guards
 */
const FileUploadDataSchema = z.object({
  acceptedTypes: z.array(AcceptTypeSchema).optional(),
  fileInput: HTMLInputElementSchema.optional(),
  isCustomUpload: z.boolean().optional(),
  triggerElement: HTMLElementSchema.optional(),
  maxFileSize: z.number().nullable().optional(),
  allowedExtensions: z.array(z.string()).optional(),
});

/**
 * Framework type schema for detected frameworks
 * Uses z.nativeEnum to work with the existing Framework enum from enums.ts
 */
const FrameworkTypeSchema = z.nativeEnum(Framework);

/**
 * Field option schema for select/radio/checkbox options
 */
const FieldOptionSchema = z.object({
  value: z.string(),
  text: z.string(),
  selected: z.boolean(),
});

/**
 * Field visibility schema
 */
const FieldVisibilitySchema = z.object({
  isVisible: z.boolean(),
  hiddenReason: z.string().optional(),
});

/**
 * Field metadata schema
 * Includes file upload data for file input fields
 */
const FieldMetadataSchema = z.object({
  fileUploadData: FileUploadDataSchema.optional(),
  framework: FrameworkTypeSchema,
  frameworkProps: z.record(z.string(), z.function().optional()).optional(),
  visibility: FieldVisibilitySchema,
  select2Container: z.string().optional(),
  actualSelect: z.string().optional(),
  checkboxValue: z.string().optional(),
  isExclusive: z.boolean().optional(),
  isMultiple: z.boolean().optional(),
  groupName: z.string().optional(),
});

/**
 * Field validation schema
 */
const FieldValidationSchema = z.object({
  pattern: z.string().optional(),
  minLength: z.number().optional(),
  maxLength: z.number().optional(),
  min: z.number().optional(),
  max: z.number().optional(),
  step: z.number().optional(),
});

/**
 * Field schema for form field detection
 */
const FieldSchema = z.object({
  id: z.string(),
  name: z.string().optional(),
  type: FieldTypeSchema,
  placeholder: z.string().optional(),
  title: z.string().optional(),
  label: z.string().optional(),
  description: z.string().optional(),
  value: z.union([z.string(), z.array(z.string())]).optional(),
  testValue: z.union([z.string(), z.array(z.string())]).optional(),
  options: z.array(FieldOptionSchema).optional(),
  required: z.boolean().optional(),
  validation: FieldValidationSchema.optional(),
  metadata: FieldMetadataSchema.optional(),
  xpath: z.string().optional(),
  uniqueSelectors: z.array(z.string()).optional(),
});

/**
 * DTO Fill Payload schema for AI form filling requests
 *
 * Note on preferences field:
 * - preferences is optional because the API server has default preferences
 * - When a user profile is loaded, preferences will always be provided
 *   (see handleFormClick.ts and handleFieldFill.ts for usage patterns)
 * - If no profile is available (edge case), the server will use sensible defaults
 * - The profileStorage can return undefined, making defaultProfile?.preferences also undefined
 */
const DTOFillPayloadSchema = z.object({
  contextText: z.string(),
  formData: z.array(FieldSchema),
  websiteUrl: z.string(),
  preferences: DTOFillingPreferencesSchema.optional(),
});

// ============================================================================
// API Response Schemas
// ============================================================================

/**
 * Success response schema
 */
const SuccessResponseSchema = z.object({
  success: z.boolean(),
  message: z.string().optional(),
});

/**
 * Edit profile response schema
 */
const EditProfileResponseSchema = SuccessResponseSchema.extend({
  profile: DTOProfileFillingFormSchema.optional(),
});

/**
 * Change active profile response schema
 */
const ChangeActiveProfileResponseSchema = SuccessResponseSchema;

/**
 * Delete profile response schema
 */
const DeleteProfileResponseSchema = SuccessResponseSchema;

// ============================================================================
// Overlay Position Schema (for UI components)
// ============================================================================

/**
 * Overlay position schema for form overlays
 */
const OverlayPositionSchema = z.object({
  top: z.number(),
  left: z.number(),
  width: z.number(),
  height: z.number(),
});

/**
 * Highlight forms options schema
 */
const HighlightFormsOptionsSchema = z.object({
  visionOnly: z.boolean().optional(),
  testMode: z.boolean().optional(),
});

// ============================================================================
// Validation Helpers
// ============================================================================

/**
 * Safely parse data with a schema, returning either the parsed data or null
 */
const safeParse = <T extends z.ZodType>(schema: T, data: unknown): z.infer<T> | null => {
  const result = schema.safeParse(data);
  if (result.success) {
    return result.data;
  }
  console.warn('Schema validation failed:', result.error.errors);
  return null;
};

/**
 * Parse data with a schema, throwing if validation fails
 */
const parseOrThrow = <T extends z.ZodType>(schema: T, data: unknown): z.infer<T> => schema.parse(data);

/**
 * Type guard using Zod schema validation
 * Returns true if data matches the schema
 */
const isValidSchema = <T extends z.ZodType>(schema: T, data: unknown): data is z.infer<T> =>
  schema.safeParse(data).success;

/**
 * Validate data against a schema and return detailed errors if invalid
 */
const validateWithErrors = <T extends z.ZodType>(
  schema: T,
  data: unknown,
): { success: true; data: z.infer<T> } | { success: false; errors: z.ZodError['errors'] } => {
  const result = schema.safeParse(data);
  if (result.success) {
    return { success: true, data: result.data };
  }
  return { success: false, errors: result.error.errors };
};

// ============================================================================
// Date Validation Helpers
// ============================================================================

/**
 * Safely parse an ISO date string and validate it
 * Returns the Date object if valid, or null if invalid
 */
const parseDate = (dateString: string): Date | null => {
  const date = parseISO(dateString);
  return isValid(date) ? date : null;
};

/**
 * Zod schema for validating ISO date strings
 */
const isoDateStringSchema = z.string().refine(
  val => {
    const date = parseISO(val);
    return isValid(date);
  },
  { message: 'Invalid date format' },
);

// ============================================================================
// Form Schemas (centralized from UI components)
// ============================================================================

/**
 * Website item schema for form arrays
 */
const FillingWebsiteFormItemSchema = z.object({
  websiteUrl: z.string().url().min(1, { message: 'Website URL is required' }),
  isRootLoad: z.boolean().default(false),
  fillingContext: z.string().default(''),
  isNew: z.boolean().optional(),
});

/**
 * Profile form schema for creating/editing filling profiles
 */
const ProfileFormSchema = z.object({
  profileName: z.string().min(1, { message: 'Profile name is required' }),
  defaultFillingContext: z.string().min(1, { message: 'Default context is required' }),
  preferences: z.object({
    isFormal: z.boolean().default(true),
    isGapFillingAllowed: z.boolean().default(false),
    toneId: z.string().min(1, { message: "Can't be empty" }),
    povId: z.string().min(1, { message: "Can't be empty" }),
  }),
  fillingWebsites: z.array(FillingWebsiteFormItemSchema).default([]),
});

/**
 * Website edit schema for editing a single website
 */
const WebsiteEditSchema = z.object({
  fillingWebsites: z.array(
    z.object({
      websiteUrl: z.string().url().min(1, { message: 'Website URL is required' }),
      isRootLoad: z.boolean().default(false),
      fillingContext: z.string().default(''),
    }),
  ),
});

/**
 * Profile selector schema
 */
const ProfileSelectorSchema = z.object({
  defaultActiveProfileId: z.string(),
});

// ============================================================================
// User Status Schema (derived from Limitations for UI convenience)
// ============================================================================

/**
 * UserStatus schema - combines limitations data with computed properties
 * Used by UI components to determine what features are available
 *
 * Pricing Model:
 * - Free tier: 5 free form fills, 1 profile, 3 websites per profile
 * - Pro tier: $29/month, 50M tokens, 100 profiles, 500 websites per profile
 *
 * isPro is computed based on: isProSubscriber flag OR tokensRemaining > 0
 */
const UserStatusSchema = z.object({
  tokensRemaining: z.number(),
  freeFormsRemaining: z.number().optional(), // Only for free tier users
  maxProfiles: z.number(),
  maxWebsitesPerProfile: z.number(),
  isPro: z.boolean(),
});

/**
 * Helper to compute isPro status from limitations
 * A user is considered Pro if they have the isProSubscriber flag OR tokens remaining
 */
const computeIsPro = (limitations: {
  tokensRemaining: number;
  isProSubscriber?: boolean;
  maxFillingProfiles: number;
}): boolean =>
  // User is Pro if they have explicit subscription flag, tokens, or subscription-level limits
  limitations.isProSubscriber === true || limitations.tokensRemaining > 0 || limitations.maxFillingProfiles > 1;
/**
 * Transform AuthHealthCheckResponse limitations into UserStatus
 */
const toUserStatus = (limitations: Limitations): UserStatus => ({
  tokensRemaining: limitations.tokensRemaining,
  freeFormsRemaining: limitations.freeFormsRemaining,
  maxProfiles: limitations.maxFillingProfiles,
  maxWebsitesPerProfile: limitations.maxWebsitesPerProfile,
  isPro: computeIsPro(limitations),
});

// ============================================================================
// Type Exports (inferred from schemas)
// ============================================================================

// Auth types
type Plan = z.infer<typeof PlanSchema>;
type User = z.infer<typeof UserSchema>;
type Limitations = z.infer<typeof LimitationsSchema>;
type AuthHealthCheckResponse = z.infer<typeof AuthHealthCheckSchema>;
type UserStatus = z.infer<typeof UserStatusSchema>;

// Dashboard types
type DTOOverviewResponse = z.infer<typeof DTOOverviewSchema>;

// Profile types (with Response suffix for API responses, without for storage)
type DTOFillingProfileItem = z.infer<typeof DTOFillingProfileItemSchema>;
type DTOFillingProfileItemResponse = z.infer<typeof DTOFillingProfileItemSchema>;
type DTOSuggestedWebsite = z.infer<typeof DTOSuggestedWebsiteSchema>;
type DTOSuggestedWebsiteResponse = z.infer<typeof DTOSuggestedWebsiteSchema>;
type DTOTone = z.infer<typeof DTOToneSchema>;
type DTOToneResponse = z.infer<typeof DTOToneSchema>;
type DTOPov = z.infer<typeof DTOPovSchema>;
type DTOPovResponse = z.infer<typeof DTOPovSchema>;
type DTOFillingWebsite = z.infer<typeof DTOFillingWebsiteSchema>;
type DTOFillingWebsiteResponse = z.infer<typeof DTOFillingWebsiteSchema>;
type DTOFillingPreferences = z.infer<typeof DTOFillingPreferencesSchema>;
type DTOFillingPreferencesResponse = z.infer<typeof DTOFillingPreferencesSchema>;
type DTOProfileFillingForm = z.infer<typeof DTOProfileFillingFormSchema>;
type DTOProfileFillingFormResponse = z.infer<typeof DTOProfileFillingFormSchema>;

// Field types
type InputFieldType = z.infer<typeof InputFieldTypeSchema>;
type FieldType = z.infer<typeof FieldTypeSchema>;
type AcceptTypeCategory = z.infer<typeof AcceptTypeCategorySchema>;
type AcceptType = z.infer<typeof AcceptTypeSchema>;
type FileUploadData = z.infer<typeof FileUploadDataSchema>;
type FrameworkType = z.infer<typeof FrameworkTypeSchema>;
type FieldOption = z.infer<typeof FieldOptionSchema>;
type FieldVisibility = z.infer<typeof FieldVisibilitySchema>;
type FieldMetadata = z.infer<typeof FieldMetadataSchema>;
type FieldValidation = z.infer<typeof FieldValidationSchema>;
type Field = z.infer<typeof FieldSchema>;
type DTOFillPayload = z.infer<typeof DTOFillPayloadSchema>;

// API Response types
type SuccessResponse = z.infer<typeof SuccessResponseSchema>;
type EditProfileResponse = z.infer<typeof EditProfileResponseSchema>;
type ChangeActiveProfileResponse = z.infer<typeof ChangeActiveProfileResponseSchema>;
type DeleteProfileResponse = z.infer<typeof DeleteProfileResponseSchema>;

// UI types
type OverlayPosition = z.infer<typeof OverlayPositionSchema>;
type HighlightFormsOptions = z.infer<typeof HighlightFormsOptionsSchema>;

// Form schema type exports
type ProfileFormValues = z.infer<typeof ProfileFormSchema>;
type WebsiteEditFormValues = z.infer<typeof WebsiteEditSchema>;
type ProfileSelectorFormValues = z.infer<typeof ProfileSelectorSchema>;
type FillingWebsiteFormItem = z.infer<typeof FillingWebsiteFormItemSchema>;

// ============================================================================
// All exports at end of file to comply with import-x/exports-last
// ============================================================================

// URL Validation
export { UrlSchema, isValidUrl };

// Auth Schemas
export { PlanSchema, UserSchema, LimitationsSchema, AuthHealthCheckSchema, UserStatusSchema };

// User Status Helpers
export { computeIsPro, toUserStatus };

// Dashboard Schemas
export { DTOOverviewSchema };

// Profile Schemas
export {
  DTOFillingProfileItemSchema,
  DTOSuggestedWebsiteSchema,
  DTOToneSchema,
  DTOPovSchema,
  DTOFillingWebsiteSchema,
  DTOFillingPreferencesSchema,
  DTOProfileFillingFormSchema,
};

// Field Type Schemas
export {
  InputFieldTypeSchema,
  FieldTypeSchema,
  AcceptTypeCategorySchema,
  AcceptTypeSchema,
  FileUploadDataSchema,
  FrameworkTypeSchema,
  FieldOptionSchema,
  FieldVisibilitySchema,
  FieldMetadataSchema,
  FieldValidationSchema,
  FieldSchema,
  DTOFillPayloadSchema,
};

// API Response Schemas
export {
  SuccessResponseSchema,
  EditProfileResponseSchema,
  ChangeActiveProfileResponseSchema,
  DeleteProfileResponseSchema,
};

// Overlay Schemas
export { OverlayPositionSchema, HighlightFormsOptionsSchema };

// Validation Helpers
export { safeParse, parseOrThrow, isValidSchema, validateWithErrors };

// Date Validation Helpers
export { parseDate, isoDateStringSchema };

// Form Schemas
export { FillingWebsiteFormItemSchema, ProfileFormSchema, WebsiteEditSchema, ProfileSelectorSchema };

// Type Exports
export type {
  Plan,
  User,
  Limitations,
  AuthHealthCheckResponse,
  UserStatus,
  DTOOverviewResponse,
  DTOFillingProfileItem,
  DTOFillingProfileItemResponse,
  DTOSuggestedWebsite,
  DTOSuggestedWebsiteResponse,
  DTOTone,
  DTOToneResponse,
  DTOPov,
  DTOPovResponse,
  DTOFillingWebsite,
  DTOFillingWebsiteResponse,
  DTOFillingPreferences,
  DTOFillingPreferencesResponse,
  DTOProfileFillingForm,
  DTOProfileFillingFormResponse,
  InputFieldType,
  FieldType,
  AcceptTypeCategory,
  AcceptType,
  FileUploadData,
  FrameworkType,
  FieldOption,
  FieldVisibility,
  FieldMetadata,
  FieldValidation,
  Field,
  DTOFillPayload,
  SuccessResponse,
  EditProfileResponse,
  ChangeActiveProfileResponse,
  DeleteProfileResponse,
  OverlayPosition,
  HighlightFormsOptions,
  ProfileFormValues,
  WebsiteEditFormValues,
  ProfileSelectorFormValues,
  FillingWebsiteFormItem,
};
