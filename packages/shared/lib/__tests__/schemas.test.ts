/**
 * Comprehensive unit tests for Zod schemas and validation utilities
 * Tests form detection types, field schemas, and validation helpers
 */
import {
  UrlSchema,
  isValidUrl,
  FieldTypeSchema,
  FieldSchema,
  FieldOptionSchema,
  DTOFillingPreferencesSchema,
  DTOProfileFillingFormSchema,
  DTOFillPayloadSchema,
  safeParse,
  parseOrThrow,
  isValidSchema,
  validateWithErrors,
  parseDate,
  isoDateStringSchema,
  ProfileFormSchema,
  FillingWebsiteFormItemSchema,
} from '../services/schemas/index.js';
import { describe, it, expect } from 'vitest';

describe('URL Validation', () => {
  describe('UrlSchema', () => {
    it('should validate absolute URLs with https', () => {
      expect(UrlSchema.safeParse('https://example.com').success).toBe(true);
      expect(UrlSchema.safeParse('https://www.example.com/path').success).toBe(true);
      expect(UrlSchema.safeParse('https://sub.example.com:8080/path?query=1').success).toBe(true);
    });

    it('should validate absolute URLs with http', () => {
      expect(UrlSchema.safeParse('http://localhost:3000').success).toBe(true);
      expect(UrlSchema.safeParse('http://127.0.0.1:8080').success).toBe(true);
    });

    it('should validate relative URLs', () => {
      expect(UrlSchema.safeParse('/path/to/page').success).toBe(true);
      expect(UrlSchema.safeParse('/api/v1/users').success).toBe(true);
    });

    it('should validate URLs without protocol by auto-adding https', () => {
      expect(UrlSchema.safeParse('example.com').success).toBe(true);
      expect(UrlSchema.safeParse('www.example.com/path').success).toBe(true);
    });

    it('should reject invalid URLs', () => {
      expect(UrlSchema.safeParse('').success).toBe(false);
      expect(UrlSchema.safeParse('not a url').success).toBe(false);
      expect(UrlSchema.safeParse('://invalid').success).toBe(false);
    });
  });

  describe('isValidUrl helper', () => {
    it('should return true for valid URLs', () => {
      expect(isValidUrl('https://example.com')).toBe(true);
      expect(isValidUrl('http://localhost:3000')).toBe(true);
      expect(isValidUrl('/relative/path')).toBe(true);
    });

    it('should return false for invalid URLs', () => {
      expect(isValidUrl('')).toBe(false);
      expect(isValidUrl('not a url')).toBe(false);
    });
  });
});

