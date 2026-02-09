/**
 * Framework-specific detection strategies
 *
 * This module contains strategies for detecting form fields in specific JavaScript frameworks.
 * These strategies understand framework-specific patterns and components.
 */

import { createBaseDetectedField, getFieldLabel } from '../core/field-detector';
import { isValidFormField, detectFramework } from '../core/utils';
import { Framework } from '@extension/shared';
import type { FieldDetectionStrategy, DetectedField } from '../core/types';

// ============================================================================
// REACT FIELD STRATEGY
// ============================================================================

export class ReactFieldStrategy implements FieldDetectionStrategy {
  readonly name = 'react-fields';
  readonly priority = 85;

  async detect(container: HTMLElement): Promise<DetectedField[]> {
    const fields: DetectedField[] = [];

    // Only run if React is detected
    const framework = detectFramework(container);
    if (framework.framework !== Framework.REACT) return fields;

    // Look for React-specific patterns
    const reactPatterns = [
      // React component class patterns
      '[class*="react-"]',
      '[class*="React"]',
      // Common React form library patterns
      '[class*="formik"]',
      '[class*="react-hook-form"]',
      '[class*="final-form"]',
      // Material-UI React components
      '[class*="MuiTextField"]',
      '[class*="MuiSelect"]',
      '[class*="MuiCheckbox"]',
      '[class*="MuiRadio"]',
      // Ant Design React components
      '[class*="ant-input"]',
      '[class*="ant-select"]',
      '[class*="ant-checkbox"]',
      '[class*="ant-radio"]',
      // Chakra UI components
      '[class*="chakra-input"]',
      '[class*="chakra-select"]',
    ];

    for (const pattern of reactPatterns) {
      try {
        const elements = Array.from(container.querySelectorAll<HTMLElement>(pattern));

        for (const element of elements) {
          if (!isValidFormField(element)) continue;

          // Skip if already detected by standard strategies
          if (this.isStandardFormElement(element)) continue;

          const field = await this.analyzeReactComponent(element);
          if (field) {
            fields.push(field);
          }
        }
      } catch (error) {
        console.debug(`React pattern failed: ${pattern}`, error);
      }
    }

    // Look for React Fiber properties
    const elementsWithFiber = this.findElementsWithReactFiber(container);
    for (const element of elementsWithFiber) {
      if (!isValidFormField(element)) continue;
      if (this.isStandardFormElement(element)) continue;

      const field = await this.analyzeReactComponent(element);
      if (field) {
        fields.push(field);
      }
    }

    return fields;
  }

  canHandle(element: HTMLElement): boolean {
    const framework = detectFramework(element);
    return framework.framework === Framework.REACT && framework.confidence > 0.5;
  }

  private async analyzeReactComponent(element: HTMLElement): Promise<DetectedField | null> {
    const type = this.inferReactFieldType(element);
    const confidence = this.calculateReactConfidence(element);

    if (confidence < 0.6) return null;

    const field = await createBaseDetectedField(element, type, confidence, this.name);

    field.label = await getFieldLabel(element);
    field.metadata.framework = Framework.REACT;
    field.metadata.component = this.detectReactComponent(element);

    return field;
  }

  private findElementsWithReactFiber(container: HTMLElement): HTMLElement[] {
    const elements: HTMLElement[] = [];
    const walker = document.createTreeWalker(container, NodeFilter.SHOW_ELEMENT, null);

    let node = walker.nextNode();
    while (node) {
      const element = node as HTMLElement;
      if (this.hasReactFiber(element)) {
        elements.push(element);
      }
      node = walker.nextNode();
    }

    return elements;
  }

  private hasReactFiber(element: HTMLElement): boolean {
    const keys = Object.keys(element);
    return keys.some(key => key.startsWith('__reactFiber') || key.startsWith('__reactInternalInstance'));
  }

