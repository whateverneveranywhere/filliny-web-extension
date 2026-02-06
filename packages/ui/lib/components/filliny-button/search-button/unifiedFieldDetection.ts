import { detectFields, isElementAttached, captureFormState, restoreFormState, createBaseField } from './field-types';
import { FieldSchema } from '@extension/shared';
import { z } from 'zod';
import type { FormStateSnapshot } from './field-types';
import type { Field } from '@extension/shared';

// ============================================================================
// Zod Schemas for unified field detection
// ============================================================================

/**
 * Detected field info schema
 */
const DetectedFieldInfoSchema = z.object({
  field: FieldSchema,
  container: z.custom<HTMLElement>(val => val instanceof HTMLElement, { message: 'Expected HTMLElement' }),
  containerId: z.string(),
  element: z.custom<HTMLElement | null>(val => val === null || val instanceof HTMLElement, {
    message: 'Expected HTMLElement or null',
  }),
  isGrouped: z.boolean(),
  groupId: z.string().optional(),
});

/**
 * Field option schema for grouped fields
 */
const GroupedFieldOptionSchema = z.object({
  value: z.string(),
  text: z.string(),
  selected: z.boolean(),
});

/**
 * Grouped field info schema
 */
export const GroupedFieldInfoSchema = z.object({
  groupId: z.string(),
  containerId: z.string(),
  groupType: z.enum(['radio', 'checkbox']),
  fields: z.array(DetectedFieldInfoSchema),
  options: z.array(GroupedFieldOptionSchema),
  container: z.custom<HTMLElement>(val => val instanceof HTMLElement, { message: 'Expected HTMLElement' }),
  primaryElement: z.custom<HTMLElement | null>(val => val === null || val instanceof HTMLElement, {
    message: 'Expected HTMLElement or null',
  }),
});

/**
 * Detected container info schema
 */
export const DetectedContainerInfoSchema = z.object({
  containerId: z.string(),
  container: z.custom<HTMLElement>(val => val instanceof HTMLElement, { message: 'Expected HTMLElement' }),
  allFields: z.array(FieldSchema),
  individualFields: z.array(DetectedFieldInfoSchema),
  groupedFields: z.array(GroupedFieldInfoSchema),
  totalFieldCount: z.number(),
});

/**
 * Field button data schema
 */
export const FieldButtonDataSchema = z.object({
  field: FieldSchema,
  element: z.custom<HTMLElement>(val => val instanceof HTMLElement, { message: 'Expected HTMLElement' }),
  type: z.enum(['individual', 'grouped']),
  groupId: z.string().optional(),
});

// ============================================================================
// Type Exports (inferred from schemas)
// ============================================================================

export type DetectedFieldInfo = z.infer<typeof DetectedFieldInfoSchema>;
export type GroupedFieldInfo = z.infer<typeof GroupedFieldInfoSchema>;
export type DetectedContainerInfo = z.infer<typeof DetectedContainerInfoSchema>;
export type FieldButtonData = z.infer<typeof FieldButtonDataSchema>;

// Performance limit: Maximum number of fields to process per container
const MAX_FIELDS_PER_CONTAINER = 100;

// Central field registry to ensure consistency across all strategies
export class UnifiedFieldRegistry {
  private static instance: UnifiedFieldRegistry;
  private detectedFields: Map<string, DetectedFieldInfo> = new Map();
  private containers: Map<string, HTMLElement> = new Map();
  private groupedFields: Map<string, GroupedFieldInfo> = new Map();
  private processedElements: Map<HTMLElement, string> = new Map();

  static getInstance(): UnifiedFieldRegistry {
    if (!UnifiedFieldRegistry.instance) {
      UnifiedFieldRegistry.instance = new UnifiedFieldRegistry();
    }
    return UnifiedFieldRegistry.instance;
  }

  // Clear all registry data
  clear(): void {
    this.detectedFields.clear();
    this.containers.clear();
    this.groupedFields.clear();
    this.processedElements.clear();
  }

