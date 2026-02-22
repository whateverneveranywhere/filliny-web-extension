/**
 * Container detection strategies
 *
 * This module contains strategies for detecting form containers.
 * Each strategy implements the ContainerDetectionStrategy interface.
 */

import { isValidFormField } from '../core/utils';
import { FieldTypeEnum } from '@extension/shared';
import type { ContainerDetectionStrategy, FormContainer } from '../core/types';

// ============================================================================
// SEMANTIC CONTAINER STRATEGY
// ============================================================================

export class SemanticContainerStrategy implements ContainerDetectionStrategy {
  readonly name = 'semantic-containers';
  readonly priority = 100;

  async detect(document: Document): Promise<FormContainer[]> {
    const containers: FormContainer[] = [];

    // Semantic form containers in priority order
    const selectors = [
      { selector: 'form', type: 'form' as const, baseScore: 90 },
      { selector: 'fieldset', type: 'fieldset' as const, baseScore: 85 },
      { selector: '[role="form"]', type: 'custom' as const, baseScore: 80 },
      { selector: '[data-form]', type: 'custom' as const, baseScore: 75 },
    ];

    for (const { selector, type, baseScore } of selectors) {
      const elements = Array.from(document.querySelectorAll<HTMLElement>(selector));

      for (const element of elements) {
        const container = await this.analyzeContainer(element, type, baseScore);
        if (container) {
          containers.push(container);
        }
      }
    }

    return containers;
  }

  private async analyzeContainer(
    element: HTMLElement,
    type: FormContainer['type'],
    baseScore: number,
  ): Promise<FormContainer | null> {
    const fields = this.getFormFields(element);

    if (fields.length === 0) return null;

    const score = this.calculateScore(element, fields, baseScore);
    const reasons = this.getScoreReasons(element, fields);

    return {
      element,
      score,
      fieldCount: fields.length,
      reasons,
      type,
    };
  }

  private getFormFields(container: HTMLElement): HTMLElement[] {
    const selectors = [
      'input:not([type="hidden"]):not([type="submit"]):not([type="button"]):not([type="reset"])',
      'select',
      'textarea',
      '[role="textbox"]',
      '[role="combobox"]',
      '[role="checkbox"]',
      '[role="radio"]',
      '[contenteditable="true"]',
    ];

    const fields: HTMLElement[] = [];

    for (const selector of selectors) {
      const elements = Array.from(container.querySelectorAll<HTMLElement>(selector));
      fields.push(...elements.filter(isValidFormField));
    }

    return fields;
  }

  private calculateScore(element: HTMLElement, fields: HTMLElement[], baseScore: number): number {
    let score = baseScore;

    // Field count bonus
    score += Math.min(fields.length * 5, 30);

    // Accessibility bonus
    if (element.getAttribute('aria-label') || element.querySelector('legend')) {
      score += 10;
    }

    // Structure bonus
    if (element.tagName === 'FORM') {
      score += 15;
    }

    // Penalty for being too nested
    const depth = this.getElementDepth(element);
    if (depth > 10) {
      score -= (depth - 10) * 2;
    }

    return Math.max(0, Math.min(100, score));
  }

  private getScoreReasons(element: HTMLElement, fields: HTMLElement[]): string[] {
    const reasons: string[] = [];

    reasons.push(`${fields.length} form fields found`);

    if (element.tagName === 'FORM') {
      reasons.push('Semantic <form> element');
    }

    if (element.getAttribute('aria-label')) {
      reasons.push('Has aria-label');
    }

    if (element.querySelector('legend')) {
      reasons.push('Contains <legend> element');
    }

    return reasons;
  }

  private getElementDepth(element: HTMLElement): number {
    let depth = 0;
    let current = element.parentElement;

    while (current && current !== document.body) {
      depth++;
      current = current.parentElement;
    }

    return depth;
  }
}

// ============================================================================
// IMPLICIT CONTAINER STRATEGY
// ============================================================================

export class ImplicitContainerStrategy implements ContainerDetectionStrategy {
  readonly name = 'implicit-containers';
  readonly priority = 80;

  async detect(document: Document): Promise<FormContainer[]> {
    const containers: FormContainer[] = [];

    // Look for div, section, main, article elements that might contain forms
    const candidates = Array.from(document.querySelectorAll<HTMLElement>('div, section, main, article'));

    for (const element of candidates) {
      const container = await this.analyzeImplicitContainer(element);
      if (container) {
        containers.push(container);
      }
    }

    return containers;
  }

