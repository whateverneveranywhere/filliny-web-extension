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
 * All limits are returned dynamically from the API based on user's subscription.
 *
 * Both freeFormsRemaining and isProSubscriber are always returned by the API
 * (required fields in the API's PlanLimitationsSchema).
 */
const LimitationsSchema = z.object({
  maxFillingProfiles: z.number(),
  maxWebsitesPerProfile: z.number(),
  tokensRemaining: z.number(),
  freeFormsRemaining: z.number(),
  isProSubscriber: z.boolean(),
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

/**
 * Public health check response schema
 * Does not require authentication - used to check if API is reachable
 */
const PublicHealthCheckSchema = z.object({
  status: z.enum(['healthy', 'unhealthy']),
  ok: z.boolean().optional(),
  version: z.string().optional(),
  timestamp: z.number(),
});

// ============================================================================
// Dashboard Schemas
// ============================================================================

/**
 * Time series data schema for fill counts over time
 */
const DTOTimeSeriesDataSchema = z.object({
  date: z.string(),
  count: z.number(),
});

/**
 * Website activity data schema
 */
const DTOWebsiteActivityDataSchema = z.object({
  url: z.string(),
  count: z.number(),
  domain: z.string(),
  timeSaved: z.number(),
  faviconUrl: z.string(),
  successRate: z.number(),
  firstUsed: z.string(),
  lastUsed: z.string(),
  averageTime: z.number(),
});

/**
 * Success rate data schema
 */
const DTOSuccessRateDataSchema = z.object({
  successRate: z.number(),
  successCount: z.number(),
  failureCount: z.number(),
  pendingCount: z.number(),
  totalCount: z.number(),
});

/**
 * Fastest completion data schema
 */
const DTOFastestCompletionDataSchema = z.object({
  url: z.string(),
  domain: z.string(),
  avgTokens: z.number(),
  count: z.number(),
  faviconUrl: z.string(),
});

/**
 * Forms left data schema
 */
const DTOFormsLeftDataSchema = z.object({
  count: z.number(),
  percent: z.number(),
});

/**
 * Completion rate by hour schema
 */
const DTOCompletionRateDataSchema = z.object({
  hour: z.number(),
  count: z.number(),
  successCount: z.number(),
  successRate: z.number(),
});

/**
 * Profile stats schema
 */
const DTOProfileStatsSchema = z.object({
  profileId: z.number(),
  profileName: z.string(),
  websiteCount: z.number(),
});

/**
 * Dashboard overview response schema
 * Matches the API's OverviewDataSchema from /overview endpoint
 */
const DTOOverviewSchema = z.object({
  aiHistoryCount: z.number(),
  remainingTokens: z.number(),
  formsLeftData: DTOFormsLeftDataSchema,
  fillsOverTime: z.array(DTOTimeSeriesDataSchema),
  enhancedWebsites: z.array(DTOWebsiteActivityDataSchema),
  averageTokensPerFill: z.number(),
  maxTokensPerFill: z.number(),
  minTokensPerFill: z.number(),
  totalTokensUsed: z.number(),
  successRate: DTOSuccessRateDataSchema,
  totalTimeSaved: z.number(),
  fastestCompletions: z.array(DTOFastestCompletionDataSchema),
  profileStats: z.array(DTOProfileStatsSchema),
  periodChange: z.number(),
  hourlyCompletionRate: z.array(DTOCompletionRateDataSchema),
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
  id: z.union([z.string(), z.number()]).transform(val => (typeof val === 'string' ? val : String(val))),
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
  id: z
    .union([z.string(), z.number()])
    .optional()
    .transform(val => (val === undefined ? undefined : typeof val === 'string' ? val : String(val))),
  profileName: z.string(),
  defaultFillingContext: z.string(),
  preferences: DTOFillingPreferencesSchema,
  fillingWebsites: z.array(DTOFillingWebsiteSchema),
});

/**
 * Create profile response schema (lightweight response from POST /profiles)
 *
 * The create endpoint returns only { id, profileName, isActive } — NOT the full profile.
 * Callers must merge this response with the original input data to reconstruct
 * the complete profile for storage and cache.
 */
const CreateProfileResponseSchema = z.object({
  id: z.union([z.string(), z.number()]).transform(val => (typeof val === 'string' ? val : String(val))),
  profileName: z.string(),
  isActive: z.boolean().optional(),
});

// ============================================================================
// Authorized Files Schemas
// ============================================================================

/**
 * Authorized file category schema
 * Note: This is different from FileCategory in enums.ts which is for file upload type categorization
 * This schema is specifically for user-authorized files (resume, photo, certificate, etc.)
 */
const AuthorizedFileCategorySchema = z.enum(['resume', 'photo', 'certificate', 'document', 'other']);

/**
 * Authorized file schema for user-uploaded files that AI can use during form filling
 */
const DTOAuthorizedFileSchema = z.object({
  id: z.number(),
  filename: z.string(),
  originalFilename: z.string(),
  extension: z.string(),
  mimeType: z.string(),
  fileSize: z.number(),
  r2Url: z.string(),
  description: z.string(),
  useCases: z.string(),
  category: AuthorizedFileCategorySchema,
  uploadedAt: z.string().nullable().optional(),
  lastUsedAt: z.string().nullable().optional(),
  createdAt: z.string().nullable().optional(),
  updatedAt: z.string().nullable().optional(),
});

/**
 * Authorized file list response schema
 */
const DTOAuthorizedFilesListSchema = z.array(DTOAuthorizedFileSchema);

/**
 * Authorized file creation request schema
 */
const DTOAuthorizedFileCreateSchema = z.object({
  filename: z.string().min(1, 'Filename is required'),
  originalFilename: z.string().min(1, 'Original filename is required'),
  extension: z.string().min(1, 'Extension is required'),
  mimeType: z.string().min(1, 'MIME type is required'),
  fileSize: z.number().positive('File size must be positive'),
  description: z.string().min(1, 'Description is required'),
  useCases: z.string().min(1, 'Use cases are required'),
  category: AuthorizedFileCategorySchema,
});

/**
 * Authorized file update request schema
 */
const DTOAuthorizedFileUpdateSchema = z.object({
  description: z.string().min(1, 'Description is required').optional(),
  useCases: z.string().min(1, 'Use cases are required').optional(),
  category: AuthorizedFileCategorySchema.optional(),
});

/**
 * Presigned URL response schema for file uploads
 */
const DTOPresignedUrlResponseSchema = z.object({
  uploadUrl: z.string().url(),
  fileId: z.number(),
  r2Key: z.string(),
  expiresAt: z.string(),
});

/**
 * File download URL response schema
 */
const DTOFileDownloadUrlSchema = z.object({
  downloadUrl: z.string().url(),
  filename: z.string(),
  expiresAt: z.string(),
});

/**
 * Authorized file for AI context (minimal version for API payload)
 */
const DTOAuthorizedFileForAISchema = z.object({
  id: z.number(),
  filename: z.string(),
  description: z.string(),
  useCases: z.string(),
  category: AuthorizedFileCategorySchema,
  mimeType: z.string(),
  fileSize: z.number(),
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
 * API-compatible form field schema
 * Matches the API's FormFieldSchema with flat validation constraints.
 * Used in DTOFillPayloadSchema for data sent to the AI fill endpoint.
 *
 * Key differences from FieldSchema (internal representation):
 * - No title, testValue, validation (nested), metadata, xpath, uniqueSelectors
 * - Validation constraints (minLength, maxLength, min, max, pattern) are top-level
 * - acceptTypes is a comma-separated string (extracted from metadata)
 */
const ApiFormFieldSchema = z.object({
  id: z.string(),
  name: z.string().optional(),
  type: InputFieldTypeSchema,
  label: z.string().optional(),
  description: z.string().optional(),
  placeholder: z.string().optional(),
  value: z.union([z.string(), z.array(z.string())]).optional(),
  required: z.boolean().optional(),
  options: z.array(FieldOptionSchema).optional(),
  acceptTypes: z.string().optional(),
  minLength: z.number().optional(),
  maxLength: z.number().optional(),
  min: z.number().optional(),
  max: z.number().optional(),
  pattern: z.string().optional(),
});

/**
 * DTO Fill Payload schema for AI form filling requests
 * Matches the API's FillRequestSchema constraints:
 * - contextText must be non-empty (min 1 char)
 * - formData must have at least one field
 * - websiteUrl must be a valid URL
 * - preferences is required (defaults provided by transform layer when profile is missing)
 * - authorizedFiles is optional
 */
const DTOFillPayloadSchema = z.object({
  contextText: z.string().min(1),
  formData: z.array(ApiFormFieldSchema).min(1),
  websiteUrl: z.string().url(),
  preferences: DTOFillingPreferencesSchema,
  authorizedFiles: z.array(DTOAuthorizedFileForAISchema).optional(),
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
 * After envelope unwrapping, API may return the profile directly or wrapped in { success, profile }
 */
const EditProfileResponseSchema = z.union([
  SuccessResponseSchema.extend({
    profile: DTOProfileFillingFormSchema.optional(),
  }),
  DTOProfileFillingFormSchema, // API may return profile directly after envelope unwrapping
]);

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
// API Response Envelope Schemas
// ============================================================================

/**
 * Meta information attached to every API response
 */
const ResponseMetaSchema = z
  .object({
    requestId: z.string().optional(),
    timestamp: z.string().optional(),
    version: z.string().optional(),
    duration: z.number().optional(),
  })
  .passthrough();

/**
 * API success envelope - all successful responses are wrapped in this shape.
 * The API wraps all responses in { success: true, data: T, meta?: {...} }
 */
const ApiSuccessEnvelopeSchema = z.object({
  success: z.literal(true),
  data: z.unknown(),
  meta: ResponseMetaSchema.optional(),
});

/**
 * API error envelope - all error responses follow this shape.
 * { success: false, error: { code, message, ... }, meta?: {...} }
 */
const ApiErrorEnvelopeSchema = z.object({
  success: z.literal(false),
  error: z.object({
    code: z.string(),
    message: z.string(),
    details: z.record(z.string(), z.unknown()).optional(),
    validation: z
      .array(
        z.object({
          field: z.string(),
          message: z.string(),
          code: z.string().optional(),
        }),
      )
      .optional(),
  }),
  meta: ResponseMetaSchema.optional(),
});

/**
 * Streaming error chunk from server-sent events
 */
const StreamingErrorSchema = z.object({
  error: z.object({
    message: z.string(),
    code: z.string().optional(),
  }),
});

/**
 * Streaming data chunk containing field array
 */
const StreamingFieldDataSchema = z.object({
  data: z.array(FieldSchema),
});

/**
 * Unwrap an API response envelope.
 * If the response matches { success: true, data: T }, returns the data.
 * Otherwise, returns the original value (for raw/non-envelope responses).
 */
const unwrapApiEnvelope = (json: unknown): unknown => {
  const result = ApiSuccessEnvelopeSchema.safeParse(json);
  return result.success ? result.data.data : json;
};

/**
 * Parse an API error response.
 * Returns the structured error if it matches the envelope, or null.
 */
const parseApiError = (json: unknown): z.infer<typeof ApiErrorEnvelopeSchema>['error'] | null => {
  const result = ApiErrorEnvelopeSchema.safeParse(json);
  return result.success ? result.data.error : null;
};

/**
 * Detect quota error type from a structured API error code.
 * Falls back to message string matching for backward compatibility.
 */
const detectQuotaErrorFromResponse = (
  error: { code?: string; message?: string } | string,
): 'no_tokens' | 'no_free_forms' | 'limit_exceeded' | null => {
  // If passed a string directly, fall back to message matching
  if (typeof error === 'string') {
    return detectQuotaErrorFromMessage(error);
  }

  // Primary: check structured error code
  if (error.code) {
    const code = error.code.toUpperCase();
    if (code === 'NO_TOKENS' || code === 'INSUFFICIENT_TOKENS' || code === 'TOKEN_LIMIT_EXCEEDED') {
      return 'no_tokens';
    }
    if (code === 'NO_FREE_FORMS') {
      return 'no_free_forms';
    }
    if (code === 'QUOTA_EXCEEDED' || code === 'LIMIT_EXCEEDED' || code === 'FORBIDDEN') {
      return 'limit_exceeded';
    }
  }

  // Fallback: check message text
  if (error.message) {
    return detectQuotaErrorFromMessage(error.message);
  }

  return null;
};

/**
 * Detect quota error type from an error message string.
 * Used as fallback when structured error codes are not available.
 */
const detectQuotaErrorFromMessage = (message: string): 'no_tokens' | 'no_free_forms' | 'limit_exceeded' | null => {
  const lower = message.toLowerCase();
  if (lower.includes('no tokens') || lower.includes('insufficient tokens')) {
    return 'no_tokens';
  }
  if (lower.includes('no free forms') || lower.includes('free forms remaining')) {
    return 'no_free_forms';
  }
  if (lower.includes('quota') || lower.includes('limit exceeded')) {
    return 'limit_exceeded';
  }
  return null;
};

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
 * All limits come from the API dynamically based on the user's subscription.
 * isPro is derived directly from the API's isProSubscriber flag
 */
const UserStatusSchema = z.object({
  tokensRemaining: z.number(),
  freeFormsRemaining: z.number(),
  maxProfiles: z.number(),
  maxWebsitesPerProfile: z.number(),
  isPro: z.boolean(),
});

/**
 * Helper to compute isPro status from limitations.
 * Trusts the isProSubscriber flag from the API which checks the active subscription directly.
 */
const computeIsPro = (limitations: { isProSubscriber: boolean }): boolean => limitations.isProSubscriber;
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
type PublicHealthCheckResponse = z.infer<typeof PublicHealthCheckSchema>;
type UserStatus = z.infer<typeof UserStatusSchema>;

// Dashboard types
type DTOOverviewResponse = z.infer<typeof DTOOverviewSchema>;
type DTOTimeSeriesData = z.infer<typeof DTOTimeSeriesDataSchema>;
type DTOWebsiteActivityData = z.infer<typeof DTOWebsiteActivityDataSchema>;
type DTOSuccessRateData = z.infer<typeof DTOSuccessRateDataSchema>;
type DTOFastestCompletionData = z.infer<typeof DTOFastestCompletionDataSchema>;
type DTOFormsLeftData = z.infer<typeof DTOFormsLeftDataSchema>;
type DTOCompletionRateData = z.infer<typeof DTOCompletionRateDataSchema>;
type DTOProfileStats = z.infer<typeof DTOProfileStatsSchema>;

// Profile types (with Response suffix for API responses, without for storage)
type CreateProfileResponse = z.infer<typeof CreateProfileResponseSchema>;
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
type ApiFormField = z.infer<typeof ApiFormFieldSchema>;
type DTOFillPayload = z.infer<typeof DTOFillPayloadSchema>;

// Authorized files types
type AuthorizedFileCategory = z.infer<typeof AuthorizedFileCategorySchema>;
type DTOAuthorizedFile = z.infer<typeof DTOAuthorizedFileSchema>;
type DTOAuthorizedFilesList = z.infer<typeof DTOAuthorizedFilesListSchema>;
type DTOAuthorizedFileCreate = z.infer<typeof DTOAuthorizedFileCreateSchema>;
type DTOAuthorizedFileUpdate = z.infer<typeof DTOAuthorizedFileUpdateSchema>;
type DTOPresignedUrlResponse = z.infer<typeof DTOPresignedUrlResponseSchema>;
type DTOFileDownloadUrl = z.infer<typeof DTOFileDownloadUrlSchema>;
type DTOAuthorizedFileForAI = z.infer<typeof DTOAuthorizedFileForAISchema>;

// API Response types
type SuccessResponse = z.infer<typeof SuccessResponseSchema>;
type EditProfileResponse = z.infer<typeof EditProfileResponseSchema>;
type ChangeActiveProfileResponse = z.infer<typeof ChangeActiveProfileResponseSchema>;
type DeleteProfileResponse = z.infer<typeof DeleteProfileResponseSchema>;

// UI types
type OverlayPosition = z.infer<typeof OverlayPositionSchema>;
type HighlightFormsOptions = z.infer<typeof HighlightFormsOptionsSchema>;

// API Envelope types
type ApiSuccessEnvelope = z.infer<typeof ApiSuccessEnvelopeSchema>;
type ApiErrorEnvelope = z.infer<typeof ApiErrorEnvelopeSchema>;
type StreamingError = z.infer<typeof StreamingErrorSchema>;
type StreamingFieldData = z.infer<typeof StreamingFieldDataSchema>;

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
export { PlanSchema, UserSchema, LimitationsSchema, AuthHealthCheckSchema, PublicHealthCheckSchema, UserStatusSchema };

// User Status Helpers
export { computeIsPro, toUserStatus };

// Dashboard Schemas
export {
  DTOOverviewSchema,
  DTOTimeSeriesDataSchema,
  DTOWebsiteActivityDataSchema,
  DTOSuccessRateDataSchema,
  DTOFastestCompletionDataSchema,
  DTOFormsLeftDataSchema,
  DTOCompletionRateDataSchema,
  DTOProfileStatsSchema,
};

// Profile Schemas
export {
  DTOFillingProfileItemSchema,
  DTOSuggestedWebsiteSchema,
  DTOToneSchema,
  DTOPovSchema,
  DTOFillingWebsiteSchema,
  DTOFillingPreferencesSchema,
  DTOProfileFillingFormSchema,
  CreateProfileResponseSchema,
};

// Authorized Files Schemas
export {
  AuthorizedFileCategorySchema,
  DTOAuthorizedFileSchema,
  DTOAuthorizedFilesListSchema,
  DTOAuthorizedFileCreateSchema,
  DTOAuthorizedFileUpdateSchema,
  DTOPresignedUrlResponseSchema,
  DTOFileDownloadUrlSchema,
  DTOAuthorizedFileForAISchema,
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
  ApiFormFieldSchema,
  DTOFillPayloadSchema,
};

// API Response Schemas
export {
  SuccessResponseSchema,
  EditProfileResponseSchema,
  ChangeActiveProfileResponseSchema,
  DeleteProfileResponseSchema,
};

// API Envelope Schemas
export {
  ResponseMetaSchema,
  ApiSuccessEnvelopeSchema,
  ApiErrorEnvelopeSchema,
  StreamingErrorSchema,
  StreamingFieldDataSchema,
  unwrapApiEnvelope,
  parseApiError,
  detectQuotaErrorFromResponse,
  detectQuotaErrorFromMessage,
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
  PublicHealthCheckResponse,
  UserStatus,
  DTOOverviewResponse,
  DTOTimeSeriesData,
  DTOWebsiteActivityData,
  DTOSuccessRateData,
  DTOFastestCompletionData,
  DTOFormsLeftData,
  DTOCompletionRateData,
  DTOProfileStats,
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
  CreateProfileResponse,
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
  ApiFormField,
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
  // Authorized files types
  AuthorizedFileCategory,
  DTOAuthorizedFile,
  DTOAuthorizedFilesList,
  DTOAuthorizedFileCreate,
  DTOAuthorizedFileUpdate,
  DTOPresignedUrlResponse,
  DTOFileDownloadUrl,
  DTOAuthorizedFileForAI,
  // API Envelope types
  ApiSuccessEnvelope,
  ApiErrorEnvelope,
  StreamingError,
  StreamingFieldData,
};