describe('Field Type Schemas', () => {
  describe('FieldTypeSchema', () => {
    const validTypes = [
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
    ];

    it.each(validTypes)('should validate field type: %s', type => {
      expect(FieldTypeSchema.safeParse(type).success).toBe(true);
    });

    it('should reject invalid field types', () => {
      expect(FieldTypeSchema.safeParse('invalid').success).toBe(false);
      expect(FieldTypeSchema.safeParse('').success).toBe(false);
      expect(FieldTypeSchema.safeParse(123).success).toBe(false);
    });
  });

  describe('FieldOptionSchema', () => {
    it('should validate complete field options', () => {
      const option = { value: 'option1', text: 'Option 1', selected: true };
      expect(FieldOptionSchema.safeParse(option).success).toBe(true);
    });

    it('should validate options with false selected state', () => {
      const option = { value: 'option1', text: 'Option 1', selected: false };
      expect(FieldOptionSchema.safeParse(option).success).toBe(true);
    });

    it('should reject options missing required fields', () => {
      expect(FieldOptionSchema.safeParse({ value: 'option1' }).success).toBe(false);
      expect(FieldOptionSchema.safeParse({ text: 'Option 1' }).success).toBe(false);
      expect(FieldOptionSchema.safeParse({}).success).toBe(false);
    });
  });

  describe('FieldSchema', () => {
    it('should validate minimal field', () => {
      const field = { id: 'field-1', type: 'text' };
      expect(FieldSchema.safeParse(field).success).toBe(true);
    });

    it('should validate complete text field', () => {
      const field = {
        id: 'email-field',
        name: 'email',
        type: 'email',
        placeholder: 'Enter email',
        label: 'Email Address',
        required: true,
        value: 'test@example.com',
        validation: {
          pattern: '^[^@]+@[^@]+\\.[^@]+$',
          maxLength: 255,
        },
      };
      expect(FieldSchema.safeParse(field).success).toBe(true);
    });

    it('should validate select field with options', () => {
      const field = {
        id: 'country-select',
        type: 'select',
        label: 'Country',
        options: [
          { value: 'us', text: 'United States', selected: false },
          { value: 'uk', text: 'United Kingdom', selected: true },
        ],
      };
      expect(FieldSchema.safeParse(field).success).toBe(true);
    });

    it('should validate checkbox field', () => {
      const field = {
        id: 'terms-checkbox',
        type: 'checkbox',
        label: 'I agree to terms',
        value: 'true',
      };
      expect(FieldSchema.safeParse(field).success).toBe(true);
    });

    it('should validate field with array value (for multi-select)', () => {
      const field = {
        id: 'interests',
        type: 'checkbox',
        value: ['sports', 'music', 'travel'],
      };
      expect(FieldSchema.safeParse(field).success).toBe(true);
    });

    it('should reject field without id', () => {
      const field = { type: 'text' };
      expect(FieldSchema.safeParse(field).success).toBe(false);
    });

    it('should reject field with invalid type', () => {
      const field = { id: 'field-1', type: 'invalid-type' };
      expect(FieldSchema.safeParse(field).success).toBe(false);
    });
  });
});

describe('Profile Schemas', () => {
  describe('DTOFillingPreferencesSchema', () => {
    it('should validate complete preferences', () => {
      const prefs = {
        isFormal: true,
        isGapFillingAllowed: false,
        toneId: 1,
        povId: 2,
      };
      expect(DTOFillingPreferencesSchema.safeParse(prefs).success).toBe(true);
    });

    it('should reject incomplete preferences', () => {
      expect(DTOFillingPreferencesSchema.safeParse({ isFormal: true }).success).toBe(false);
      expect(DTOFillingPreferencesSchema.safeParse({}).success).toBe(false);
    });
  });

  describe('DTOProfileFillingFormSchema', () => {
    it('should validate complete profile', () => {
      const profile = {
        profileName: 'Work Profile',
        defaultFillingContext: 'Professional context for work forms',
        preferences: {
          isFormal: true,
          isGapFillingAllowed: false,
          toneId: 1,
          povId: 1,
        },
        fillingWebsites: [
          {
            websiteUrl: 'https://example.com/apply',
            isRootLoad: false,
            fillingContext: 'Job application form',
          },
        ],
      };
      expect(DTOProfileFillingFormSchema.safeParse(profile).success).toBe(true);
    });

    it('should validate profile with optional id', () => {
      const profile = {
        id: '123',
        profileName: 'Test',
        defaultFillingContext: 'Test context',
        preferences: {
          isFormal: false,
          isGapFillingAllowed: true,
          toneId: 2,
          povId: 2,
        },
        fillingWebsites: [],
      };
      expect(DTOProfileFillingFormSchema.safeParse(profile).success).toBe(true);
    });
  });
});