  // Register a container and its fields
  async registerContainer(container: HTMLElement, containerId: string): Promise<DetectedContainerInfo> {
    console.log(`🔍 UnifiedFieldRegistry: Registering container ${containerId}`);

    this.containers.set(containerId, container);

    // Detect all fields in container with performance limit
    const allFields = await detectFields(container, false);
    const fields = allFields.slice(0, MAX_FIELDS_PER_CONTAINER);
    console.log(
      `📋 UnifiedFieldRegistry: Detected ${fields.length} fields in container ${containerId}${allFields.length > MAX_FIELDS_PER_CONTAINER ? ` (limited from ${allFields.length})` : ''}`,
    );

    // Register each field
    const individualFields: DetectedFieldInfo[] = [];
    const groupedFields: GroupedFieldInfo[] = [];

    for (const field of fields) {
      const element = this.findFieldElement(container, field);

      // Skip if element not found or already processed in another container
      if (!element || this.processedElements.has(element)) {
        if (element) {
          console.log(`UnifiedFieldRegistry: Skipping already processed element for field ${field.id}`);
        }
        continue;
      }

      const fieldInfo: DetectedFieldInfo = {
        field,
        container,
        containerId,
        element,
        isGrouped: this.isGroupedField(field),
        groupId: this.getGroupId(field),
      };

      this.detectedFields.set(field.id, fieldInfo);
      this.processedElements.set(element, field.id);

      if (fieldInfo.isGrouped) {
        this.handleGroupedField(fieldInfo, groupedFields);
      } else {
        individualFields.push(fieldInfo);
      }
    }

    return {
      containerId,
      container,
      allFields: fields,
      individualFields,
      groupedFields,
      totalFieldCount: fields.length,
    };
  }

  // Get all detected fields for a container
  getContainerFields(containerId: string): DetectedFieldInfo[] {
    return Array.from(this.detectedFields.values()).filter(info => info.containerId === containerId);
  }

  // Get all individual (non-grouped) fields for field buttons
  getIndividualFields(containerId?: string): DetectedFieldInfo[] {
    const fields = Array.from(this.detectedFields.values());
    return fields.filter(info => {
      const matchesContainer = !containerId || info.containerId === containerId;
      return matchesContainer && this.shouldHaveIndividualButton(info);
    });
  }

  // Get all grouped fields
  getGroupedFields(containerId?: string): GroupedFieldInfo[] {
    const groups = Array.from(this.groupedFields.values());
    return groups.filter(group => !containerId || group.containerId === containerId);
  }

  // Get field by ID
  getField(fieldId: string): DetectedFieldInfo | undefined {
    return this.detectedFields.get(fieldId);
  }

  // Get all fields for bulk operations
  getAllFields(containerId?: string): Field[] {
    const fields = Array.from(this.detectedFields.values());
    return fields.filter(info => !containerId || info.containerId === containerId).map(info => info.field);
  }

  // Get all registered container elements
  getRegisteredContainers(): HTMLElement[] {
    return Array.from(this.containers.values());
  }

  private findFieldElement(container: HTMLElement, field: Field): HTMLElement | null {
    // Try multiple strategies to find the element
    const strategies = [
      () => container.querySelector(`[data-filliny-id="${field.id}"]`) as HTMLElement,
      () => (field.uniqueSelectors?.length ? (container.querySelector(field.uniqueSelectors[0]) as HTMLElement) : null),
      () => (field.name ? (container.querySelector(`[name="${field.name}"]`) as HTMLElement) : null),
      () => (field.id && field.id !== field.name ? (container.querySelector(`#${field.id}`) as HTMLElement) : null),
    ];

    for (const strategy of strategies) {
      try {
        const element = strategy();
        if (element) return element;
      } catch {
        // Continue to next strategy
      }
    }

    console.warn(`⚠️ Could not find element for field ${field.id}`);
    return null;
  }

  private isGroupedField(field: Field): boolean {
    // Radio fields are ALWAYS grouped (even single radios conceptually belong to a group)
    // Checkbox fields are grouped if they have multiple options
    // Select fields are always individual (they handle their own options internally)
    return !!(field.type === 'radio' || (field.type === 'checkbox' && field.options && field.options.length > 1));
  }

  private getGroupId(field: Field): string | undefined {
    if (!this.isGroupedField(field)) return undefined;

    // For radio fields, use the name attribute or field ID as group identifier
    if (field.type === 'radio') {
      return field.name ? `radio-group-${field.name}` : `radio-group-${field.id}`;
    }

    // For checkbox groups, use similar logic
    if (field.type === 'checkbox' && field.options && field.options.length > 1) {
      return field.name ? `checkbox-group-${field.name}` : `checkbox-group-${field.id}`;
    }

    return undefined;
  }

  private shouldHaveIndividualButton(fieldInfo: DetectedFieldInfo): boolean {
    // Individual buttons should be created for:
    // 1. Non-grouped fields (text, select, single checkboxes, etc.)
    // 2. Single grouped fields (one button per group, not per option)
    if (!fieldInfo.isGrouped) {
      return true; // All non-grouped fields get buttons
    }

    // For grouped fields, only create one button per group
    // We'll identify the "primary" field in each group
    const groupId = fieldInfo.groupId!;
    const groupInfo = this.groupedFields.get(groupId);

    if (groupInfo) {
      // Only the first field in the group gets the button
      return groupInfo.fields[0].field.id === fieldInfo.field.id;
    }

    return false;
  }

