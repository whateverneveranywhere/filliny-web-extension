/**
 * Zod schemas for API response validation
 * These schemas provide runtime validation and type inference for API responses
 *
 * IMPORTANT: All types in the codebase should be inferred from these schemas using z.infer<>
 * Do NOT define types manually - always use schema inference for type safety
 */
import { Framework } from '../../types/enums.js';
import { isValid, parseISO } from 'date-fns';
import { z } from 'zod';

// ============================================================================
// URL Validation Schema
// ============================================================================

/**
 * URL validation schema with support for relative URLs
 * Validates that a string is a valid URL (absolute or relative)
 */
export const UrlSchema = z.string().refine(
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
export const isValidUrl = (url: string): boolean => UrlSchema.safeParse(url).success;

// ============================================================================
// Auth Schemas
// ============================================================================

/**
 * Plan schema for subscription information
 */
export const PlanSchema = z.object({
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
 */
export const UserSchema = z.object({
  id: z.string(),
  name: z.string(),
  email: z.string(),
  emailVerified: z.null(),
  image: z.string(),
  formFillingsCredit: z.number(),
  phone: z.string(),
});

/**
 * Limitations schema for user plan limitations
 */
export const LimitationsSchema = z.object({
  plan: PlanSchema.nullable().optional(),
  maxFillingProfiles: z.number(),
  maxWebsitesPerProfile: z.number(),
});

/**
 * Auth health check response schema
 */
export const AuthHealthCheckSchema = z.object({
  status: z.enum(['success', 'error']),
  user: UserSchema,
  limitations: LimitationsSchema,
});

// ============================================================================
// Dashboard Schemas
// ============================================================================

/**
 * Dashboard overview response schema
 */
export const DTOOverviewSchema = z.object({
  aiHistoryCount: z.number(),
  fillingProfilesCount: z.number(),
  fillingWebsitesCount: z.number(),
  remainingTokens: z.number(),
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
export const DTOProfileFillingFormSchema = z.object({
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
export const InputFieldTypeSchema = z.enum([
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
export const FieldTypeSchema = z.enum([
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
export const AcceptTypeCategorySchema = z.enum(['image', 'document', 'video', 'audio', 'archive', 'text', 'other']);

/**
 * Accept type schema for file input validation
 */
export const AcceptTypeSchema = z.object({
  type: z.enum(['mime', 'extension']),
  value: z.string(),
  category: AcceptTypeCategorySchema,
});

/**
 * File upload data schema
 * Note: fileInput, triggerElement fields are HTMLElements that can't be validated with Zod
 * They are typed as z.any() for runtime flexibility
 */
export const FileUploadDataSchema = z.object({
  acceptedTypes: z.array(AcceptTypeSchema).optional(),
  fileInput: z.any().optional(), // HTMLInputElement - can't be validated
  isCustomUpload: z.boolean().optional(),
  triggerElement: z.any().optional(), // HTMLElement - can't be validated
  maxFileSize: z.number().nullable().optional(),
  allowedExtensions: z.array(z.string()).optional(),
});

/**
 * Framework type schema for detected frameworks
 * Uses z.nativeEnum to work with the existing Framework enum from enums.ts
 */
export const FrameworkTypeSchema = z.nativeEnum(Framework);

/**
 * Field option schema for select/radio/checkbox options
 */
export const FieldOptionSchema = z.object({
  value: z.string(),
  text: z.string(),
  selected: z.boolean(),
});

/**
 * Field visibility schema
 */
export const FieldVisibilitySchema = z.object({
  isVisible: z.boolean(),
  hiddenReason: z.string().optional(),
});

/**
 * Field metadata schema
 * Includes file upload data for file input fields
 */
export const FieldMetadataSchema = z.object({
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
export const FieldValidationSchema = z.object({
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
export const FieldSchema = z.object({
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
export const DTOFillPayloadSchema = z.object({
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
export const SuccessResponseSchema = z.object({
  success: z.boolean(),
  message: z.string().optional(),
});

/**
 * Edit profile response schema
 */
export const EditProfileResponseSchema = SuccessResponseSchema.extend({
  profile: DTOProfileFillingFormSchema.optional(),
});

/**
 * Change active profile response schema
 */
export const ChangeActiveProfileResponseSchema = SuccessResponseSchema;

/**
 * Delete profile response schema
 */
export const DeleteProfileResponseSchema = SuccessResponseSchema;

// ============================================================================
// Overlay Position Schema (for UI components)
// ============================================================================

/**
 * Overlay position schema for form overlays
 */
export const OverlayPositionSchema = z.object({
  top: z.number(),
  left: z.number(),
  width: z.number(),
  height: z.number(),
});

/**
 * Highlight forms options schema
 */
export const HighlightFormsOptionsSchema = z.object({
  visionOnly: z.boolean().optional(),
  testMode: z.boolean().optional(),
});

// ============================================================================
// Type Exports (inferred from schemas)
// ============================================================================

// Auth types
export type Plan = z.infer<typeof PlanSchema>;
export type User = z.infer<typeof UserSchema>;
export type Limitations = z.infer<typeof LimitationsSchema>;
export type AuthHealthCheckResponse = z.infer<typeof AuthHealthCheckSchema>;

// Dashboard types
export type DTOOverviewResponse = z.infer<typeof DTOOverviewSchema>;

// Profile types (with Response suffix for API responses, without for storage)
export type DTOFillingProfileItem = z.infer<typeof DTOFillingProfileItemSchema>;
export type DTOFillingProfileItemResponse = z.infer<typeof DTOFillingProfileItemSchema>;
export type DTOSuggestedWebsite = z.infer<typeof DTOSuggestedWebsiteSchema>;
export type DTOSuggestedWebsiteResponse = z.infer<typeof DTOSuggestedWebsiteSchema>;
export type DTOTone = z.infer<typeof DTOToneSchema>;
export type DTOToneResponse = z.infer<typeof DTOToneSchema>;
export type DTOPov = z.infer<typeof DTOPovSchema>;
export type DTOPovResponse = z.infer<typeof DTOPovSchema>;
export type DTOFillingWebsite = z.infer<typeof DTOFillingWebsiteSchema>;
export type DTOFillingWebsiteResponse = z.infer<typeof DTOFillingWebsiteSchema>;
export type DTOFillingPreferences = z.infer<typeof DTOFillingPreferencesSchema>;
export type DTOFillingPreferencesResponse = z.infer<typeof DTOFillingPreferencesSchema>;
export type DTOProfileFillingForm = z.infer<typeof DTOProfileFillingFormSchema>;
export type DTOProfileFillingFormResponse = z.infer<typeof DTOProfileFillingFormSchema>;

// Field types
export type InputFieldType = z.infer<typeof InputFieldTypeSchema>;
export type FieldType = z.infer<typeof FieldTypeSchema>;
export type AcceptTypeCategory = z.infer<typeof AcceptTypeCategorySchema>;
export type AcceptType = z.infer<typeof AcceptTypeSchema>;
export type FileUploadData = z.infer<typeof FileUploadDataSchema>;
export type FrameworkType = z.infer<typeof FrameworkTypeSchema>;
export type FieldOption = z.infer<typeof FieldOptionSchema>;
export type FieldVisibility = z.infer<typeof FieldVisibilitySchema>;
export type FieldMetadata = z.infer<typeof FieldMetadataSchema>;
/** @deprecated Use FieldMetadata instead - they are now the same type */
export type FileFieldMetadata = FieldMetadata;
export type FieldValidation = z.infer<typeof FieldValidationSchema>;
export type Field = z.infer<typeof FieldSchema>;
export type DTOFillPayload = z.infer<typeof DTOFillPayloadSchema>;

// API Response types
export type SuccessResponse = z.infer<typeof SuccessResponseSchema>;
export type EditProfileResponse = z.infer<typeof EditProfileResponseSchema>;
export type ChangeActiveProfileResponse = z.infer<typeof ChangeActiveProfileResponseSchema>;
export type DeleteProfileResponse = z.infer<typeof DeleteProfileResponseSchema>;

// UI types
export type OverlayPosition = z.infer<typeof OverlayPositionSchema>;
export type HighlightFormsOptions = z.infer<typeof HighlightFormsOptionsSchema>;

// Legacy type aliases for backwards compatibility (deprecated, use the main types)
/** @deprecated Use DTOFillingPreferences instead */
export type DTOFillingPrefrences = DTOFillingPreferences;

// ============================================================================
// Validation Helpers
// ============================================================================

/**
 * Safely parse data with a schema, returning either the parsed data or null
 */
export const safeParse = <T extends z.ZodType>(schema: T, data: unknown): z.infer<T> | null => {
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
export const parseOrThrow = <T extends z.ZodType>(schema: T, data: unknown): z.infer<T> => schema.parse(data);

/**
 * Type guard using Zod schema validation
 * Returns true if data matches the schema
 */
export const isValidSchema = <T extends z.ZodType>(schema: T, data: unknown): data is z.infer<T> =>
  schema.safeParse(data).success;

/**
 * Validate data against a schema and return detailed errors if invalid
 */
export const validateWithErrors = <T extends z.ZodType>(
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
export const parseDate = (dateString: string): Date | null => {
  const date = parseISO(dateString);
  return isValid(date) ? date : null;
};

/**
 * Zod schema for validating ISO date strings
 */
export const isoDateStringSchema = z.string().refine(
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
export const FillingWebsiteFormItemSchema = z.object({
  websiteUrl: z.string().url().min(1, { message: 'Website URL is required' }),
  isRootLoad: z.boolean().default(false),
  fillingContext: z.string().default(''),
  isNew: z.boolean().optional(),
});

/**
 * Profile form schema for creating/editing filling profiles
 */
export const ProfileFormSchema = z.object({
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
export const WebsiteEditSchema = z.object({
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
export const ProfileSelectorSchema = z.object({
  defaultActiveProfileId: z.string(),
});

// Form schema type exports
export type ProfileFormValues = z.infer<typeof ProfileFormSchema>;
export type WebsiteEditFormValues = z.infer<typeof WebsiteEditSchema>;
export type ProfileSelectorFormValues = z.infer<typeof ProfileSelectorSchema>;
export type FillingWebsiteFormItem = z.infer<typeof FillingWebsiteFormItemSchema>;
