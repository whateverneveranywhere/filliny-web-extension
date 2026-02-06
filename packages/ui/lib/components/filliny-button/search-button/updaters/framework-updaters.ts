/**
 * Framework-specific field update strategies
 *
 * This module contains strategies for updating form fields in specific JavaScript frameworks.
 * These updaters understand framework-specific patterns and event handling.
 */

import { Framework } from '@extension/shared';
import { detectFramework } from '../core/utils';
import type { FieldType } from '@extension/shared';
import type { FieldUpdateStrategy, DetectedField, UpdateResult } from '../core/types';

// ============================================================================
// REACT FIELD UPDATER
// ============================================================================

export class ReactFieldUpdater implements FieldUpdateStrategy {
  readonly name = 'react-field-updater';
  readonly supportedTypes: FieldType[] = [
    'text',
    'email',
    'password',
    'tel',
    'url',
    'search',
    'textarea',
    'select',
    'checkbox',
    'radio',
  ];

  canUpdate(field: DetectedField): boolean {
    const framework = detectFramework(field.element);
    return framework.framework === Framework.REACT && framework.confidence > 0.5;
  }

  async update(field: DetectedField, value: unknown): Promise<UpdateResult> {
    const element = field.element;
    const stringValue = String(value || '');

    try {
      // Detect React component type
      const componentType = this.detectReactComponentType(element);

      switch (componentType) {
        case 'controlled':
          return await this.updateControlledComponent(element, stringValue);
        case 'material-ui':
          return await this.updateMaterialUIComponent(element, stringValue);
        case 'ant-design':
          return await this.updateAntDesignComponent(element, stringValue);
        case 'chakra-ui':
          return await this.updateChakraUIComponent(element, stringValue);
        default:
          return await this.updateGenericReactComponent(element, stringValue);
      }
    } catch (error) {
      return {
        success: false,
        strategy: this.name,
        error: (error as Error).message,
      };
    }
  }

  private detectReactComponentType(element: HTMLElement): string {
    const className = element.className.toLowerCase();

    if (className.includes('mui') || className.includes('material-ui')) {
      return 'material-ui';
    }

    if (className.includes('ant-')) {
      return 'ant-design';
    }

    if (className.includes('chakra-')) {
      return 'chakra-ui';
    }

    // Check for React Fiber properties to determine if controlled
    const hasReactFiber = Object.keys(element).some(
      key => key.startsWith('__reactFiber') || key.startsWith('__reactInternalInstance'),
    );

    if (hasReactFiber) {
      return 'controlled';
    }

    return 'generic';
  }

  private async updateControlledComponent(element: HTMLElement, value: string): Promise<UpdateResult> {
    // For controlled components, we need to trigger React's synthetic event system
    element.focus();

    if (element instanceof HTMLInputElement || element instanceof HTMLTextAreaElement) {
      // Set the value
      const nativeInputValueSetter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value')?.set;

      if (nativeInputValueSetter) {
        nativeInputValueSetter.call(element, value);
      } else {
        element.value = value;
      }
    }

    // Trigger React events
    this.triggerReactEvents(element, ['input', 'change']);

    return {
      success: true,
      actualValue: value,
      strategy: this.name,
    };
  }

  private async updateMaterialUIComponent(element: HTMLElement, value: string): Promise<UpdateResult> {
    // Material-UI specific handling
    const input = element.querySelector('input, textarea') as HTMLInputElement | HTMLTextAreaElement;

    if (input) {
      input.focus();
      input.value = value;
      this.triggerReactEvents(input, ['input', 'change', 'blur']);
    }

    return {
      success: true,
      actualValue: value,
      strategy: this.name,
    };
  }

  private async updateAntDesignComponent(element: HTMLElement, value: string): Promise<UpdateResult> {
    // Ant Design specific handling
    const input = element.querySelector('input, textarea') as HTMLInputElement | HTMLTextAreaElement;

    if (input) {
      input.focus();
      input.value = value;
      this.triggerReactEvents(input, ['input', 'change']);
    }

    return {
      success: true,
      actualValue: value,
      strategy: this.name,
    };
  }

  private async updateChakraUIComponent(element: HTMLElement, value: string): Promise<UpdateResult> {
    // Chakra UI specific handling
    const input = element.querySelector('input, textarea') as HTMLInputElement | HTMLTextAreaElement;

    if (input) {
      input.focus();
      input.value = value;
      this.triggerReactEvents(input, ['input', 'change']);
    }

    return {
      success: true,
      actualValue: value,
      strategy: this.name,
    };
  }