  private inferReactFieldType(element: HTMLElement): string {
    const className = element.className.toLowerCase();

    // Material-UI patterns
    if (className.includes('muitextfield')) return 'text';
    if (className.includes('muiselect')) return 'select';
    if (className.includes('muicheckbox')) return 'checkbox';
    if (className.includes('muiradio')) return 'radio';

    // Ant Design patterns
    if (className.includes('ant-input')) return 'text';
    if (className.includes('ant-select')) return 'select';
    if (className.includes('ant-checkbox')) return 'checkbox';
    if (className.includes('ant-radio')) return 'radio';

    // Generic patterns
    if (className.includes('input')) return 'text';
    if (className.includes('select') || className.includes('dropdown')) return 'select';
    if (className.includes('checkbox')) return 'checkbox';
    if (className.includes('radio')) return 'radio';

    return 'text';
  }

  private calculateReactConfidence(element: HTMLElement): number {
    let confidence = 0.6; // Base confidence for React components

    // Higher confidence for known component libraries
    const className = element.className.toLowerCase();
    if (className.includes('mui') || className.includes('ant-') || className.includes('chakra-')) {
      confidence += 0.2;
    }

    // Boost for React Fiber presence
    if (this.hasReactFiber(element)) {
      confidence += 0.1;
    }

    // Boost for form library patterns
    if (className.includes('formik') || className.includes('react-hook-form')) {
      confidence += 0.15;
    }

    return Math.max(0, Math.min(1, confidence));
  }

  private detectReactComponent(element: HTMLElement): string {
    const className = element.className.toLowerCase();

    if (className.includes('muitextfield')) return 'MuiTextField';
    if (className.includes('muiselect')) return 'MuiSelect';
    if (className.includes('ant-input')) return 'AntInput';
    if (className.includes('ant-select')) return 'AntSelect';
    if (className.includes('chakra-input')) return 'ChakraInput';

    return 'ReactComponent';
  }

  private isStandardFormElement(element: HTMLElement): boolean {
    return (
      element instanceof HTMLInputElement ||
      element instanceof HTMLSelectElement ||
      element instanceof HTMLTextAreaElement ||
      element.hasAttribute('role')
    );
  }
}

// ============================================================================
// ANGULAR FIELD STRATEGY
// ============================================================================

export class AngularFieldStrategy implements FieldDetectionStrategy {
  readonly name = 'angular-fields';
  readonly priority = 85;

  async detect(container: HTMLElement): Promise<DetectedField[]> {
    const fields: DetectedField[] = [];

    // Only run if Angular is detected
    const framework = detectFramework(container);
    if (framework.framework !== Framework.ANGULAR) return fields;

    // Look for Angular-specific patterns
    const angularPatterns = [
      '[ng-model]',
      '[formControlName]',
      '[formControl]',
      '[ngModel]',
      '[(ngModel)]',
      '[class*="mat-"]', // Angular Material
      '[class*="ng-"]',
    ];

    for (const pattern of angularPatterns) {
      try {
        const elements = Array.from(container.querySelectorAll<HTMLElement>(pattern));

        for (const element of elements) {
          if (!isValidFormField(element)) continue;

          const field = await this.analyzeAngularComponent(element);
          if (field) {
            fields.push(field);
          }
        }
      } catch (error) {
        console.debug(`Angular pattern failed: ${pattern}`, error);
      }
    }

    return fields;
  }

  canHandle(element: HTMLElement): boolean {
    const framework = detectFramework(element);
    return framework.framework === Framework.ANGULAR && framework.confidence > 0.5;
  }

  private async analyzeAngularComponent(element: HTMLElement): Promise<DetectedField | null> {
    const type = this.inferAngularFieldType(element);
    const confidence = this.calculateAngularConfidence(element);

    if (confidence < 0.6) return null;

    const field = await createBaseDetectedField(element, type, confidence, this.name);

    field.label = await getFieldLabel(element);
    field.metadata.framework = Framework.ANGULAR;
    field.metadata.component = this.detectAngularComponent(element);

    return field;
  }

  private inferAngularFieldType(element: HTMLElement): string {
    const className = element.className.toLowerCase();

    // Angular Material patterns
    if (className.includes('mat-input')) return 'text';
    if (className.includes('mat-select')) return 'select';
    if (className.includes('mat-checkbox')) return 'checkbox';
    if (className.includes('mat-radio')) return 'radio';

    // Check form control attributes
    if (element.hasAttribute('type')) {
      return element.getAttribute('type') || 'text';
    }

    return 'text';
  }

