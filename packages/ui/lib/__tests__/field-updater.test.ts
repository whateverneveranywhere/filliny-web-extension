/**
 * Unit tests for fieldUpdaterHelpers.ts
 * Tests error classification, value change detection, field classification
 */
import { describe, it, expect } from 'vitest';
import {
  ErrorCategory,
  FieldUpdateError,
  hasValueChanged,
  classifyFieldForStreaming,
} from '../components/filliny-button/search-button/fieldUpdaterHelpers.js';

// ============================================================================
// ErrorCategory enum
// ============================================================================
describe('ErrorCategory', () => {
  it('should have all expected values', () => {
    expect(ErrorCategory.DETECTION_FAILED).toBe('detection_failed');
    expect(ErrorCategory.ELEMENT_NOT_FOUND).toBe('element_not_found');
    expect(ErrorCategory.UPDATE_FAILED).toBe('update_failed');
    expect(ErrorCategory.VERIFICATION_FAILED).toBe('verification_failed');
    expect(ErrorCategory.NETWORK_ERROR).toBe('network_error');
    expect(ErrorCategory.TIMEOUT).toBe('timeout');
  });
});

// ============================================================================
// FieldUpdateError
// ============================================================================
describe('FieldUpdateError', () => {
  it('should carry category, fieldId, and originalError', () => {
    const original = new Error('original');
    const err = new FieldUpdateError('fail', ErrorCategory.UPDATE_FAILED, 'field-1', original);

    expect(err.message).toBe('fail');
    expect(err.category).toBe(ErrorCategory.UPDATE_FAILED);
    expect(err.fieldId).toBe('field-1');
    expect(err.originalError).toBe(original);
    expect(err.name).toBe('FieldUpdateError');
    expect(err instanceof Error).toBe(true);
  });

  it('should work without originalError', () => {
    const err = new FieldUpdateError('not found', ErrorCategory.ELEMENT_NOT_FOUND, 'field-2');
    expect(err.originalError).toBeUndefined();
  });
});

// ============================================================================
// hasValueChanged
// ============================================================================
describe('hasValueChanged', () => {
  it('should return false for identical strings', () => {
    expect(hasValueChanged('hello', 'hello')).toBe(false);
  });

  it('should return true for different strings', () => {
    expect(hasValueChanged('hello', 'world')).toBe(true);
  });

  it('should return true when prev is undefined', () => {
    expect(hasValueChanged(undefined, 'hello')).toBe(true);
  });

  it('should return true when next is undefined', () => {
    expect(hasValueChanged('hello', undefined)).toBe(true);
  });

  it('should return false when both are undefined', () => {
    expect(hasValueChanged(undefined, undefined)).toBe(false);
  });

  it('should detect array changes', () => {
    expect(hasValueChanged(['a', 'b'], ['a', 'c'])).toBe(true);
  });

  it('should detect array length changes', () => {
    expect(hasValueChanged(['a'], ['a', 'b'])).toBe(true);
  });

  it('should return false for identical arrays', () => {
    expect(hasValueChanged(['a', 'b'], ['a', 'b'])).toBe(false);
  });
});

// ============================================================================
// classifyFieldForStreaming
// ============================================================================
describe('classifyFieldForStreaming', () => {
  it('should classify text types as text-like', () => {
    expect(classifyFieldForStreaming('text')).toBe('text-like');
    expect(classifyFieldForStreaming('email')).toBe('text-like');
    expect(classifyFieldForStreaming('password')).toBe('text-like');
    expect(classifyFieldForStreaming('tel')).toBe('text-like');
    expect(classifyFieldForStreaming('url')).toBe('text-like');
    expect(classifyFieldForStreaming('number')).toBe('text-like');
    expect(classifyFieldForStreaming('textarea')).toBe('text-like');
  });

  it('should classify choice types', () => {
    expect(classifyFieldForStreaming('select')).toBe('choice');
    expect(classifyFieldForStreaming('radio')).toBe('choice');
    expect(classifyFieldForStreaming('checkbox')).toBe('choice');
  });

  it('should classify file type', () => {
    expect(classifyFieldForStreaming('file')).toBe('file');
  });

  it('should default to text-like for unknown types', () => {
    expect(classifyFieldForStreaming('unknown')).toBe('text-like');
  });
});
