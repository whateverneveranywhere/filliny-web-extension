/**
 * Field detection strategies
 *
 * This module contains strategies for detecting different types of form fields.
 * Each strategy implements the FieldDetectionStrategy interface.
 */

import { createBaseDetectedField, getFieldLabel } from '../core/field-detector';
import { isValidFormField } from '../core/utils';
import { FieldTypeEnum } from '@extension/shared';
import type { FieldDetectionStrategy, DetectedField } from '../core/types';

// ============================================================================
// STANDARD HTML FIELD STRATEGY
// ============================================================================

export class StandardHtmlFieldStrategy implements FieldDetectionStrategy {
  readonly name = 'standard-html';
  readonly priority = 100;

  async detect(container: HTMLElement): Promise<DetectedField[]> {
    const fields: DetectedField[] = [];

    // Standard form elements
    const selectors = [
      'input:not([type="hidden"]):not([type="submit"]):not([type="button"]):not([type="reset"])',
      'select',
      'textarea',
    ];

    for (const selector of selectors) {
      const elements = Array.from(container.querySelectorAll<HTMLElement>(selector));

      for (const element of elements) {
        if (!isValidFormField(element)) continue;

        const type = this.getFieldType(element);
        const confidence = this.calculateConfidence(element);

        const field = await createBaseDetectedField(element, type, confidence, this.name);

        field.label = await getFieldLabel(element);
        fields.push(field);
      }
    }

    return fields;
  }

  canHandle(element: HTMLElement): boolean {
    return (
      element instanceof HTMLInputElement ||
      element instanceof HTMLSelectElement ||
      element instanceof HTMLTextAreaElement
    );
  }

  private getFieldType(element: HTMLElement): string {
    if (element instanceof HTMLInputElement) {
      return element.type || FieldTypeEnum.TEXT;
    }
    if (element instanceof HTMLSelectElement) {
      return FieldTypeEnum.SELECT;
    }
    if (element instanceof HTMLTextAreaElement) {
      return FieldTypeEnum.TEXTAREA;
    }
    return 'unknown';
  }

  private calculateConfidence(element: HTMLElement): number {
    let confidence = 0.9; // High confidence for standard HTML elements

    // Boost confidence for elements with good accessibility
    if (element.getAttribute('aria-label') || element.id) {
      confidence += 0.05;
    }

    // Reduce confidence for hidden or disabled elements
    if (element.hasAttribute('disabled') || element.hasAttribute('readonly')) {
      confidence -= 0.2;
    }

    return Math.max(0, Math.min(1, confidence));
  }
}

// ============================================================================
// ARIA FIELD STRATEGY
// ============================================================================

export class AriaFieldStrategy implements FieldDetectionStrategy {
  readonly name = 'aria-fields';
  readonly priority = 90;

  async detect(container: HTMLElement): Promise<DetectedField[]> {
    const fields: DetectedField[] = [];

    const ariaRoles = ['textbox', 'combobox', 'checkbox', 'radio', 'switch', 'slider', 'spinbutton', 'searchbox'];

    for (const role of ariaRoles) {
      const elements = Array.from(container.querySelectorAll<HTMLElement>(`[role="${role}"]`));

      for (const element of elements) {
        if (!isValidFormField(element)) continue;

        const confidence = this.calculateConfidence(element, role);

        const field = await createBaseDetectedField(element, role, confidence, this.name);

        field.label = await getFieldLabel(element);
        fields.push(field);
      }
    }

    return fields;
  }

  canHandle(element: HTMLElement): boolean {
    const role = element.getAttribute('role');
    return !!(
      role && ['textbox', 'combobox', 'checkbox', 'radio', 'switch', 'slider', 'spinbutton', 'searchbox'].includes(role)
    );
  }

  private calculateConfidence(element: HTMLElement, role: string): number {
    let confidence = 0.85; // Good confidence for ARIA elements

    // Higher confidence for interactive roles
    if (['textbox', 'combobox', 'checkbox', 'radio'].includes(role)) {
      confidence += 0.05;
    }

    // Boost for proper ARIA implementation
    if (element.getAttribute('aria-label') || element.getAttribute('aria-labelledby')) {
      confidence += 0.05;
    }

    // Check for proper state management
    if (element.hasAttribute('aria-checked') || element.hasAttribute('aria-selected')) {
      confidence += 0.03;
    }

    return Math.max(0, Math.min(1, confidence));
  }
}

// ============================================================================
// CONTENT EDITABLE STRATEGY
// ============================================================================

export class ContentEditableStrategy implements FieldDetectionStrategy {
  readonly name = 'content-editable';
  readonly priority = 80;

  async detect(container: HTMLElement): Promise<DetectedField[]> {
    const fields: DetectedField[] = [];

    const elements = Array.from(
      container.querySelectorAll<HTMLElement>('[contenteditable="true"], [contenteditable=""]'),
    );

    for (const element of elements) {
      if (!isValidFormField(element)) continue;

      // Skip if it contains other form elements (likely a rich text editor)
      if (element.querySelector('input, select, textarea')) continue;

      const confidence = this.calculateConfidence(element);

      const field = await createBaseDetectedField(element, 'contenteditable', confidence, this.name);

      field.label = await getFieldLabel(element);
      field.value = element.textContent || '';
      fields.push(field);
    }

    return fields;
  }

