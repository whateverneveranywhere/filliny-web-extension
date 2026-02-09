/**
 * Unit tests for formFillStore.ts
 * Tests Zustand vanilla store for form fill state management
 */
import { describe, it, expect, beforeEach } from 'vitest';
import {
  formFillStore,
  selectProgress,
  selectIsStreaming,
  selectIsFinalizing,
  FieldFillStatus,
  StreamingPhase,
} from '../components/filliny-button/search-button/stores/formFillStore.js';

describe('formFillStore', () => {
  beforeEach(() => {
    formFillStore.getState().reset();
  });

  // ============================================================================
  // initSession
  // ============================================================================
  describe('initSession', () => {
    it('should set phase to STREAMING and create field entries', () => {
      formFillStore.getState().initSession([
        { id: 'f1', label: 'Field 1' },
        { id: 'f2', label: 'Field 2' },
        { id: 'f3', label: 'Field 3' },
      ]);

      const state = formFillStore.getState();
      expect(state.phase).toBe(StreamingPhase.STREAMING);
      expect(Object.keys(state.fields).length).toBe(3);
      expect(state.fields['f1'].status).toBe(FieldFillStatus.PENDING);
      expect(state.fields['f1'].currentValue).toBeUndefined();
      expect(state.fields['f1'].isValueStable).toBe(false);
    });

    it('should reset lastPartialObject on init', () => {
      formFillStore.getState().setLastPartialObject({ key: 'val' });
      formFillStore.getState().initSession([{ id: 'f1', label: 'Field 1' }]);
      expect(formFillStore.getState().lastPartialObject).toBeNull();
    });
  });

  // ============================================================================
  // updateFieldValue
  // ============================================================================
  describe('updateFieldValue', () => {
    it('should update currentValue and set previousValue', () => {
      formFillStore.getState().initSession([{ id: 'f1', label: 'Field 1' }]);
      formFillStore.getState().updateFieldValue('f1', 'hello');

      const field = formFillStore.getState().fields['f1'];
      expect(field.currentValue).toBe('hello');
      expect(field.previousValue).toBeUndefined();
      expect(field.status).toBe(FieldFillStatus.STREAMING);
      expect(field.isValueStable).toBe(false);
    });

    it('should set previousValue on second update', () => {
      formFillStore.getState().initSession([{ id: 'f1', label: 'Field 1' }]);
      formFillStore.getState().updateFieldValue('f1', 'first');
      formFillStore.getState().updateFieldValue('f1', 'second');

      const field = formFillStore.getState().fields['f1'];
      expect(field.currentValue).toBe('second');
      expect(field.previousValue).toBe('first');
    });

    it('should ignore update for unknown field id', () => {
      formFillStore.getState().initSession([{ id: 'f1', label: 'Field 1' }]);
      formFillStore.getState().updateFieldValue('unknown', 'val');
      expect(formFillStore.getState().fields['unknown']).toBeUndefined();
    });
  });

  // ============================================================================
  // markFieldStable
  // ============================================================================
  describe('markFieldStable', () => {
    it('should set isValueStable to true', () => {
      formFillStore.getState().initSession([{ id: 'f1', label: 'Field 1' }]);
      formFillStore.getState().markFieldStable('f1');
      expect(formFillStore.getState().fields['f1'].isValueStable).toBe(true);
    });
  });

  // ============================================================================
  // markFieldFilled
  // ============================================================================
  describe('markFieldFilled', () => {
    it('should set status to FILLED and isValueStable to true', () => {
      formFillStore.getState().initSession([{ id: 'f1', label: 'Field 1' }]);
      formFillStore.getState().markFieldFilled('f1');

      const field = formFillStore.getState().fields['f1'];
      expect(field.status).toBe(FieldFillStatus.FILLED);
      expect(field.isValueStable).toBe(true);
    });
  });

  // ============================================================================
  // markFieldVerified
  // ============================================================================
  describe('markFieldVerified', () => {
    it('should set status to VERIFIED', () => {
      formFillStore.getState().initSession([{ id: 'f1', label: 'Field 1' }]);
      formFillStore.getState().markFieldVerified('f1');
      expect(formFillStore.getState().fields['f1'].status).toBe(FieldFillStatus.VERIFIED);
    });
  });

  // ============================================================================
  // markFieldError
  // ============================================================================
  describe('markFieldError', () => {
    it('should set status to ERROR with message', () => {
      formFillStore.getState().initSession([{ id: 'f1', label: 'Field 1' }]);
      formFillStore.getState().markFieldError('f1', 'Element not found');

      const field = formFillStore.getState().fields['f1'];
      expect(field.status).toBe(FieldFillStatus.ERROR);
      expect(field.errorMessage).toBe('Element not found');
    });
  });

  // ============================================================================
  // setPhase
  // ============================================================================
  describe('setPhase', () => {
    it('should update the phase', () => {
      formFillStore.getState().setPhase(StreamingPhase.FINALIZING);
      expect(formFillStore.getState().phase).toBe(StreamingPhase.FINALIZING);
    });
  });

  // ============================================================================
  // reset
  // ============================================================================
  describe('reset', () => {
    it('should return to initial state', () => {
      formFillStore.getState().initSession([
        { id: 'f1', label: 'Field 1' },
        { id: 'f2', label: 'Field 2' },
      ]);
      formFillStore.getState().updateFieldValue('f1', 'val');
      formFillStore.getState().setPhase(StreamingPhase.COMPLETE);

      formFillStore.getState().reset();

      const state = formFillStore.getState();
      expect(state.phase).toBe(StreamingPhase.IDLE);
      expect(Object.keys(state.fields).length).toBe(0);
      expect(state.lastPartialObject).toBeNull();
    });
  });
});

