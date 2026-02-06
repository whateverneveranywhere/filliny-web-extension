/**
 * Updater registry for managing field update strategies
 *
 * This module provides utilities for registering and managing update strategies.
 * It allows for easy configuration and extension of the update system.
 */

import { getBuiltInFieldUpdaters } from './field-updaters';
import { getBuiltInFrameworkUpdaters } from './framework-updaters';
import { updateManager } from './update-manager';
import type { FieldType } from '@extension/shared';
import type { FieldUpdateStrategy, UpdateConfig } from '../core/types';

// ============================================================================
// UPDATER REGISTRY
// ============================================================================

class UpdaterRegistry {
  private strategies = new Map<string, FieldUpdateStrategy>();
  private initialized = false;

  /**
   * Initialize the registry with built-in updaters
   */
  initialize(): void {
    if (this.initialized) return;

    console.log('🔧 Initializing updater registry...');

    // Register built-in field updaters
    const fieldUpdaters = getBuiltInFieldUpdaters();
    for (const updater of fieldUpdaters) {
      this.registerUpdater(updater);
    }

    // Register built-in framework updaters
    const frameworkUpdaters = getBuiltInFrameworkUpdaters();
    for (const updater of frameworkUpdaters) {
      this.registerUpdater(updater);
    }

    // Register all updaters with the update manager
    for (const updater of this.strategies.values()) {
      updateManager.registerStrategy(updater);
    }

    this.initialized = true;
    console.log(`✅ Updater registry initialized with ${this.strategies.size} updaters`);
  }

  /**
   * Register an update strategy
   */
  registerUpdater(strategy: FieldUpdateStrategy): void {
    if (this.strategies.has(strategy.name)) {
      console.warn(`⚠️ Updater '${strategy.name}' is already registered, replacing...`);
    }

    this.strategies.set(strategy.name, strategy);

    // Also register with the update manager if initialized
    if (this.initialized) {
      updateManager.registerStrategy(strategy);
    }

    console.log(`🔧 Updater registered: ${strategy.name} (supports: ${strategy.supportedTypes.join(', ')})`);
  }

  /**
   * Get an updater by name
   */
  getUpdater(name: string): FieldUpdateStrategy | undefined {
    return this.strategies.get(name);
  }

  /**
   * Get all updaters
   */
  getAllUpdaters(): FieldUpdateStrategy[] {
    return Array.from(this.strategies.values());
  }

  /**
   * Get updaters that support a specific field type
   */
  getUpdatersByType(fieldType: FieldType): FieldUpdateStrategy[] {
    return Array.from(this.strategies.values()).filter(updater => updater.supportedTypes.includes(fieldType));
  }

  /**
   * Remove an updater
   */
  removeUpdater(name: string): boolean {
    return this.strategies.delete(name);
  }

  /**
   * Clear all updaters
   */
  clear(): void {
    this.strategies.clear();
    this.initialized = false;
    console.log('🧹 Updater registry cleared');
  }

  /**
   * Get registry statistics
   */
  getStats(): {
    updatersCount: number;
    initialized: boolean;
    updatersByType: Record<string, string[]>;
    allSupportedTypes: string[];
  } {
    const updatersByType: Record<string, string[]> = {};
    const allSupportedTypes = new Set<string>();

    for (const updater of this.strategies.values()) {
      for (const type of updater.supportedTypes) {
        if (!updatersByType[type]) {
          updatersByType[type] = [];
        }
        updatersByType[type].push(updater.name);
        allSupportedTypes.add(type);
      }
    }

    return {
      updatersCount: this.strategies.size,
      initialized: this.initialized,
      updatersByType,
      allSupportedTypes: Array.from(allSupportedTypes).sort(),
    };
  }

  /**
   * Create an update configuration from registered updaters
   */
  createUpdateConfig(): UpdateConfig {
    return {
      strategies: this.getAllUpdaters(),
      retries: {
        maxAttempts: 3,
        delay: 1000,
      },
      validation: {
        enabled: true,
        strict: false,
      },
    };
  }
}

// ============================================================================
// GLOBAL REGISTRY INSTANCE
// ============================================================================

export const updaterRegistry = new UpdaterRegistry();

// ============================================================================
// CONVENIENCE FUNCTIONS
// ============================================================================

/**
 * Initialize the updater registry with all built-in updaters
 */
export const initializeUpdaters = (): void => {
  updaterRegistry.initialize();
};

/**
 * Register a custom field update strategy
 */
export const registerUpdater = (strategy: FieldUpdateStrategy): void => {
  updaterRegistry.registerUpdater(strategy);
};

/**
 * Get all available updaters
 */
export const getUpdaters = (): FieldUpdateStrategy[] => updaterRegistry.getAllUpdaters();

/**
 * Get updaters for a specific field type
 */
export const getUpdatersByType = (fieldType: FieldType): FieldUpdateStrategy[] =>
  updaterRegistry.getUpdatersByType(fieldType);

/**
 * Create a preset configuration for common scenarios
 */
export const createPresetUpdateConfig = (preset: 'default' | 'fast' | 'thorough' | 'strict'): UpdateConfig => {
  const baseConfig = updaterRegistry.createUpdateConfig();

  switch (preset) {
    case 'fast':
      return {
        ...baseConfig,
        retries: {
          maxAttempts: 1,
          delay: 500,
        },
        validation: {
          enabled: false,
          strict: false,
        },
      };

    case 'thorough':
      return {
        ...baseConfig,
        retries: {
          maxAttempts: 5,
          delay: 2000,
        },
        validation: {
          enabled: true,
          strict: false,
        },
      };

    case 'strict':
      return {
        ...baseConfig,
        retries: {
          maxAttempts: 3,
          delay: 1000,
        },
        validation: {
          enabled: true,
          strict: true,
        },
      };

    case 'default':
    default:
      return baseConfig;
  }
};

// ============================================================================
// AUTO-INITIALIZATION
// ============================================================================

// Auto-initialize updaters when this module is imported
if (typeof window !== 'undefined') {
  // Only initialize in browser environment
  setTimeout(() => {
    initializeUpdaters();
  }, 0);
}