  canHandle(element: HTMLElement): boolean {
    return element.isContentEditable;
  }

  private calculateConfidence(element: HTMLElement): number {
    let confidence = 0.75; // Medium confidence for contenteditable

    // Higher confidence for elements that look like form fields
    const className = element.className.toLowerCase();
    if (className.includes('input') || className.includes('field') || className.includes('editor')) {
      confidence += 0.1;
    }

    // Lower confidence for elements that might be rich text editors
    if (element.querySelector('div, p, span')) {
      confidence -= 0.2;
    }

    return Math.max(0, Math.min(1, confidence));
  }
}

// ============================================================================
// CUSTOM COMPONENT STRATEGY
// ============================================================================

export class CustomComponentStrategy implements FieldDetectionStrategy {
  readonly name = 'custom-components';
  readonly priority = 70;

  async detect(container: HTMLElement): Promise<DetectedField[]> {
    const fields: DetectedField[] = [];

    // Look for elements with form-like characteristics
    const candidates = Array.from(container.querySelectorAll<HTMLElement>('*')).filter(element =>
      this.looksLikeFormField(element),
    );

    for (const element of candidates) {
      if (!isValidFormField(element)) continue;

      const type = this.inferFieldType(element);
      const confidence = this.calculateConfidence(element);

      if (confidence < 0.5) continue; // Skip low-confidence detections

      const field = await createBaseDetectedField(element, type, confidence, this.name);

      field.label = await getFieldLabel(element);
      fields.push(field);
    }

    return fields;
  }

  canHandle(element: HTMLElement): boolean {
    return this.looksLikeFormField(element);
  }

  private looksLikeFormField(element: HTMLElement): boolean {
    // Skip standard form elements (handled by other strategies)
    if (this.isStandardFormElement(element)) return false;

    const className = element.className.toLowerCase();
    const id = element.id.toLowerCase();
    const dataAttrs = Array.from(element.attributes)
      .filter(attr => attr.name.startsWith('data-'))
      .map(attr => attr.name.toLowerCase());

    // Check for form-like class names
    const formClassPatterns = [
      'input',
      'field',
      'control',
      'form-control',
      'textbox',
      'select',
      'dropdown',
      'combobox',
      'checkbox',
      'radio',
    ];

    const hasFormClass = formClassPatterns.some(pattern => className.includes(pattern) || id.includes(pattern));

    // Check for form-like data attributes
    const hasFormData = dataAttrs.some(
      attr => attr.includes('field') || attr.includes('input') || attr.includes('form'),
    );

    // Check for interactive behavior
    const hasInteractiveBehavior =
      element.tabIndex >= 0 ||
      element.hasAttribute('onclick') ||
      element.hasAttribute('onfocus') ||
      element.hasAttribute('onchange');

    return hasFormClass || hasFormData || hasInteractiveBehavior;
  }

  private isStandardFormElement(element: HTMLElement): boolean {
    return (
      element instanceof HTMLInputElement ||
      element instanceof HTMLSelectElement ||
      element instanceof HTMLTextAreaElement ||
      element.hasAttribute('role')
    );
  }

  private inferFieldType(element: HTMLElement): string {
    const className = element.className.toLowerCase();
    const id = element.id.toLowerCase();

    // Infer type from class names or IDs
    if (className.includes('email') || id.includes('email')) return FieldTypeEnum.EMAIL;
    if (className.includes('password') || id.includes('password')) return FieldTypeEnum.PASSWORD;
    if (className.includes('phone') || id.includes('phone')) return FieldTypeEnum.TEL;
    if (className.includes('number') || id.includes('number')) return FieldTypeEnum.NUMBER;
    if (className.includes('date') || id.includes('date')) return FieldTypeEnum.DATE;
    if (className.includes('select') || className.includes('dropdown')) return FieldTypeEnum.SELECT;
    if (className.includes('checkbox')) return FieldTypeEnum.CHECKBOX;
    if (className.includes('radio')) return FieldTypeEnum.RADIO;

    return FieldTypeEnum.TEXT; // Default fallback
  }

  private calculateConfidence(element: HTMLElement): number {
    let confidence = 0.3; // Start with low confidence

    const className = element.className.toLowerCase();
    const id = element.id.toLowerCase();

    // Boost confidence for strong indicators
    const strongIndicators = ['input', 'field', 'control', 'form-control'];
    if (strongIndicators.some(indicator => className.includes(indicator) || id.includes(indicator))) {
      confidence += 0.3;
    }

    // Boost for accessibility attributes
    if (element.getAttribute('aria-label') || element.getAttribute('role')) {
      confidence += 0.2;
    }

    // Boost for interactive attributes
    if (element.tabIndex >= 0 || element.hasAttribute('onfocus')) {
      confidence += 0.1;
    }

    // Reduce confidence for elements that are likely not form fields
    if (element.tagName === 'DIV' && !className && !id) {
      confidence -= 0.2;
    }

    return Math.max(0, Math.min(1, confidence));
  }
}

// ============================================================================
// STRATEGY REGISTRY
// ============================================================================

/**
 * Get all built-in field detection strategies
 */
export const getBuiltInFieldStrategies = (): FieldDetectionStrategy[] => [
  new StandardHtmlFieldStrategy(),
  new AriaFieldStrategy(),
  new ContentEditableStrategy(),
  new CustomComponentStrategy(),
];
