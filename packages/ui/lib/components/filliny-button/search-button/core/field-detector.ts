/**
 * Core field detection engine
 *
 * This module provides the main field detection functionality using a strategy pattern.
 * It coordinates multiple detection strategies and combines their results.
 */

import { withPerformanceMonitoring } from './event-system';
import { isElementInteractive, generateUniqueSelectors, getElementXPath, combineConfidenceScores } from './utils';
import { Framework, FieldTypeSchema } from '@extension/shared';
import type { DetectedField, FieldDetectionStrategy, DetectionConfig, ConfidenceScore } from './types';
import type { FieldType } from '@extension/shared';

// ============================================================================
// FIELD DETECTOR IMPLEMENTATION
// ============================================================================

class FieldDetector {
  private strategies: FieldDetectionStrategy[] = [];
  private config: DetectionConfig;

  constructor(config: Partial<DetectionConfig> = {}) {
    this.config = {
      strategies: {
        field: [],
        container: [],
      },
      thresholds: {
        minConfidence: 0.5,
        minFieldCount: 1,
      },
      performance: {
        maxDetectionTime: 5000,
        debounceDelay: 300,
      },
      ...config,
    };
  }

  /**
   * Register a field detection strategy
   */
  registerStrategy(strategy: FieldDetectionStrategy): void {
    // Insert strategy in priority order (higher priority first)
    const insertIndex = this.strategies.findIndex(s => s.priority < strategy.priority);
    if (insertIndex === -1) {
      this.strategies.push(strategy);
    } else {
      this.strategies.splice(insertIndex, 0, strategy);
    }

    console.log(`🔧 Strategy registered: ${strategy.name} (priority: ${strategy.priority})`);
  }

  /**
   * Detect fields in a container using all registered strategies
   */
  async detectFields(container: HTMLElement): Promise<DetectedField[]> {
    const startTime = performance.now();
    const allFields = new Map<HTMLElement, DetectedField[]>();

    console.log(`🔍 Starting field detection in container: ${container.tagName}`);

    // Run all strategies in parallel for better performance
    const strategyPromises = this.strategies.map(async strategy => {
      try {
        const fields = await this.runStrategyWithTimeout(strategy, container);
        return { strategy: strategy.name, fields };
      } catch (error) {
        console.error(`❌ Strategy ${strategy.name} failed:`, error);
        return { strategy: strategy.name, fields: [] };
      }
    });

    const results = await Promise.allSettled(strategyPromises);

    // Collect results from successful strategies
    for (const result of results) {
      if (result.status === 'fulfilled') {
        const { strategy, fields } = result.value;
        console.log(`✅ Strategy ${strategy} found ${fields.length} fields`);

        for (const field of fields) {
          if (!allFields.has(field.element)) {
            allFields.set(field.element, []);
          }
          allFields.get(field.element)!.push(field);
        }
      }
    }

    // Merge results from multiple strategies for the same element
    const mergedFields = await this.mergeFieldResults(allFields);

    // Filter by confidence threshold
    const filteredFields = mergedFields.filter(field => field.confidence >= this.config.thresholds.minConfidence);

    const duration = performance.now() - startTime;
    console.log(
      `🎯 Field detection completed: ${filteredFields.length}/${mergedFields.length} fields (${duration.toFixed(2)}ms)`,
    );

    return filteredFields;
  }

