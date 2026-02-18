/**
 * Standard field update strategies
 *
 * This module contains strategies for updating different types of form fields.
 * Each strategy implements the FieldUpdateStrategy interface.
 */

import type { FieldUpdateStrategy, DetectedField, UpdateResult } from '../core/types';
import type { FieldType } from '@extension/shared';

// ============================================================================
// TEXT FIELD UPDATER
// ============================================================================

export class TextFieldUpdater implements FieldUpdateStrategy {
  readonly name = 'text-field-updater';
  readonly supportedTypes: FieldType[] = ['text', 'email', 'password', 'tel', 'url', 'search', 'textarea'];

  canUpdate(field: DetectedField): boolean {
    return (
      this.supportedTypes.includes(field.type) &&
      (field.element instanceof HTMLInputElement || field.element instanceof HTMLTextAreaElement)
    );
  }

  async update(field: DetectedField, value: unknown): Promise<UpdateResult> {
    const stringValue = String(value || '');
    const element = field.element;

    try {
      // Format value based on field type
      const formattedValue = this.formatValue(stringValue, field.type);

      // Focus the element
      element.focus();

      // Clear existing value
      if (element instanceof HTMLInputElement || element instanceof HTMLTextAreaElement) {
        element.value = '';
        this.dispatchEvent(element, 'input');
      }

      // Simulate typing
      await this.simulateTyping(element, formattedValue);

      // Verify the value was set
      const actualValue =
        element instanceof HTMLInputElement || element instanceof HTMLTextAreaElement
          ? element.value
          : element.textContent || '';

      const success = actualValue === formattedValue;

      return {
        success,
        actualValue,
        strategy: this.name,
        error: success ? undefined : 'Value verification failed',
      };
    } catch (error) {
      return {
        success: false,
        strategy: this.name,
        error: (error as Error).message,
      };
    }
  }

  private formatValue(value: string, type: string): string {
    switch (type) {
      case 'email':
        if (!value.includes('@')) {
          return value.includes('.') ? `${value.split('.')[0]}@example.com` : `${value}@example.com`;
        }
        return value;

      case 'url':
        if (!value.match(/^https?:\/\//)) {
          return `https://${value.replace(/^(www\.)?/, 'www.')}`;
        }
        return value;

      case 'tel': {
        // Basic phone number formatting
        const digits = value.replace(/\D/g, '');
        if (digits.length < 10) {
          return '555' + digits.padEnd(7, '0');
        }
        return value;
      }

      default:
        return value;
    }
  }

  private async simulateTyping(element: HTMLElement, value: string): Promise<void> {
    // Set value directly first
    if (element instanceof HTMLInputElement || element instanceof HTMLTextAreaElement) {
      element.value = value;
    } else if (element.isContentEditable) {
      element.textContent = value;
    }

    // Dispatch events to trigger framework updates
    this.dispatchEvent(element, 'input');
    this.dispatchEvent(element, 'change');

    // For React and other frameworks, try additional events
    try {
      const inputEvent = new InputEvent('input', {
        bubbles: true,
        cancelable: true,
        data: value,
      });
      element.dispatchEvent(inputEvent);
    } catch {
      // Fallback for older browsers
    }

    // Blur to trigger validation
    element.blur();
  }

  private dispatchEvent(element: HTMLElement, eventType: string): void {
    const event = new Event(eventType, { bubbles: true, cancelable: true });
    element.dispatchEvent(event);
  }
}

// ============================================================================
// SELECT FIELD UPDATER
// ============================================================================

export class SelectFieldUpdater implements FieldUpdateStrategy {
  readonly name = 'select-field-updater';
  readonly supportedTypes: FieldType[] = ['select'];

  canUpdate(field: DetectedField): boolean {
    if (field.type !== 'select') return false;

    // Support native selects
    if (field.element instanceof HTMLSelectElement) return true;

    // Support custom select components (React Select, MUI, Headless UI, Radix, etc.)
    const role = field.element.getAttribute('role');
    if (role === 'combobox' || role === 'listbox') return true;

    // Support elements with select/dropdown class patterns
    const className = (field.element.className || '').toLowerCase();
    if (
      className.includes('select') ||
      className.includes('dropdown') ||
      className.includes('combobox') ||
      className.includes('picker')
    ) {
      return true;
    }

    // Support elements with select-related ARIA attributes
    if (
      field.element.getAttribute('aria-haspopup') === 'listbox' ||
      field.element.getAttribute('aria-expanded') !== null
    ) {
      return true;
    }

    return false;
  }

  async update(field: DetectedField, value: unknown): Promise<UpdateResult> {
    const stringValue = String(value || '');

    // For native selects, use the direct DOM approach
    if (field.element instanceof HTMLSelectElement) {
      return this.updateNativeSelect(field.element, stringValue);
    }

    // For custom selects, delegate to the comprehensive updateSelect handler
    // which handles React Select, MUI, Headless UI, Radix, ARIA, and more.
    // Import is handled at runtime to avoid circular dependencies.
    try {
      const { updateSelect } = await import('../field-types/select');
      await updateSelect(field.element, stringValue);
      return {
        success: true,
        actualValue: stringValue,
        strategy: this.name,
      };
    } catch (error) {
      return {
        success: false,
        strategy: this.name,
        error: (error as Error).message,
      };
    }
  }