  private async updateGenericReactComponent(element: HTMLElement, value: string): Promise<UpdateResult> {
    // Generic React component handling
    element.focus();

    if (element instanceof HTMLInputElement || element instanceof HTMLTextAreaElement) {
      element.value = value;
    } else if (element.isContentEditable) {
      element.textContent = value;
    }

    this.triggerReactEvents(element, ['input', 'change']);

    return {
      success: true,
      actualValue: value,
      strategy: this.name,
    };
  }

  private triggerReactEvents(element: HTMLElement, eventTypes: string[]): void {
    for (const eventType of eventTypes) {
      // Create and dispatch native event
      const event = new Event(eventType, { bubbles: true, cancelable: true });
      element.dispatchEvent(event);

      // Try to trigger React synthetic events
      try {
        const reactEvent = new InputEvent(eventType, {
          bubbles: true,
          cancelable: true,
        });
        element.dispatchEvent(reactEvent);
      } catch {
        // Fallback for older browsers
      }
    }
  }
}

// ============================================================================
// ANGULAR FIELD UPDATER
// ============================================================================

export class AngularFieldUpdater implements FieldUpdateStrategy {
  readonly name = 'angular-field-updater';
  readonly supportedTypes: FieldType[] = [
    'text',
    'email',
    'password',
    'tel',
    'url',
    'search',
    'textarea',
    'select',
    'checkbox',
    'radio',
  ];

  canUpdate(field: DetectedField): boolean {
    const framework = detectFramework(field.element);
    return framework.framework === Framework.ANGULAR && framework.confidence > 0.5;
  }

  async update(field: DetectedField, value: unknown): Promise<UpdateResult> {
    const element = field.element;
    const stringValue = String(value || '');

    try {
      element.focus();

      if (element instanceof HTMLInputElement || element instanceof HTMLTextAreaElement) {
        element.value = stringValue;
      } else if (element.isContentEditable) {
        element.textContent = stringValue;
      }

      // Trigger Angular events
      this.triggerAngularEvents(element, ['input', 'change', 'blur']);

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

  private triggerAngularEvents(element: HTMLElement, eventTypes: string[]): void {
    for (const eventType of eventTypes) {
      const event = new Event(eventType, { bubbles: true, cancelable: true });
      element.dispatchEvent(event);
    }

    // Trigger Angular's zone detection
    try {
      const ngZone = (window as any).ng?.getComponent?.(element)?.ngZone;
      if (ngZone) {
        ngZone.run(() => {
          // Force change detection
        });
      }
    } catch {
      // Ignore if Angular zone is not available
    }
  }
}

// ============================================================================
// VUE FIELD UPDATER
// ============================================================================

export class VueFieldUpdater implements FieldUpdateStrategy {
  readonly name = 'vue-field-updater';
  readonly supportedTypes: FieldType[] = [
    'text',
    'email',
    'password',
    'tel',
    'url',
    'search',
    'textarea',
    'select',
    'checkbox',
    'radio',
  ];

  canUpdate(field: DetectedField): boolean {
    const framework = detectFramework(field.element);
    return framework.framework === Framework.VUE && framework.confidence > 0.5;
  }

  async update(field: DetectedField, value: unknown): Promise<UpdateResult> {
    const element = field.element;
    const stringValue = String(value || '');

    try {
      element.focus();

      if (element instanceof HTMLInputElement || element instanceof HTMLTextAreaElement) {
        element.value = stringValue;
      } else if (element.isContentEditable) {
        element.textContent = stringValue;
      }

      // Trigger Vue events
      this.triggerVueEvents(element, ['input', 'change']);

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

  private triggerVueEvents(element: HTMLElement, eventTypes: string[]): void {
    for (const eventType of eventTypes) {
      const event = new Event(eventType, { bubbles: true, cancelable: true });
      element.dispatchEvent(event);
    }

    // Try to trigger Vue's reactivity system
    try {
      const vueInstance = (element as any).__vue__;
      if (vueInstance && vueInstance.$forceUpdate) {
        vueInstance.$forceUpdate();
      }
    } catch {
      // Ignore if Vue instance is not available
    }
  }
}

// ============================================================================
// STRATEGY REGISTRY
// ============================================================================

/**
 * Get all built-in framework update strategies
 */
export const getBuiltInFrameworkUpdaters = (): FieldUpdateStrategy[] => [
  new ReactFieldUpdater(),
  new AngularFieldUpdater(),
  new VueFieldUpdater(),
];
