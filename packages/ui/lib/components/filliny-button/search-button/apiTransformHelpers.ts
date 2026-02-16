import type { Field, DTOFillingPreferences } from '@extension/shared';

/**
 * Keys allowed in the API formData payload.
 * Only includes keys that exist on both the extension's Field type AND the API schema.
 * Strips: xpath, uniqueSelectors, validation, title, testValue, metadata
 */
type AllowedFieldKey =
  | 'id'
  | 'name'
  | 'type'
  | 'placeholder'
  | 'label'
  | 'description'
  | 'value'
  | 'options'
  | 'required';

const ALLOWED_FORM_DATA_FIELDS: readonly AllowedFieldKey[] = [
  'id',
  'name',
  'type',
  'placeholder',
  'label',
  'description',
  'value',
  'options',
  'required',
] as const;

/**
 * Keys allowed in the API preferences payload.
 * Strip id and profileId which the API doesn't accept.
 */
type AllowedPreferencesKey = 'isFormal' | 'isGapFillingAllowed' | 'toneId' | 'povId';

const ALLOWED_PREFERENCES_FIELDS: readonly AllowedPreferencesKey[] = [
  'isFormal',
  'isGapFillingAllowed',
  'toneId',
  'povId',
] as const;

/**
 * Transform a single form field to only include fields accepted by the API.
 * Strips: xpath, uniqueSelectors, validation, title, testValue, metadata
 */
const transformFieldForApi = (field: Field): Pick<Field, AllowedFieldKey> => {
  const transformed = {} as Pick<Field, AllowedFieldKey>;
  for (const key of ALLOWED_FORM_DATA_FIELDS) {
    if (key in field && field[key] !== undefined) {
      Object.assign(transformed, { [key]: field[key] });
    }
  }
  return transformed;
};

/**
 * Transform an array of form fields to only include fields accepted by the API.
 */
const transformFormDataForApi = (fields: Field[]): Pick<Field, AllowedFieldKey>[] => fields.map(transformFieldForApi);

/**
 * Transform preferences to only include fields accepted by the API.
 * Strips: id, profileId
 */
const transformPreferencesForApi = (
  preferences: DTOFillingPreferences | undefined,
): DTOFillingPreferences | undefined => {
  if (!preferences) return undefined;

  const transformed = {} as Pick<DTOFillingPreferences, AllowedPreferencesKey>;
  for (const key of ALLOWED_PREFERENCES_FIELDS) {
    if (key in preferences && preferences[key] !== undefined) {
      Object.assign(transformed, { [key]: preferences[key] });
    }
  }
  return transformed as DTOFillingPreferences;
};

/**
 * Type for stream message from background script
 */
interface StreamMessage {
  type: string;
  data?: string;
  error?: string;
}

export { transformFieldForApi, transformFormDataForApi, transformPreferencesForApi };
export type { StreamMessage };