  private updateNativeSelect(selectElement: HTMLSelectElement, stringValue: string): UpdateResult {
    try {
      const option = this.findMatchingOption(selectElement, stringValue);

      if (!option) {
        return {
          success: false,
          strategy: this.name,
          error: `No matching option found for value: ${stringValue}`,
        };
      }

      selectElement.value = option.value;
      option.selected = true;

      this.dispatchEvent(selectElement, 'change');
      this.dispatchEvent(selectElement, 'input');

      return {
        success: true,
        actualValue: selectElement.value,
        strategy: this.name,
      };
    } catch (error) {
      return {
        success: false,
        strategy: this.name,
        error: (error as Error).message,
      };
    }
  }

  private findMatchingOption(selectElement: HTMLSelectElement, value: string): HTMLOptionElement | null {
    const options = Array.from(selectElement.options);
    const normalizedValue = value.toLowerCase().trim();

    // Strategy 1: Exact value match
    for (const option of options) {
      if (option.value.toLowerCase() === normalizedValue) {
        return option;
      }
    }

    // Strategy 2: Exact text match
    for (const option of options) {
      if (option.text.toLowerCase().trim() === normalizedValue) {
        return option;
      }
    }

    // Strategy 3: Partial match
    for (const option of options) {
      const optionText = option.text.toLowerCase().trim();
      if (optionText.includes(normalizedValue) || normalizedValue.includes(optionText)) {
        return option;
      }
    }

    // Strategy 4: First non-placeholder option
    for (const option of options) {
      const text = option.text.toLowerCase().trim();
      if (
        !text.includes('select') &&
        !text.includes('choose') &&
        !text.includes('please') &&
        text.length > 0 &&
        option.value !== ''
      ) {
        return option;
      }
    }

    return null;
  }

  private dispatchEvent(element: HTMLElement, eventType: string): void {
    const event = new Event(eventType, { bubbles: true, cancelable: true });
    element.dispatchEvent(event);
  }
}

// ============================================================================
// CHECKBOX FIELD UPDATER
// ============================================================================

export class CheckboxFieldUpdater implements FieldUpdateStrategy {
  readonly name = 'checkbox-field-updater';
  readonly supportedTypes: FieldType[] = ['checkbox'];

  canUpdate(field: DetectedField): boolean {
    return (
      field.type === 'checkbox' &&
      (field.element instanceof HTMLInputElement || field.element.getAttribute('role') === 'checkbox')
    );
  }

  async update(field: DetectedField, value: unknown): Promise<UpdateResult> {
    const shouldCheck = this.parseCheckboxValue(value);
    const element = field.element;

    try {
      if (element instanceof HTMLInputElement && element.type === 'checkbox') {
        // Standard checkbox
        if (element.checked !== shouldCheck) {
          element.checked = shouldCheck;
          this.dispatchEvent(element, 'change');
          this.dispatchEvent(element, 'input');
        }
      } else if (element.getAttribute('role') === 'checkbox') {
        // ARIA checkbox
        element.setAttribute('aria-checked', shouldCheck ? 'true' : 'false');

        // Update visual state
        if (shouldCheck) {
          element.classList.add('checked', 'selected');
          element.classList.remove('unchecked');
        } else {
          element.classList.remove('checked', 'selected');
          element.classList.add('unchecked');
        }

        this.dispatchEvent(element, 'change');
      }

      return {
        success: true,
        actualValue: shouldCheck,
        strategy: this.name,
      };
    } catch (error) {
      return {
        success: false,
        strategy: this.name,
        error: (error as Error).message,
      };
    }
  }

  private parseCheckboxValue(value: unknown): boolean {
    if (typeof value === 'boolean') return value;
    if (typeof value === 'number') return value !== 0;
    if (typeof value === 'string') {
      const normalized = value.toLowerCase().trim();
      return ['true', 'yes', 'on', '1', 'checked', 'selected'].includes(normalized);
    }
    if (Array.isArray(value)) return value.length > 0;
    return !!value;
  }

  private dispatchEvent(element: HTMLElement, eventType: string): void {
    const event = new Event(eventType, { bubbles: true, cancelable: true });
    element.dispatchEvent(event);
  }
}

// ============================================================================
// RADIO FIELD UPDATER
// ============================================================================

export class RadioFieldUpdater implements FieldUpdateStrategy {
  readonly name = 'radio-field-updater';
  readonly supportedTypes: FieldType[] = ['radio'];

  canUpdate(field: DetectedField): boolean {
    return (
      field.type === 'radio' &&
      (field.element instanceof HTMLInputElement || field.element.getAttribute('role') === 'radio')
    );
  }