describe('DTOFillPayload Schema', () => {
  it('should validate complete fill payload', () => {
    const payload = {
      contextText: 'This is my profile context with relevant information',
      formData: [
        { id: 'name', type: 'text', label: 'Full Name' },
        { id: 'email', type: 'email', label: 'Email' },
      ],
      websiteUrl: 'https://example.com/form',
      preferences: {
        isFormal: true,
        isGapFillingAllowed: false,
        toneId: 1,
        povId: 1,
      },
    };
    expect(DTOFillPayloadSchema.safeParse(payload).success).toBe(true);
  });

  it('should reject payload without preferences (preferences is required)', () => {
    const payload = {
      contextText: 'Context',
      formData: [{ id: 'field1', type: 'text' }],
      websiteUrl: 'https://example.com',
    };
    expect(DTOFillPayloadSchema.safeParse(payload).success).toBe(false);
  });

  it('should reject payload with empty contextText', () => {
    const payload = {
      contextText: '',
      formData: [{ id: 'field1', type: 'text' }],
      websiteUrl: 'https://example.com',
      preferences: { isFormal: true, isGapFillingAllowed: false, toneId: 1, povId: 1 },
    };
    expect(DTOFillPayloadSchema.safeParse(payload).success).toBe(false);
  });

  it('should reject payload with empty formData', () => {
    const payload = {
      contextText: 'Context',
      formData: [],
      websiteUrl: 'https://example.com',
      preferences: { isFormal: true, isGapFillingAllowed: false, toneId: 1, povId: 1 },
    };
    expect(DTOFillPayloadSchema.safeParse(payload).success).toBe(false);
  });

  it('should reject payload with invalid websiteUrl', () => {
    const payload = {
      contextText: 'Context',
      formData: [{ id: 'field1', type: 'text' }],
      websiteUrl: 'not-a-url',
      preferences: { isFormal: true, isGapFillingAllowed: false, toneId: 1, povId: 1 },
    };
    expect(DTOFillPayloadSchema.safeParse(payload).success).toBe(false);
  });
});

describe('Validation Helpers', () => {
  describe('safeParse', () => {
    it('should return parsed data for valid input', () => {
      const result = safeParse(FieldTypeSchema, 'text');
      expect(result).toBe('text');
    });

    it('should return null for invalid input', () => {
      const result = safeParse(FieldTypeSchema, 'invalid');
      expect(result).toBeNull();
    });
  });

  describe('parseOrThrow', () => {
    it('should return parsed data for valid input', () => {
      const result = parseOrThrow(FieldTypeSchema, 'email');
      expect(result).toBe('email');
    });

    it('should throw for invalid input', () => {
      expect(() => parseOrThrow(FieldTypeSchema, 'invalid')).toThrow();
    });
  });

  describe('isValidSchema', () => {
    it('should return true for valid data', () => {
      expect(isValidSchema(FieldTypeSchema, 'text')).toBe(true);
    });

    it('should return false for invalid data', () => {
      expect(isValidSchema(FieldTypeSchema, 'invalid')).toBe(false);
    });
  });

  describe('validateWithErrors', () => {
    it('should return success result for valid data', () => {
      const result = validateWithErrors(FieldTypeSchema, 'text');
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toBe('text');
      }
    });

    it('should return errors for invalid data', () => {
      const result = validateWithErrors(FieldTypeSchema, 'invalid');
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.errors.length).toBeGreaterThan(0);
      }
    });
  });
});

describe('Date Validation', () => {
  describe('parseDate', () => {
    it('should parse valid ISO date strings', () => {
      const result = parseDate('2024-01-15');
      expect(result).toBeInstanceOf(Date);
      expect(result?.getFullYear()).toBe(2024);
    });

    it('should parse ISO datetime strings', () => {
      const result = parseDate('2024-01-15T10:30:00Z');
      expect(result).toBeInstanceOf(Date);
    });

    it('should return null for invalid dates', () => {
      expect(parseDate('invalid')).toBeNull();
      expect(parseDate('2024-13-45')).toBeNull();
    });
  });

  describe('isoDateStringSchema', () => {
    it('should validate valid ISO date strings', () => {
      expect(isoDateStringSchema.safeParse('2024-01-15').success).toBe(true);
      expect(isoDateStringSchema.safeParse('2024-12-31T23:59:59Z').success).toBe(true);
    });

    it('should reject invalid date strings', () => {
      expect(isoDateStringSchema.safeParse('not-a-date').success).toBe(false);
    });
  });
});