  private async analyzeImplicitContainer(element: HTMLElement): Promise<FormContainer | null> {
    const fields = this.getFormFields(element);

    // Need at least 2 fields for implicit containers
    if (fields.length < 2) return null;

    // Skip if this element is inside a semantic form container
    if (element.closest('form, fieldset, [role="form"]')) return null;

    const score = this.calculateImplicitScore(element, fields);

    // Higher threshold for implicit containers
    if (score < 50) return null;

    const reasons = this.getImplicitScoreReasons(element, fields);

    return {
      element,
      score,
      fieldCount: fields.length,
      reasons,
      type: this.inferContainerType(element),
    };
  }

  private getFormFields(container: HTMLElement): HTMLElement[] {
    const selectors = [
      'input:not([type="hidden"]):not([type="submit"]):not([type="button"]):not([type="reset"])',
      'select',
      'textarea',
      '[role="textbox"]',
      '[role="combobox"]',
      '[role="checkbox"]',
      '[role="radio"]',
      '[contenteditable="true"]',
    ];

    const fields: HTMLElement[] = [];

    for (const selector of selectors) {
      const elements = Array.from(container.querySelectorAll<HTMLElement>(selector));
      fields.push(...elements.filter(isValidFormField));
    }

    return fields;
  }

  private calculateImplicitScore(element: HTMLElement, fields: HTMLElement[]): number {
    let score = 30; // Lower base score for implicit containers

    // Field count bonus (more important for implicit containers)
    score += Math.min(fields.length * 8, 40);

    // Class name indicators
    const className = element.className.toLowerCase();
    const formKeywords = ['form', 'application', 'registration', 'profile', 'contact'];

    if (formKeywords.some(keyword => className.includes(keyword))) {
      score += 20;
    }

    // ID indicators
    const id = element.id.toLowerCase();
    if (formKeywords.some(keyword => id.includes(keyword))) {
      score += 15;
    }

    // Data attributes
    if (element.hasAttribute('data-form') || element.hasAttribute('data-application')) {
      score += 15;
    }

    // Field density (fields per child element)
    const childElements = element.children.length;
    if (childElements > 0) {
      const density = fields.length / childElements;
      if (density > 0.3) {
        score += 10;
      }
    }

    // Penalty for too many non-form elements
    const allElements = element.querySelectorAll('*').length;
    const nonFormElements = allElements - fields.length;
    if (nonFormElements > fields.length * 3) {
      score -= 15;
    }

    return Math.max(0, Math.min(100, score));
  }

  private getImplicitScoreReasons(element: HTMLElement, fields: HTMLElement[]): string[] {
    const reasons: string[] = [];

    reasons.push(`${fields.length} form fields found`);

    const className = element.className.toLowerCase();
    if (className.includes('form')) {
      reasons.push('Class name suggests form container');
    }

    if (element.id.toLowerCase().includes('form')) {
      reasons.push('ID suggests form container');
    }

    const density = fields.length / (element.children.length || 1);
    if (density > 0.3) {
      reasons.push('High field density');
    }

    return reasons;
  }

  private inferContainerType(element: HTMLElement): FormContainer['type'] {
    const tagName = element.tagName.toLowerCase();

    if (tagName === 'section') return 'section';
    if (tagName === 'main') return 'section';
    if (tagName === 'article') return 'section';

    return 'div';
  }
}

// ============================================================================
// JOB APPLICATION CONTAINER STRATEGY
// ============================================================================

export class JobApplicationContainerStrategy implements ContainerDetectionStrategy {
  readonly name = 'job-application-containers';
  readonly priority = 90;

  async detect(document: Document): Promise<FormContainer[]> {
    const containers: FormContainer[] = [];

    // Look for job application specific patterns
    const jobSelectors = [
      '[class*="application" i]',
      '[class*="job" i]',
      '[class*="career" i]',
      '[class*="apply" i]',
      '[id*="application" i]',
      '[id*="job" i]',
      '[id*="career" i]',
      '[data-testid*="application" i]',
      '[data-cy*="application" i]',
    ];

    for (const selector of jobSelectors) {
      try {
        const elements = Array.from(document.querySelectorAll<HTMLElement>(selector));

        for (const element of elements) {
          const container = await this.analyzeJobContainer(element);
          if (container) {
            containers.push(container);
          }
        }
      } catch (error) {
        console.debug(`Job application selector failed: ${selector}`, error);
      }
    }

    return containers;
  }

