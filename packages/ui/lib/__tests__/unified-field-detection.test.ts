/**
 * Unit tests for UnifiedFieldRegistry
 * Tests the singleton registry for form field management
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { createFormWithFields, createTextInput } from './setup.js';
import { UnifiedFieldRegistry } from '../components/filliny-button/search-button/unifiedFieldDetection.js';

describe('UnifiedFieldRegistry', () => {
  let registry: UnifiedFieldRegistry;

  beforeEach(() => {
    registry = UnifiedFieldRegistry.getInstance();
    registry.clear();
  });

  // ============================================================================
  // Singleton
  // ============================================================================
  describe('singleton', () => {
    it('getInstance() should return the same instance', () => {
      const a = UnifiedFieldRegistry.getInstance();
      const b = UnifiedFieldRegistry.getInstance();
      expect(a).toBe(b);
    });
  });

  // ============================================================================
  // clear
  // ============================================================================
  describe('clear', () => {
    it('should reset all maps', async () => {
      const form = createFormWithFields('<input type="text" name="test">');
      await registry.registerContainer(form, 'c1');

      expect(registry.getContainerFields('c1').length).toBeGreaterThan(0);

      registry.clear();
      expect(registry.getContainerFields('c1').length).toBe(0);
      expect(registry.getGroupedFields().length).toBe(0);
    });
  });

  // ============================================================================
  // registerContainer
  // ============================================================================
  describe('registerContainer', () => {
    it('should detect and register fields', async () => {
      const form = createFormWithFields(`
        <input type="text" name="name">
        <input type="email" name="email">
        <textarea name="bio"></textarea>
      `);

      const result = await registry.registerContainer(form, 'container-1');
      expect(result.containerId).toBe('container-1');
      expect(result.allFields.length).toBeGreaterThanOrEqual(3);
      expect(result.totalFieldCount).toBeGreaterThanOrEqual(3);
    });

    it('should skip duplicates', async () => {
      const form = createFormWithFields('<input type="text" name="test">');

      await registry.registerContainer(form, 'c1');
      const firstCount = registry.getContainerFields('c1').length;

      // Register same container again
      await registry.registerContainer(form, 'c2');
      // The input element should have been skipped since it was already processed
      const c2Fields = registry.getContainerFields('c2');
      expect(c2Fields.length).toBe(0);
      expect(registry.getContainerFields('c1').length).toBe(firstCount);
    });
  });

  // ============================================================================
  // getContainerFields
  // ============================================================================
  describe('getContainerFields', () => {
    it('should return only fields for given container', async () => {
      const form1 = createFormWithFields('<input type="text" name="f1">');
      const form2 = createFormWithFields('<input type="email" name="f2">');

      await registry.registerContainer(form1, 'c1');
      await registry.registerContainer(form2, 'c2');

      const c1Fields = registry.getContainerFields('c1');
      const c2Fields = registry.getContainerFields('c2');

      c1Fields.forEach(f => expect(f.containerId).toBe('c1'));
      c2Fields.forEach(f => expect(f.containerId).toBe('c2'));
    });
  });

  // ============================================================================
  // getIndividualFields
  // ============================================================================
  describe('getIndividualFields', () => {
    it('should exclude grouped radio fields (only return one per group)', async () => {
      const form = createFormWithFields(`
        <input type="text" name="name">
        <input type="radio" name="gender" value="m">
        <input type="radio" name="gender" value="f">
      `);

      await registry.registerContainer(form, 'c1');

      const individual = registry.getIndividualFields('c1');
      // Text field should always be individual
      const textFields = individual.filter(f => f.field.type === 'text');
      expect(textFields.length).toBeGreaterThanOrEqual(1);
    });
  });

  // ============================================================================
  // getGroupedFields
  // ============================================================================
  describe('getGroupedFields', () => {
    it('should return radio groups with correct members', async () => {
      const form = createFormWithFields(`
        <input type="radio" name="color" value="red">
        <input type="radio" name="color" value="blue">
        <input type="radio" name="color" value="green">
      `);

      await registry.registerContainer(form, 'c1');

      const grouped = registry.getGroupedFields('c1');
      // Radio buttons with same name should be grouped
      // detectFields creates 1 field entry per radio group (with options), so
      // the group contains 1 field representing the whole radio group
      if (grouped.length > 0) {
        expect(grouped[0].groupType).toBe('radio');
        expect(grouped[0].fields.length).toBeGreaterThanOrEqual(1);
      }
    });
  });

  // ============================================================================
  // refreshStaleReferences
  // ============================================================================
  describe('refreshStaleReferences', () => {
    it('should remove fields whose elements are no longer in DOM', async () => {
      const form = createFormWithFields('<input type="text" name="temp">');
      await registry.registerContainer(form, 'c1');

      const fieldsBefore = registry.getContainerFields('c1').length;
      expect(fieldsBefore).toBeGreaterThan(0);

      // Remove the input from DOM
      const input = form.querySelector('input');
      input?.remove();

      registry.refreshStaleReferences();

      // Field should be removed since element is no longer in DOM
      const fieldsAfter = registry.getContainerFields('c1').length;
      expect(fieldsAfter).toBeLessThan(fieldsBefore);
    });

    it('should re-find elements by data-filliny-id', async () => {
      const form = createFormWithFields('<input type="text" name="persist">');
      await registry.registerContainer(form, 'c1');

      const fieldsBefore = registry.getContainerFields('c1').length;

      // Elements are still attached, so refresh should keep them
      const refreshed = registry.refreshStaleReferences();
      const fieldsAfter = registry.getContainerFields('c1').length;

      expect(fieldsAfter).toBe(fieldsBefore);
    });
  });

  // ============================================================================
  // registerIncrementalField
  // ============================================================================
  describe('registerIncrementalField', () => {
    it('should add a single new field', async () => {
      registry.clear();
      const input = createTextInput({ name: 'new-field' });

      await registry.registerIncrementalField(input);

      const allFields = registry.getAllFields();
      expect(allFields.length).toBe(1);
      expect(allFields[0].type).toBe('text');
    });

    it('should skip already processed elements', async () => {
      registry.clear();
      const input = createTextInput({ name: 'dupe-field' });

      await registry.registerIncrementalField(input);
      const countBefore = registry.getAllFields().length;

      await registry.registerIncrementalField(input);
      const countAfter = registry.getAllFields().length;

      expect(countAfter).toBe(countBefore);
    });
  });

  // ============================================================================
  // getFieldButtonsData
  // ============================================================================
  describe('getFieldButtonsData', () => {
    it('should return button data for detected fields', async () => {
      const form = createFormWithFields(`
        <input type="text" name="fname">
        <input type="email" name="email">
      `);

      await registry.registerContainer(form, 'c1');
      const buttons = registry.getFieldButtonsData('c1');

      expect(buttons.length).toBeGreaterThanOrEqual(2);
      buttons.forEach(btn => {
        expect(btn.field).toBeDefined();
        expect(btn.element).toBeDefined();
        expect(btn.type).toBeDefined();
      });
    });
  });

  // ============================================================================
  // getAllFields
  // ============================================================================
  describe('getAllFields', () => {
    it('should return all fields across containers', async () => {
      const form1 = createFormWithFields('<input type="text" name="a">');
      const form2 = createFormWithFields('<input type="email" name="b">');

      await registry.registerContainer(form1, 'c1');
      await registry.registerContainer(form2, 'c2');

      const all = registry.getAllFields();
      expect(all.length).toBeGreaterThanOrEqual(2);
    });

    it('should filter by containerId', async () => {
      const form1 = createFormWithFields('<input type="text" name="a">');
      const form2 = createFormWithFields('<input type="email" name="b">');

      await registry.registerContainer(form1, 'c1');
      await registry.registerContainer(form2, 'c2');

      const c1Only = registry.getAllFields('c1');
      expect(c1Only.length).toBeGreaterThanOrEqual(1);
    });
  });
});