  async update(field: DetectedField, value: unknown): Promise<UpdateResult> {
    const stringValue = String(value || '');
    const element = field.element;

    try {
      // Find the radio button that matches the value
      const targetRadio = this.findMatchingRadio(element, stringValue);

      if (!targetRadio) {
        return {
          success: false,
          strategy: this.name,
          error: `No matching radio option found for value: ${stringValue}`,
        };
      }

      // Uncheck other radios in the group
      const relatedRadios = this.findRelatedRadios(targetRadio);
      for (const radio of relatedRadios) {
        if (radio !== targetRadio) {
          if (radio instanceof HTMLInputElement) {
            radio.checked = false;
          } else {
            radio.setAttribute('aria-checked', 'false');
            radio.classList.remove('checked', 'selected');
          }
        }
      }

      // Check the target radio
      if (targetRadio instanceof HTMLInputElement) {
        targetRadio.checked = true;
        this.dispatchEvent(targetRadio, 'change');
      } else {
        targetRadio.setAttribute('aria-checked', 'true');
        targetRadio.classList.add('checked', 'selected');
        this.dispatchEvent(targetRadio, 'change');
      }

      return {
        success: true,
        actualValue: stringValue,
        strategy: this.name,
      };
    } catch (error) {
      return {
        success: false,
        strategy: this.name,
        error: (error as Error).message,
      };
    }
  }

  private findMatchingRadio(element: HTMLElement, value: string): HTMLElement | null {
    const relatedRadios = this.findRelatedRadios(element);
    const normalizedValue = value.toLowerCase().trim();

    // Strategy 1: Exact value match
    for (const radio of relatedRadios) {
      const radioValue = radio instanceof HTMLInputElement ? radio.value : radio.getAttribute('value') || '';

      if (radioValue.toLowerCase() === normalizedValue) {
        return radio;
      }
    }

    // Strategy 2: Label text match
    for (const radio of relatedRadios) {
      const label = this.getRadioLabel(radio);
      if (label.toLowerCase().trim() === normalizedValue) {
        return radio;
      }
    }

    // Strategy 3: Partial match
    for (const radio of relatedRadios) {
      const label = this.getRadioLabel(radio);
      if (label.toLowerCase().includes(normalizedValue) || normalizedValue.includes(label.toLowerCase())) {
        return radio;
      }
    }

    return null;
  }

  private findRelatedRadios(element: HTMLElement): HTMLElement[] {
    const radios: HTMLElement[] = [];

    if (element instanceof HTMLInputElement && element.name) {
      // Find by name attribute
      const form = element.form || document;
      const sameNameRadios = form.querySelectorAll<HTMLInputElement>(`input[type="radio"][name="${element.name}"]`);
      radios.push(...Array.from(sameNameRadios));
    } else {
      // Find by container or role
      const container = element.closest('[role="radiogroup"], fieldset') || element.parentElement;
      if (container) {
        const containerRadios = container.querySelectorAll<HTMLElement>('input[type="radio"], [role="radio"]');
        radios.push(...Array.from(containerRadios));
      }
    }

    return radios.length > 0 ? radios : [element];
  }

  private getRadioLabel(element: HTMLElement): string {
    // Try various methods to get the label
    const ariaLabel = element.getAttribute('aria-label');
    if (ariaLabel) return ariaLabel;

    const labelledBy = element.getAttribute('aria-labelledby');
    if (labelledBy) {
      const labelElement = document.getElementById(labelledBy);
      if (labelElement) return labelElement.textContent || '';
    }

    if (element.id) {
      const label = document.querySelector(`label[for="${element.id}"]`);
      if (label) return label.textContent || '';
    }

    const parentLabel = element.closest('label');
    if (parentLabel) return parentLabel.textContent || '';

    return '';
  }

  private dispatchEvent(element: HTMLElement, eventType: string): void {
    const event = new Event(eventType, { bubbles: true, cancelable: true });
    element.dispatchEvent(event);
  }
}

// ============================================================================
// FILE FIELD UPDATER
// ============================================================================

export class FileFieldUpdater implements FieldUpdateStrategy {
  readonly name = 'file-field-updater';
  readonly supportedTypes: FieldType[] = ['file'];

  canUpdate(field: DetectedField): boolean {
    return field.type === 'file' && field.element instanceof HTMLInputElement && field.element.type === 'file';
  }

  async update(field: DetectedField): Promise<UpdateResult> {
    // File inputs cannot be programmatically set for security reasons
    // We can only trigger the file picker or provide visual feedback

    const element = field.element as HTMLInputElement;

    try {
      // Trigger file picker
      element.click();

      return {
        success: true,
        actualValue: 'File picker opened',
        strategy: this.name,
      };
    } catch (error) {
      return {
        success: false,
        strategy: this.name,
        error: (error as Error).message,
      };
    }
  }
}

// ============================================================================
// STRATEGY REGISTRY
// ============================================================================

/**
 * Get all built-in field update strategies
 */
export const getBuiltInFieldUpdaters = (): FieldUpdateStrategy[] => [
  new TextFieldUpdater(),
  new SelectFieldUpdater(),
  new CheckboxFieldUpdater(),
  new RadioFieldUpdater(),
  new FileFieldUpdater(),
];
