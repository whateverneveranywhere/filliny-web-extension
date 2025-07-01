import { detectFields } from "./field-types";
import type { Field } from "@extension/shared";

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

    // Detect all fields in container
    const fields = await detectFields(container, false);
    console.log(`📋 UnifiedFieldRegistry: Detected ${fields.length} fields in container ${containerId}`);

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
    return !!(field.type === "radio" || (field.type === "checkbox" && field.options && field.options.length > 1));
  }

  private getGroupId(field: Field): string | undefined {
    if (!this.isGroupedField(field)) return undefined;

    // For radio fields, use the name attribute or field ID as group identifier
    if (field.type === "radio") {
      return field.name ? `radio-group-${field.name}` : `radio-group-${field.id}`;
    }

    // For checkbox groups, use similar logic
    if (field.type === "checkbox" && field.options && field.options.length > 1) {
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
        groupType: fieldInfo.field.type as "radio" | "checkbox",
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

    console.log(`🔍 Getting field button data for container: ${containerId || "all"}`);

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
          element.setAttribute("data-filliny-id", fieldInfo.field.id);
          console.log(`✅ Found element for field ${fieldInfo.field.id} using enhanced search`);
        }
      }

      if (element) {
        buttonData.push({
          field: fieldInfo.field,
          element: element,
          type: fieldInfo.isGrouped ? "grouped" : "individual",
          groupId: fieldInfo.groupId,
        });
        processedCount++;
        console.log(
          `✅ Added ${fieldInfo.isGrouped ? "grouped" : "individual"} field button: ${fieldInfo.field.id} (${fieldInfo.field.type})`,
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
          type: "grouped",
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
        const key = `${btn.field.type}${btn.type === "grouped" ? " (grouped)" : ""}`;
        acc[key] = (acc[key] || 0) + 1;
        return acc;
      },
      {} as Record<string, number>,
    );

    console.log(`📊 Button type distribution:`, fieldTypes);

    return buttonData;
  }

  // Enhanced element finding with comprehensive fallback strategies
  private findFieldElementEnhanced(container: HTMLElement, field: Field): HTMLElement | null {
    const strategies = [
      // Strategy 1: Find by name attribute
      () => (field.name ? (container.querySelector(`[name="${field.name}"]`) as HTMLElement) : null),

      // Strategy 2: Find by label text matching
      () => {
        if (!field.label) return null;

        const labels = Array.from(container.querySelectorAll("label"));
        for (const label of labels) {
          const labelText = label.textContent?.trim().toLowerCase();
          const fieldLabel = field.label.trim().toLowerCase();

          if (labelText && (labelText === fieldLabel || labelText.includes(fieldLabel))) {
            const forAttr = label.getAttribute("for");
            if (forAttr) {
              const linkedElement = document.getElementById(forAttr) as HTMLElement;
              if (linkedElement) return linkedElement;
            }
            // Check if label contains a form element
            const formElement = label.querySelector("input, select, textarea, [contenteditable]");
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
          "datetime-local": 'input[type="datetime-local"]',
          time: 'input[type="time"]',
          month: 'input[type="month"]',
          week: 'input[type="week"]',
          color: 'input[type="color"]',
          range: 'input[type="range"]',
          select: "select",
          textarea: "textarea",
          checkbox: 'input[type="checkbox"]',
          radio: 'input[type="radio"]',
          file: 'input[type="file"]',
        };

        const selector = typeSelectors[field.type as keyof typeof typeSelectors];
        if (selector) {
          const elements = container.querySelectorAll(selector);
          // Return the first element that doesn't already have a data-filliny-id
          return (Array.from(elements).find(el => !el.hasAttribute("data-filliny-id")) as HTMLElement) || null;
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
          return (Array.from(elements).find(el => !el.hasAttribute("data-filliny-id")) as HTMLElement) || null;
        }
        return null;
      },

      // Strategy 6: Find by content editable
      () =>
        field.type === "text" || field.type === "textarea"
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

// Types for the unified system
export interface DetectedFieldInfo {
  field: Field;
  container: HTMLElement;
  containerId: string;
  element: HTMLElement | null;
  isGrouped: boolean;
  groupId?: string;
}

export interface GroupedFieldInfo {
  groupId: string;
  containerId: string;
  groupType: "radio" | "checkbox";
  fields: DetectedFieldInfo[];
  options: Array<{ value: string; text: string; selected: boolean }>;
  container: HTMLElement;
  primaryElement: HTMLElement | null;
}

export interface DetectedContainerInfo {
  containerId: string;
  container: HTMLElement;
  allFields: Field[];
  individualFields: DetectedFieldInfo[];
  groupedFields: GroupedFieldInfo[];
  totalFieldCount: number;
}

export interface FieldButtonData {
  field: Field;
  element: HTMLElement;
  type: "individual" | "grouped";
  groupId?: string;
}

// Export singleton instance
export const unifiedFieldRegistry = UnifiedFieldRegistry.getInstance();
