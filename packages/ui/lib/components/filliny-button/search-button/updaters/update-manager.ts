/**
 * Update manager for coordinating field updates
 *
 * This module provides a centralized manager for updating form fields.
 * It coordinates multiple update strategies and handles retries and validation.
 */

import { emitFieldDetectionEvent, withPerformanceMonitoring } from '../core/event-system';
import { retry } from '../core/utils';
import type { FieldUpdateStrategy, DetectedField, UpdateResult, UpdateConfig } from '../core/types';

// ============================================================================
// UPDATE MANAGER IMPLEMENTATION
// ============================================================================

export class UpdateManager {
  private strategies = new Map<string, FieldUpdateStrategy>();
  private config: UpdateConfig;

  constructor(config: Partial<UpdateConfig> = {}) {
    this.config = {
      strategies: [],
      retries: {
        maxAttempts: 3,
        delay: 1000,
      },
      validation: {
        enabled: true,
        strict: false,
      },
      ...config,
    };
  }

  /**
   * Register an update strategy
   */
  registerStrategy(strategy: FieldUpdateStrategy): void {
    this.strategies.set(strategy.name, strategy);
    console.log(`🔧 Update strategy registered: ${strategy.name}`);
  }

  /**
   * Update a single field
   */
  async updateField(field: DetectedField, value: unknown): Promise<UpdateResult> {
    console.log(`🎯 Updating field: ${field.id} (${field.type}) with value:`, value);

    // Find compatible strategies
    const compatibleStrategies = this.findCompatibleStrategies(field);

    if (compatibleStrategies.length === 0) {
      return {
        success: false,
        strategy: 'none',
        error: `No compatible update strategy found for field type: ${field.type}`,
      };
    }

    // Try strategies in order of priority
    let lastError: string | undefined;

    for (const strategy of compatibleStrategies) {
      try {
        const result = await this.executeUpdateWithRetry(strategy, field, value);

        if (result.success) {
          // Emit success event
          await emitFieldDetectionEvent('field-updated', {
            field,
            value: result.actualValue,
          });

          console.log(`✅ Field updated successfully: ${field.id} using ${strategy.name}`);
          return result;
        } else {
          lastError = result.error;
          console.warn(`⚠️ Strategy ${strategy.name} failed: ${result.error}`);
        }
      } catch (error) {
        lastError = (error as Error).message;
        console.error(`❌ Strategy ${strategy.name} threw error:`, error);
      }
    }

    return {
      success: false,
      strategy: compatibleStrategies[0].name,
      error: lastError || 'All update strategies failed',
    };
  }

  /**
   * Update multiple fields
   */
  async updateFields(updates: Array<{ field: DetectedField; value: unknown }>): Promise<UpdateResult[]> {
    console.log(`🎯 Updating ${updates.length} fields...`);

    const results = await Promise.allSettled(updates.map(({ field, value }) => this.updateField(field, value)));

    const updateResults = results.map(result => {
      if (result.status === 'fulfilled') {
        return result.value;
      } else {
        return {
          success: false,
          strategy: 'unknown',
          error: result.reason?.message || 'Update failed',
        } as UpdateResult;
      }
    });

    const successCount = updateResults.filter(r => r.success).length;
    console.log(`📊 Field updates completed: ${successCount}/${updates.length} successful`);

    return updateResults;
  }

  /**
   * Find strategies compatible with a field
   */
  private findCompatibleStrategies(field: DetectedField): FieldUpdateStrategy[] {
    const compatible: FieldUpdateStrategy[] = [];

    for (const strategy of this.strategies.values()) {
      if (strategy.canUpdate(field)) {
        compatible.push(strategy);
      }
    }

    // Sort by supported types specificity (more specific types first)
    return compatible.sort((a, b) => {
      const aSpecificity = a.supportedTypes.includes(field.type) ? 1 : 0;
      const bSpecificity = b.supportedTypes.includes(field.type) ? 1 : 0;
      return bSpecificity - aSpecificity;
    });
  }

  /**
   * Execute update with retry logic
   */
  private async executeUpdateWithRetry(
    strategy: FieldUpdateStrategy,
    field: DetectedField,
    value: unknown,
  ): Promise<UpdateResult> {
    return retry(() => strategy.update(field, value), this.config.retries.maxAttempts, this.config.retries.delay);
  }

  /**
   * Validate field update result
   */
  private validateUpdateResult(field: DetectedField, result: UpdateResult, expectedValue: unknown): boolean {
    if (!this.config.validation.enabled) return true;

    // Basic validation
    if (!result.success) return false;

    // Strict validation
    if (this.config.validation.strict) {
      const expectedString = String(expectedValue || '');
      const actualString = String(result.actualValue || '');
      return expectedString === actualString;
    }

    return true;
  }

  /**
   * Get registered strategies
   */
  getStrategies(): FieldUpdateStrategy[] {
    return Array.from(this.strategies.values());
  }

  /**
   * Update configuration
   */
  updateConfig(config: Partial<UpdateConfig>): void {
    this.config = { ...this.config, ...config };
    console.log('🔧 Update manager configuration updated');
  }

  /**
   * Get statistics
   */
  getStats(): {
    strategiesCount: number;
    strategies: Array<{ name: string; supportedTypes: string[] }>;
    config: UpdateConfig;
  } {
    return {
      strategiesCount: this.strategies.size,
      strategies: Array.from(this.strategies.values()).map(s => ({
        name: s.name,
        supportedTypes: s.supportedTypes,
      })),
      config: this.config,
    };
  }
}

// ============================================================================
// GLOBAL UPDATE MANAGER INSTANCE
// ============================================================================

export const updateManager = new UpdateManager();

// Add performance monitoring
export const updateFieldWithMonitoring = withPerformanceMonitoring(
  updateManager.updateField.bind(updateManager),
  'field-update',
);

export const updateFieldsWithMonitoring = withPerformanceMonitoring(
  updateManager.updateFields.bind(updateManager),
  'fields-update',
);

// ============================================================================
// CONVENIENCE FUNCTIONS
// ============================================================================

/**
 * Update a single field (convenience function)
 */
export const updateField = async (field: DetectedField, value: unknown): Promise<UpdateResult> =>
  updateFieldWithMonitoring(field, value);

/**
 * Update multiple fields (convenience function)
 */
export const updateFields = async (updates: Array<{ field: DetectedField; value: unknown }>): Promise<UpdateResult[]> =>
  updateFieldsWithMonitoring(updates);

/**
 * Register an update strategy (convenience function)
 */
export const registerUpdateStrategy = (strategy: FieldUpdateStrategy): void => {
  updateManager.registerStrategy(strategy);
};