  /**
   * Run a single strategy with timeout protection
   */
  private async runStrategyWithTimeout(
    strategy: FieldDetectionStrategy,
    container: HTMLElement,
  ): Promise<DetectedField[]> {
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error(`Strategy ${strategy.name} timed out`));
      }, this.config.performance.maxDetectionTime);

      strategy
        .detect(container)
        .then(fields => {
          clearTimeout(timeout);
          resolve(fields);
        })
        .catch(error => {
          clearTimeout(timeout);
          reject(error);
        });
    });
  }

  /**
   * Merge field results from multiple strategies for the same element
   */
  private async mergeFieldResults(fieldsByElement: Map<HTMLElement, DetectedField[]>): Promise<DetectedField[]> {
    const mergedFields: DetectedField[] = [];

    for (const [_element, fields] of fieldsByElement.entries()) {
      if (fields.length === 1) {
        // Single detection, use as-is
        mergedFields.push(fields[0]);
      } else {
        // Multiple detections, merge them
        const mergedField = await this.mergeMultipleDetections(fields);
        mergedFields.push(mergedField);
      }
    }

    return mergedFields;
  }

  /**
   * Merge multiple detections of the same element
   */
  private async mergeMultipleDetections(fields: DetectedField[]): Promise<DetectedField> {
    // Use the field with highest confidence as base
    const baseField = fields.reduce((best, current) => (current.confidence > best.confidence ? current : best));

    // Combine confidence scores from all detections
    const confidenceScores = fields.map(field => ({
      score: field.confidence,
      weight: this.getStrategyWeight(field.detectionStrategy),
    }));

    const combinedConfidence = combineConfidenceScores(confidenceScores);

    // Merge metadata from all detections
    const mergedMetadata = this.mergeMetadata(fields.map(f => f.metadata));

    // Combine detection strategies
    const detectionStrategies = fields.map(f => f.detectionStrategy).join(', ');

    return {
      ...baseField,
      confidence: combinedConfidence,
      detectionStrategy: detectionStrategies,
      metadata: mergedMetadata,
    };
  }

  /**
   * Get weight for a strategy (used in confidence calculation)
   */
  private getStrategyWeight(strategyName: string): number {
    const strategy = this.strategies.find(s => s.name === strategyName);
    return strategy ? strategy.priority / 10 : 1;
  }

  /**
   * Merge metadata from multiple detections
   */
  private mergeMetadata(metadataArray: DetectedField['metadata'][]): DetectedField['metadata'] {
    const merged = metadataArray[0]; // Start with first metadata

    // Merge visibility (use most optimistic values)
    merged.visibility = {
      isVisible: metadataArray.some(m => m.visibility.isVisible),
      isInteractive: metadataArray.some(m => m.visibility.isInteractive),
      boundingRect: metadataArray.find(m => m.visibility.boundingRect)?.visibility.boundingRect,
    };

    // Merge accessibility (use most complete values)
    merged.accessibility = {
      hasLabel: metadataArray.some(m => m.accessibility.hasLabel),
      hasDescription: metadataArray.some(m => m.accessibility.hasDescription),
      isRequired: metadataArray.some(m => m.accessibility.isRequired),
    };

    // Use framework detection from highest confidence source
    const frameworkDetection = metadataArray.find(m => m.framework);
    if (frameworkDetection) {
      merged.framework = frameworkDetection.framework;
      merged.component = frameworkDetection.component;
    }

    return merged;
  }

  /**
   * Get registered strategies
   */
  getStrategies(): FieldDetectionStrategy[] {
    return [...this.strategies];
  }

  /**
   * Update configuration
   */
  updateConfig(config: Partial<DetectionConfig>): void {
    this.config = { ...this.config, ...config };
    console.log('🔧 Field detector configuration updated');
  }
}

// ============================================================================
// BASE FIELD CREATION UTILITIES
// ============================================================================

/**
 * Validate and coerce a type string into a FieldType.
 * Falls back to 'text' if the provided type is not a recognized FieldType value.
 */
const parseFieldType = (type: string): FieldType => {
  const result = FieldTypeSchema.safeParse(type);
  return result.success ? result.data : 'text';
};

/**
 * Create a base detected field from an HTML element
 */