  private calculateAngularConfidence(element: HTMLElement): number {
    let confidence = 0.7; // Base confidence for Angular components

    // Higher confidence for Angular Material
    if (element.className.toLowerCase().includes('mat-')) {
      confidence += 0.2;
    }

    // Boost for Angular directives
    if (element.hasAttribute('ng-model') || element.hasAttribute('formControlName')) {
      confidence += 0.15;
    }

    return Math.max(0, Math.min(1, confidence));
  }

  private detectAngularComponent(element: HTMLElement): string {
    const className = element.className.toLowerCase();

    if (className.includes('mat-input')) return 'MatInput';
    if (className.includes('mat-select')) return 'MatSelect';
    if (className.includes('mat-checkbox')) return 'MatCheckbox';
    if (className.includes('mat-radio')) return 'MatRadio';

    return 'AngularComponent';
  }
}

// ============================================================================
// VUE FIELD STRATEGY
// ============================================================================

export class VueFieldStrategy implements FieldDetectionStrategy {
  readonly name = 'vue-fields';
  readonly priority = 85;

  async detect(container: HTMLElement): Promise<DetectedField[]> {
    const fields: DetectedField[] = [];

    // Only run if Vue is detected
    const framework = detectFramework(container);
    if (framework.framework !== Framework.VUE) return fields;

    // Look for Vue-specific patterns
    const vuePatterns = [
      '[v-model]',
      '[v-bind]',
      '[v-on]',
      '[class*="el-"]', // Element UI
      '[class*="van-"]', // Vant UI
      '[class*="vue-"]',
    ];

    for (const pattern of vuePatterns) {
      try {
        const elements = Array.from(container.querySelectorAll<HTMLElement>(pattern));

        for (const element of elements) {
          if (!isValidFormField(element)) continue;

          const field = await this.analyzeVueComponent(element);
          if (field) {
            fields.push(field);
          }
        }
      } catch (error) {
        console.debug(`Vue pattern failed: ${pattern}`, error);
      }
    }

    return fields;
  }

  canHandle(element: HTMLElement): boolean {
    const framework = detectFramework(element);
    return framework.framework === Framework.VUE && framework.confidence > 0.5;
  }

  private async analyzeVueComponent(element: HTMLElement): Promise<DetectedField | null> {
    const type = this.inferVueFieldType(element);
    const confidence = this.calculateVueConfidence(element);

    if (confidence < 0.6) return null;

    const field = await createBaseDetectedField(element, type, confidence, this.name);

    field.label = await getFieldLabel(element);
    field.metadata.framework = Framework.VUE;
    field.metadata.component = this.detectVueComponent(element);

    return field;
  }

  private inferVueFieldType(element: HTMLElement): string {
    const className = element.className.toLowerCase();

    // Element UI patterns
    if (className.includes('el-input')) return 'text';
    if (className.includes('el-select')) return 'select';
    if (className.includes('el-checkbox')) return 'checkbox';
    if (className.includes('el-radio')) return 'radio';

    // Vant UI patterns
    if (className.includes('van-field')) return 'text';
    if (className.includes('van-picker')) return 'select';

    return 'text';
  }

  private calculateVueConfidence(element: HTMLElement): number {
    let confidence = 0.7; // Base confidence for Vue components

    // Higher confidence for known UI libraries
    const className = element.className.toLowerCase();
    if (className.includes('el-') || className.includes('van-')) {
      confidence += 0.2;
    }

    // Boost for Vue directives
    if (element.hasAttribute('v-model')) {
      confidence += 0.15;
    }

    return Math.max(0, Math.min(1, confidence));
  }

  private detectVueComponent(element: HTMLElement): string {
    const className = element.className.toLowerCase();

    if (className.includes('el-input')) return 'ElInput';
    if (className.includes('el-select')) return 'ElSelect';
    if (className.includes('van-field')) return 'VanField';

    return 'VueComponent';
  }
}

// ============================================================================
// STRATEGY REGISTRY
// ============================================================================

/**
 * Get all built-in framework detection strategies
 */
export const getBuiltInFrameworkStrategies = (): FieldDetectionStrategy[] => [
  new ReactFieldStrategy(),
  new AngularFieldStrategy(),
  new VueFieldStrategy(),
];
