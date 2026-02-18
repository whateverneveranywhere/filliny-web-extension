import { createDebugLogger } from '@extension/shared';
import type { Field, ApiFormField, DTOFillingPreferences } from '@extension/shared';

const debug = createDebugLogger('ApiTransform');

/**
 * Default preferences used when no user profile is available.
 * Matches the API's FillPreferencesSchema requirements.
 */
const DEFAULT_PREFERENCES: DTOFillingPreferences = {
  toneId: 1,
  povId: 1,
  isFormal: true,
  isGapFillingAllowed: true,
};

/**
 * Assemble a fallback label from all available field metadata.
 * Combines name, placeholder, title, description, type, and options into a
 * pipe-separated string so the API always has context about what the field is.
 */
const assembleFieldLabelFallback = (field: Field): string => {
  const signals: string[] = [];

  if (field.name?.trim()) signals.push(field.name.trim());
  if (field.placeholder?.trim()) signals.push(field.placeholder.trim());
  if (field.title?.trim()) signals.push(field.title.trim());
  if (field.description?.trim()) signals.push(field.description.trim());
  if (field.type) signals.push(`type:${field.type}`);
  if (field.options && field.options.length > 0) {
    const optionLabels = field.options
      .slice(0, 5)
      .map(o => o.text || o.value)
      .filter(Boolean);
    if (optionLabels.length > 0) {
      signals.push(`options:[${optionLabels.join(', ')}]`);
    }
  }

  return signals.length > 0 ? signals.join(' | ') : `field:${field.id}`;
};

/**
 * Transform a single form field to the API-compatible format.
 *
 * Key transformations:
 * - Strips internal fields: title, testValue, validation (nested), metadata, xpath, uniqueSelectors
 * - Flattens validation constraints (minLength, maxLength, min, max, pattern) to top level
 * - Extracts acceptTypes string from metadata.fileUploadData.acceptedTypes
 * - Ensures label is never empty (uses fallback enrichment)
 */
const transformFieldForApi = (field: Field): ApiFormField => {
  const result: ApiFormField = {
    id: field.id,
    type: field.type,
  };

  // Copy optional simple fields
  if (field.name !== undefined) result.name = field.name;
  if (field.placeholder !== undefined) result.placeholder = field.placeholder;
  if (field.description !== undefined) result.description = field.description;
  if (field.value !== undefined) result.value = field.value;
  if (field.required !== undefined) result.required = field.required;
  if (field.options !== undefined) result.options = field.options;

  // Ensure label is never empty
  if (field.label?.trim()) {
    result.label = field.label;
  } else {
    const fallbackLabel = assembleFieldLabelFallback(field);
    debug.warn(`Field ${field.id} has empty label, enriching with fallback: "${fallbackLabel}"`);
    result.label = fallbackLabel;
  }

  // Flatten validation constraints from nested validation object to top level
  // API's FormFieldSchema expects these at the top level, not nested
  if (field.validation) {
    if (field.validation.minLength !== undefined) result.minLength = field.validation.minLength;
    if (field.validation.maxLength !== undefined) result.maxLength = field.validation.maxLength;
    if (field.validation.min !== undefined) result.min = field.validation.min;
    if (field.validation.max !== undefined) result.max = field.validation.max;
    if (field.validation.pattern !== undefined) result.pattern = field.validation.pattern;
  }

  // Extract acceptTypes from metadata for file inputs
  // API expects a comma-separated string like ".pdf,.doc,.docx"
  if (field.metadata?.fileUploadData?.acceptedTypes) {
    const types = field.metadata.fileUploadData.acceptedTypes;
    if (types.length > 0) {
      result.acceptTypes = types.map(t => t.value).join(',');
    }
  }

  return result;
};

/**
 * Transform an array of form fields to the API-compatible format.
 * Validates all fields have non-empty labels before sending.
 */
const transformFormDataForApi = (fields: Field[]): ApiFormField[] => {
  const transformed = fields.map(transformFieldForApi);

  // Log warning if any fields still have weak labels after enrichment
  const weakFields = transformed.filter(f => !f.label || f.label.startsWith('field:') || f.label.includes(':unknown'));
  if (weakFields.length > 0) {
    debug.warn(
      `${weakFields.length}/${transformed.length} fields have weak labels:`,
      weakFields.map(f => ({ id: f.id, label: f.label })),
    );
  }

  return transformed;
};

/**
 * Transform preferences to only include fields accepted by the API.
 * Strips: id, profileId.
 * Always returns a value - uses DEFAULT_PREFERENCES when input is undefined.
 * This ensures the API's required preferences field is always satisfied.
 */
const transformPreferencesForApi = (preferences: DTOFillingPreferences | undefined): DTOFillingPreferences => {
  if (!preferences) return DEFAULT_PREFERENCES;

  return {
    isFormal: preferences.isFormal,
    isGapFillingAllowed: preferences.isGapFillingAllowed,
    toneId: preferences.toneId,
    povId: preferences.povId,
  };
};

/**
 * Type for stream message from background script
 */
interface StreamMessage {
  type: string;
  data?: string;
  error?: string;
}

export { transformFieldForApi, transformFormDataForApi, transformPreferencesForApi, DEFAULT_PREFERENCES };
export type { StreamMessage };