  private handleGroupedField(fieldInfo: DetectedFieldInfo, groupedFields: GroupedFieldInfo[]): void {
    const groupId = fieldInfo.groupId!;

    if (!this.groupedFields.has(groupId)) {
      const groupInfo: GroupedFieldInfo = {
        groupId,
        containerId: fieldInfo.containerId,
        groupType: fieldInfo.field.type as 'radio' | 'checkbox',
        fields: [fieldInfo],
        options: fieldInfo.field.options || [],
        container: fieldInfo.container,
        primaryElement: fieldInfo.element, // The element that will get the button
      };

      this.groupedFields.set(groupId, groupInfo);
      groupedFields.push(groupInfo);
    } else {
      const existingGroup = this.groupedFields.get(groupId)!;
      existingGroup.fields.push(fieldInfo);

      // Update options if this field has more options
      if (fieldInfo.field.options && fieldInfo.field.options.length > existingGroup.options.length) {
        existingGroup.options = fieldInfo.field.options;
      }
    }
  }

  // Get individual field buttons data (including options from grouped fields)
  // Enhanced to ensure all fields get buttons with comprehensive fallback strategies
  getFieldButtonsData(containerId?: string): FieldButtonData[] {
    const buttonData: FieldButtonData[] = [];
    let processedCount = 0;
    let skippedCount = 0;

    console.log(`🔍 Getting field button data for container: ${containerId || 'all'}`);

    // Add individual (non-grouped) fields with enhanced element finding
    const individualFields = this.getIndividualFields(containerId);
    console.log(`📋 Found ${individualFields.length} individual fields`);

    for (const fieldInfo of individualFields) {
      let element = fieldInfo.element;

      // If no element found, try enhanced search strategies
      if (!element) {
        console.log(`🔍 No element found for field ${fieldInfo.field.id}, trying enhanced search...`);
        element = this.findFieldElementEnhanced(fieldInfo.container, fieldInfo.field);

        if (element) {
          // Update the field info with the found element
          fieldInfo.element = element;
          element.setAttribute('data-filliny-id', fieldInfo.field.id);
          console.log(`✅ Found element for field ${fieldInfo.field.id} using enhanced search`);
        }
      }

      if (element) {
        buttonData.push({
          field: fieldInfo.field,
          element: element,
          type: fieldInfo.isGrouped ? 'grouped' : 'individual',
          groupId: fieldInfo.groupId,
        });
        processedCount++;
        console.log(
          `✅ Added ${fieldInfo.isGrouped ? 'grouped' : 'individual'} field button: ${fieldInfo.field.id} (${fieldInfo.field.type})`,
        );
      } else {
        skippedCount++;
        console.warn(`⚠️ No element found for field: ${fieldInfo.field.id} after enhanced search`);
      }
    }

    // Add buttons for grouped fields (one button per group, not per option)
    const groupedFields = this.getGroupedFields(containerId);
    console.log(`📋 Found ${groupedFields.length} grouped fields`);

    for (const groupInfo of groupedFields) {
      // Find the best element to attach the button to
      let buttonElement: HTMLElement | null = null;

      // Strategy 1: Use the primary element if available
      if (groupInfo.primaryElement) {
        buttonElement = groupInfo.primaryElement;
      }

      // Strategy 2: Find the first available element in the group
      if (!buttonElement) {
        for (const fieldInfo of groupInfo.fields) {
          if (fieldInfo.element) {
            buttonElement = fieldInfo.element;
            break;
          }
        }
      }

      // Strategy 3: Try to find any element using enhanced search
      if (!buttonElement && groupInfo.fields.length > 0) {
        const firstField = groupInfo.fields[0];
        buttonElement = this.findFieldElementEnhanced(groupInfo.container, firstField.field);
      }

      if (buttonElement) {
        // Create one button for the entire group
        buttonData.push({
          field: groupInfo.fields[0].field, // Use the first field as representative
          element: buttonElement,
          type: 'grouped',
          groupId: groupInfo.groupId,
        });
        processedCount++;
        console.log(
          `✅ Added grouped field button: ${groupInfo.groupId} (${groupInfo.groupType}) with ${groupInfo.fields.length} fields`,
        );
      } else {
        skippedCount++;
        console.warn(`⚠️ No element found for grouped field: ${groupInfo.groupId}`);
      }
    }

    console.log(`📊 Field button summary: ${processedCount} processed, ${skippedCount} skipped`);

    // Enhanced logging for debugging
    const fieldTypes = buttonData.reduce(
      (acc, btn) => {
        const key = `${btn.field.type}${btn.type === 'grouped' ? ' (grouped)' : ''}`;
        acc[key] = (acc[key] || 0) + 1;
        return acc;
      },
      {} as Record<string, number>,
    );

    console.log(`📊 Button type distribution:`, fieldTypes);

    return buttonData;
  }