describe('Form Schemas', () => {
  describe('FillingWebsiteFormItemSchema', () => {
    it('should validate complete website item', () => {
      const item = {
        websiteUrl: 'https://example.com/form',
        isRootLoad: true,
        fillingContext: 'Application form',
      };
      expect(FillingWebsiteFormItemSchema.safeParse(item).success).toBe(true);
    });

    it('should apply defaults for optional fields', () => {
      const item = {
        websiteUrl: 'https://example.com',
      };
      const result = FillingWebsiteFormItemSchema.safeParse(item);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.isRootLoad).toBe(false);
        expect(result.data.fillingContext).toBe('');
      }
    });

    it('should reject invalid URL', () => {
      const item = {
        websiteUrl: 'not-a-url',
        isRootLoad: false,
        fillingContext: '',
      };
      expect(FillingWebsiteFormItemSchema.safeParse(item).success).toBe(false);
    });
  });

  describe('ProfileFormSchema', () => {
    it('should validate complete profile form', () => {
      const form = {
        profileName: 'My Profile',
        defaultFillingContext: 'Default context for forms',
        preferences: {
          isFormal: true,
          isGapFillingAllowed: false,
          toneId: '1',
          povId: '1',
        },
        fillingWebsites: [],
      };
      expect(ProfileFormSchema.safeParse(form).success).toBe(true);
    });

    it('should reject empty profile name', () => {
      const form = {
        profileName: '',
        defaultFillingContext: 'Context',
        preferences: {
          isFormal: true,
          isGapFillingAllowed: false,
          toneId: '1',
          povId: '1',
        },
        fillingWebsites: [],
      };
      expect(ProfileFormSchema.safeParse(form).success).toBe(false);
    });

    it('should apply default values', () => {
      const form = {
        profileName: 'Test',
        defaultFillingContext: 'Context',
        preferences: {
          toneId: '1',
          povId: '1',
        },
      };
      const result = ProfileFormSchema.safeParse(form);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.preferences.isFormal).toBe(true);
        expect(result.data.preferences.isGapFillingAllowed).toBe(false);
        expect(result.data.fillingWebsites).toEqual([]);
      }
    });
  });
});

describe('Edge Cases', () => {
  it('should handle null input gracefully', () => {
    expect(safeParse(FieldSchema, null)).toBeNull();
  });

  it('should handle undefined input gracefully', () => {
    expect(safeParse(FieldSchema, undefined)).toBeNull();
  });

  it('should handle deeply nested structures', () => {
    const deepField = {
      id: 'nested-field',
      type: 'text',
      metadata: {
        framework: 'react',
        visibility: { isVisible: true },
      },
      validation: {
        pattern: '^[a-z]+$',
        minLength: 1,
        maxLength: 100,
      },
    };
    expect(FieldSchema.safeParse(deepField).success).toBe(true);
  });

  it('should handle Unicode in string values', () => {
    const field = {
      id: 'unicode-field',
      type: 'text',
      label: '日本語ラベル',
      placeholder: 'Введите текст',
      value: '你好世界',
    };
    expect(FieldSchema.safeParse(field).success).toBe(true);
  });

  it('should handle very long strings', () => {
    const longString = 'a'.repeat(10000);
    const field = {
      id: 'long-field',
      type: 'textarea',
      value: longString,
    };
    expect(FieldSchema.safeParse(field).success).toBe(true);
  });

  it('should handle special characters in values', () => {
    const field = {
      id: 'special-chars',
      type: 'text',
      value: '<script>alert("xss")</script>',
      label: 'Test & "Special" \'Chars\'',
    };
    expect(FieldSchema.safeParse(field).success).toBe(true);
  });
});