const createBaseDetectedField = async (
  element: HTMLElement,
  type: string,
  confidence: ConfidenceScore,
  strategy: string,
): Promise<DetectedField> => {
  // Generate unique ID
  const fieldId = `field-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

  // Set filliny ID attribute
  element.setAttribute('data-filliny-id', fieldId);

  // Get element properties
  const uniqueSelectors = generateUniqueSelectors(element);
  const xpath = getElementXPath(element);
  const rect = element.getBoundingClientRect();

  // Detect accessibility properties
  const accessibility = {
    hasLabel: !!(
      element.getAttribute('aria-label') ||
      element.getAttribute('aria-labelledby') ||
      (element.id && document.querySelector(`label[for="${element.id}"]`)) ||
      element.closest('label')
    ),
    hasDescription: !!(element.getAttribute('aria-describedby') || element.getAttribute('aria-description')),
    isRequired: !!(element.hasAttribute('required') || element.getAttribute('aria-required') === 'true'),
  };

  // Validate the field type using Zod schema
  const validatedType = parseFieldType(type);

  // Create the detected field
  const field: DetectedField = {
    id: fieldId,
    type: validatedType,
    xpath,
    uniqueSelectors,
    value: '',
    element,
    confidence,
    detectionStrategy: strategy,
    metadata: {
      framework: Framework.VANILLA,
      visibility: {
        isVisible: isElementInteractive(element),
        isInteractive: isElementInteractive(element),
        boundingRect: rect,
      },
      accessibility,
    },
  };

  // Add element-specific properties
  if (element instanceof HTMLInputElement) {
    field.name = element.name;
    field.placeholder = element.placeholder;
    field.value = element.value;
  } else if (element instanceof HTMLTextAreaElement) {
    field.name = element.name;
    field.placeholder = element.placeholder;
    field.value = element.value;
  } else if (element instanceof HTMLSelectElement) {
    field.name = element.name;
    field.value = element.value;
  }

  return field;
};

/**
 * Enhanced field label detection
 */
const getFieldLabel = async (element: HTMLElement): Promise<string> => {
  // Strategy 1: aria-label
  const ariaLabel = element.getAttribute('aria-label');
  if (ariaLabel?.trim()) return ariaLabel.trim();

  // Strategy 2: aria-labelledby
  const labelledBy = element.getAttribute('aria-labelledby');
  if (labelledBy) {
    const labelElement = document.getElementById(labelledBy);
    if (labelElement?.textContent?.trim()) {
      return labelElement.textContent.trim();
    }
  }

  // Strategy 3: associated label element
  if (element.id) {
    const label = document.querySelector(`label[for="${element.id}"]`);
    if (label?.textContent?.trim()) {
      return label.textContent.trim();
    }
  }

  // Strategy 4: parent label
  const parentLabel = element.closest('label');
  if (parentLabel?.textContent?.trim()) {
    // Remove the input's own text from the label
    const labelText = parentLabel.textContent.trim();
    const inputText = element.textContent?.trim() || '';
    return labelText.replace(inputText, '').trim();
  }

  // Strategy 5: nearby text (previous sibling, etc.)
  const previousSibling = element.previousElementSibling;
  if (previousSibling?.textContent?.trim()) {
    const text = previousSibling.textContent.trim();
    if (text.length < 100) {
      // Reasonable label length
      return text;
    }
  }

  // Strategy 6: placeholder as fallback
  const placeholder = element.getAttribute('placeholder');
  if (placeholder?.trim()) return placeholder.trim();

  // Strategy 7: name attribute as last resort
  const name = element.getAttribute('name');
  if (name?.trim()) {
    // Convert camelCase/snake_case to readable text
    return name
      .replace(/([A-Z])/g, ' $1')
      .replace(/_/g, ' ')
      .trim();
  }

  return '';
};

// ============================================================================
// GLOBAL DETECTOR INSTANCE
// ============================================================================

const fieldDetector = new FieldDetector();

// Add performance monitoring
const detectFieldsWithMonitoring = withPerformanceMonitoring(
  fieldDetector.detectFields.bind(fieldDetector),
  'field-detection',
);

// ============================================================================
// EXPORTS (at end of file per ESLint import-x/exports-last rule)
// ============================================================================

export { FieldDetector, createBaseDetectedField, getFieldLabel, fieldDetector, detectFieldsWithMonitoring };