  // Refresh stale element references that are no longer attached to the DOM
  refreshStaleReferences(): number {
    let refreshedCount = 0;

    for (const [fieldId, fieldInfo] of this.detectedFields.entries()) {
      if (!fieldInfo.element || !isElementAttached(fieldInfo.element)) {
        // Element is stale, try to re-find by data-filliny-id
        const refound = document.querySelector<HTMLElement>(`[data-filliny-id="${fieldId}"]`);

        if (refound && isElementAttached(refound)) {
          // Update the reference in the registry
          fieldInfo.element = refound;

          // Update processedElements map
          // Remove old entry if it exists
          for (const [el, id] of this.processedElements.entries()) {
            if (id === fieldId) {
              this.processedElements.delete(el);
              break;
            }
          }
          this.processedElements.set(refound, fieldId);

          refreshedCount++;
          console.log(`Refreshed stale reference for field ${fieldId}`);
        } else {
          // Could not re-find, remove from registry
          this.detectedFields.delete(fieldId);

          // Clean up processedElements
          for (const [el, id] of this.processedElements.entries()) {
            if (id === fieldId) {
              this.processedElements.delete(el);
              break;
            }
          }

          console.log(`Removed stale field ${fieldId} (element no longer in DOM)`);
        }
      }
    }

    // Also refresh grouped field references
    for (const [groupId, groupInfo] of this.groupedFields.entries()) {
      if (groupInfo.primaryElement && !isElementAttached(groupInfo.primaryElement)) {
        // Try to find a new primary element from the group's fields
        const validField = groupInfo.fields.find(f => f.element && isElementAttached(f.element));
        if (validField?.element) {
          groupInfo.primaryElement = validField.element;
        } else {
          groupInfo.primaryElement = null;
        }
      }

      // Remove the group if it has no valid fields left
      const hasValidFields = groupInfo.fields.some(f => this.detectedFields.has(f.field.id));
      if (!hasValidFields) {
        this.groupedFields.delete(groupId);
        console.log(`Removed stale group ${groupId}`);
      }
    }

    return refreshedCount;
  }

  // Register a single new field discovered during conditional field re-detection
  async registerIncrementalField(element: HTMLElement, containerId?: string): Promise<void> {
    // Skip if already processed
    if (this.processedElements.has(element)) {
      console.log(`UnifiedFieldRegistry: Element already registered, skipping`);
      return;
    }

    // Determine the container
    const resolvedContainerId = containerId || 'default';
    const container = this.containers.get(resolvedContainerId) || element.closest('form') || document.body;

    if (!this.containers.has(resolvedContainerId)) {
      this.containers.set(resolvedContainerId, container as HTMLElement);
    }

    // Detect the field type for this single element using createBaseField
    const currentFieldCount = this.detectedFields.size;
    const field = await createBaseField(element, currentFieldCount, this.inferFieldType(element));

    const fieldInfo: DetectedFieldInfo = {
      field,
      container: container as HTMLElement,
      containerId: resolvedContainerId,
      element,
      isGrouped: this.isGroupedField(field),
      groupId: this.getGroupId(field),
    };

    this.detectedFields.set(field.id, fieldInfo);
    this.processedElements.set(element, field.id);

    if (fieldInfo.isGrouped) {
      const groupedFields: GroupedFieldInfo[] = [];
      this.handleGroupedField(fieldInfo, groupedFields);
    }

    console.log(`UnifiedFieldRegistry: Incrementally registered field ${field.id} (${field.type})`);
  }

  // Infer field type from an HTML element
  private inferFieldType(element: HTMLElement): string {
    if (element instanceof HTMLInputElement) {
      return element.type || 'text';
    }
    if (element instanceof HTMLSelectElement) {
      return 'select';
    }
    if (element instanceof HTMLTextAreaElement) {
      return 'textarea';
    }
    if (element.hasAttribute('contenteditable') && element.getAttribute('contenteditable') !== 'false') {
      return 'text';
    }
    const role = element.getAttribute('role');
    if (role === 'textbox' || role === 'searchbox') return 'text';
    if (role === 'combobox' || role === 'listbox') return 'select';
    if (role === 'checkbox') return 'checkbox';
    if (role === 'radio') return 'radio';
    if (role === 'switch') return 'checkbox';
    return 'text';
  }