  private async analyzeJobContainer(element: HTMLElement): Promise<FormContainer | null> {
    const fields = this.getFormFields(element);

    if (fields.length === 0) return null;

    // Check for job application specific fields
    const hasJobFields = this.hasJobApplicationFields(fields);
    if (!hasJobFields && fields.length < 3) return null;

    const score = this.calculateJobScore(element, fields);
    const reasons = this.getJobScoreReasons(element, fields);

    return {
      element,
      score,
      fieldCount: fields.length,
      reasons,
      type: 'custom',
    };
  }

  private getFormFields(container: HTMLElement): HTMLElement[] {
    const selectors = [
      'input:not([type="hidden"]):not([type="submit"]):not([type="button"]):not([type="reset"])',
      'select',
      'textarea',
      '[role="textbox"]',
      '[role="combobox"]',
      '[role="checkbox"]',
      '[role="radio"]',
      '[contenteditable="true"]',
    ];

    const fields: HTMLElement[] = [];

    for (const selector of selectors) {
      const elements = Array.from(container.querySelectorAll<HTMLElement>(selector));
      fields.push(...elements.filter(isValidFormField));
    }

    return fields;
  }

  private hasJobApplicationFields(fields: HTMLElement[]): boolean {
    const jobFieldPatterns = [
      /first.?name|given.?name/i,
      /last.?name|family.?name|surname/i,
      /email/i,
      /phone|telephone/i,
      /resume|cv/i,
      /cover.?letter/i,
      /experience/i,
      /position|role|job/i,
    ];

    const fieldTexts = fields.map(field => {
      const label =
        field.getAttribute('aria-label') ||
        field.getAttribute('placeholder') ||
        field.getAttribute('name') ||
        field.id ||
        '';
      return label.toLowerCase();
    });

    const matchCount = jobFieldPatterns.filter(pattern => fieldTexts.some(text => pattern.test(text))).length;

    return matchCount >= 2; // At least 2 job-related fields
  }

  private calculateJobScore(element: HTMLElement, fields: HTMLElement[]): number {
    let score = 70; // Higher base score for job applications

    // Field count bonus
    score += Math.min(fields.length * 3, 20);

    // Job application specific bonuses
    const className = element.className.toLowerCase();
    const id = element.id.toLowerCase();

    const jobKeywords = ['application', 'apply', 'job', 'career', 'position', 'role'];

    if (jobKeywords.some(keyword => className.includes(keyword))) {
      score += 15;
    }

    if (jobKeywords.some(keyword => id.includes(keyword))) {
      score += 10;
    }

    // Check for job application specific fields
    if (this.hasJobApplicationFields(fields)) {
      score += 20;
    }

    // File upload fields (common in job applications)
    const fileFields = fields.filter(field => field instanceof HTMLInputElement && field.type === FieldTypeEnum.FILE);
    if (fileFields.length > 0) {
      score += 10;
    }

    return Math.max(0, Math.min(100, score));
  }

  private getJobScoreReasons(element: HTMLElement, fields: HTMLElement[]): string[] {
    const reasons: string[] = [];

    reasons.push(`${fields.length} form fields found`);

    if (this.hasJobApplicationFields(fields)) {
      reasons.push('Contains job application specific fields');
    }

    const className = element.className.toLowerCase();
    if (['application', 'job', 'career'].some(keyword => className.includes(keyword))) {
      reasons.push('Class name indicates job application');
    }

    const fileFields = fields.filter(field => field instanceof HTMLInputElement && field.type === FieldTypeEnum.FILE);
    if (fileFields.length > 0) {
      reasons.push(`${fileFields.length} file upload field(s) found`);
    }

    return reasons;
  }
}

// ============================================================================
// STRATEGY REGISTRY
// ============================================================================

/**
 * Get all built-in container detection strategies
 */
export const getBuiltInContainerStrategies = (): ContainerDetectionStrategy[] => [
  new SemanticContainerStrategy(),
  new JobApplicationContainerStrategy(),
  new ImplicitContainerStrategy(),
];