// ============================================================================
// Selectors
// ============================================================================
describe('selectProgress', () => {
  beforeEach(() => {
    formFillStore.getState().reset();
  });

  it('should compute correct progress counters', () => {
    formFillStore.getState().initSession([
      { id: 'f1', label: 'Field 1' },
      { id: 'f2', label: 'Field 2' },
      { id: 'f3', label: 'Field 3' },
    ]);
    formFillStore.getState().updateFieldValue('f1', 'val1');
    formFillStore.getState().markFieldFilled('f1');
    formFillStore.getState().markFieldVerified('f2');
    formFillStore.getState().markFieldError('f3', 'fail');

    const progress = selectProgress(formFillStore.getState());
    expect(progress.totalFields).toBe(3);
    expect(progress.fieldsWithValues).toBe(1); // only f1 has a value set
    expect(progress.fieldsFilled).toBe(2); // f1 FILLED + f2 VERIFIED
    expect(progress.fieldsVerified).toBe(1); // only f2
    expect(progress.fieldsErrored).toBe(1); // only f3
  });
});

describe('selectIsStreaming', () => {
  beforeEach(() => {
    formFillStore.getState().reset();
  });

  it('should return true when phase is STREAMING', () => {
    formFillStore.getState().setPhase(StreamingPhase.STREAMING);
    expect(selectIsStreaming(formFillStore.getState())).toBe(true);
  });

  it('should return false when phase is not STREAMING', () => {
    formFillStore.getState().setPhase(StreamingPhase.IDLE);
    expect(selectIsStreaming(formFillStore.getState())).toBe(false);
  });
});

describe('selectIsFinalizing', () => {
  beforeEach(() => {
    formFillStore.getState().reset();
  });

  it('should return true when phase is FINALIZING', () => {
    formFillStore.getState().setPhase(StreamingPhase.FINALIZING);
    expect(selectIsFinalizing(formFillStore.getState())).toBe(true);
  });

  it('should return false when phase is not FINALIZING', () => {
    formFillStore.getState().setPhase(StreamingPhase.COMPLETE);
    expect(selectIsFinalizing(formFillStore.getState())).toBe(false);
  });
});