  // Enhanced element finding with comprehensive fallback strategies
  private findFieldElementEnhanced(container: HTMLElement, field: Field): HTMLElement | null {
    const strategies = [
      // Strategy 1: Find by name attribute
      () => (field.name ? (container.querySelector(`[name="${field.name}"]`) as HTMLElement) : null),

      // Strategy 2: Find by label text matching
      () => {
        if (!field.label) return null;

        const labels = Array.from(container.querySelectorAll('label'));
        for (const label of labels) {
          const labelText = label.textContent?.trim().toLowerCase();
          const fieldLabel = field.label.trim().toLowerCase();

          if (labelText && (labelText === fieldLabel || labelText.includes(fieldLabel))) {
            const forAttr = label.getAttribute('for');
            if (forAttr) {
              const linkedElement = document.getElementById(forAttr) as HTMLElement;
              if (linkedElement) return linkedElement;
            }
            // Check if label contains a form element
            const formElement = label.querySelector('input, select, textarea, [contenteditable]');
            if (formElement) return formElement as HTMLElement;
          }
        }
        return null;
      },

      // Strategy 3: Find by placeholder text
      () =>
        field.placeholder ? (container.querySelector(`[placeholder="${field.placeholder}"]`) as HTMLElement) : null,

      // Strategy 4: Find by type and position
      () => {
        const typeSelectors = {
          text: 'input[type="text"], input:not([type])',
          email: 'input[type="email"]',
          password: 'input[type="password"]',
          tel: 'input[type="tel"]',
          url: 'input[type="url"]',
          number: 'input[type="number"]',
          date: 'input[type="date"]',
          'datetime-local': 'input[type="datetime-local"]',
          time: 'input[type="time"]',
          month: 'input[type="month"]',
          week: 'input[type="week"]',
          color: 'input[type="color"]',
          range: 'input[type="range"]',
          select: 'select',
          textarea: 'textarea',
          checkbox: 'input[type="checkbox"]',
          radio: 'input[type="radio"]',
          file: 'input[type="file"]',
        };

        const selector = typeSelectors[field.type as keyof typeof typeSelectors];
        if (selector) {
          const elements = container.querySelectorAll(selector);
          // Return the first element that doesn't already have a data-filliny-id
          return (Array.from(elements).find(el => !el.hasAttribute('data-filliny-id')) as HTMLElement) || null;
        }
        return null;
      },

      // Strategy 5: Find by ARIA attributes
      () => {
        const ariaSelectors = {
          text: '[role="textbox"]',
          select: '[role="combobox"], [role="listbox"]',
          checkbox: '[role="checkbox"]',
          radio: '[role="radio"]',
        };

        const selector = ariaSelectors[field.type as keyof typeof ariaSelectors];
        if (selector) {
          const elements = container.querySelectorAll(selector);
          return (Array.from(elements).find(el => !el.hasAttribute('data-filliny-id')) as HTMLElement) || null;
        }
        return null;
      },

      // Strategy 6: Find by content editable
      () =>
        field.type === 'text' || field.type === 'textarea'
          ? (container.querySelector('[contenteditable="true"]') as HTMLElement)
          : null,
    ];

    for (let i = 0; i < strategies.length; i++) {
      try {
        const element = strategies[i]();
        if (element) {
          console.log(`✅ Found field element using enhanced strategy ${i + 1} for ${field.id}`);
          return element;
        }
      } catch (error) {
        console.debug(`Enhanced strategy ${i + 1} failed for field ${field.id}:`, error);
      }
    }

    return null;
  }
}

// Types moved to top of file with Zod schemas

// Export singleton instance
const unifiedFieldRegistry = UnifiedFieldRegistry.getInstance();

// ============================================================================
// Form State Snapshot for Undo
// ============================================================================

// Store the last snapshot for undo capability
let lastFormStateSnapshot: FormStateSnapshot | null = null;

const refreshStaleReferences = (): number => unifiedFieldRegistry.refreshStaleReferences();

const registerIncrementalField = async (element: HTMLElement, containerId?: string): Promise<void> =>
  unifiedFieldRegistry.registerIncrementalField(element, containerId);

const saveFormSnapshot = (container: HTMLElement | Document): void => {
  lastFormStateSnapshot = captureFormState(container);
};

const undoFormFill = (): boolean => {
  if (lastFormStateSnapshot) {
    restoreFormState(lastFormStateSnapshot);
    lastFormStateSnapshot = null;
    return true;
  }
  return false;
};

export { unifiedFieldRegistry, refreshStaleReferences, registerIncrementalField, saveFormSnapshot, undoFormFill };
