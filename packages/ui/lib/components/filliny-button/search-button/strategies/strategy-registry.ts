/**
 * Strategy registry for managing detection strategies
 *
 * This module provides utilities for registering and managing detection strategies.
 * It allows for easy configuration and extension of the detection system.
 */

import { getBuiltInContainerStrategies } from './container-strategies';
import { getBuiltInFieldStrategies } from './field-strategies';
import { getBuiltInFrameworkStrategies } from './framework-strategies';
import { fieldDetector } from '../core/field-detector';
import type { FieldDetectionStrategy, ContainerDetectionStrategy, DetectionConfig } from '../core/types';

// ============================================================================
// STRATEGY REGISTRY
// ============================================================================

class StrategyRegistry {
  private fieldStrategies = new Map<string, FieldDetectionStrategy>();
  private containerStrategies = new Map<string, ContainerDetectionStrategy>();
  private initialized = false;

  /**
   * Initialize the registry with built-in strategies
   */
  initialize(): void {
    if (this.initialized) return;

    console.log('🔧 Initializing strategy registry...');

    // Register built-in field strategies
    const fieldStrategies = [...getBuiltInFieldStrategies(), ...getBuiltInFrameworkStrategies()];

    for (const strategy of fieldStrategies) {
      this.registerFieldStrategy(strategy);
    }

    // Register built-in container strategies
    const containerStrategies = getBuiltInContainerStrategies();
    for (const strategy of containerStrategies) {
      this.registerContainerStrategy(strategy);
    }

    // Register field strategies with the field detector
    for (const strategy of fieldStrategies) {
      fieldDetector.registerStrategy(strategy);
    }

    this.initialized = true;
    console.log(
      `✅ Strategy registry initialized with ${fieldStrategies.length} field strategies and ${containerStrategies.length} container strategies`,
    );
  }

  /**
   * Register a field detection strategy
   */
  registerFieldStrategy(strategy: FieldDetectionStrategy): void {
    if (this.fieldStrategies.has(strategy.name)) {
      console.warn(`⚠️ Field strategy '${strategy.name}' is already registered, replacing...`);
    }

    this.fieldStrategies.set(strategy.name, strategy);

    // Also register with the field detector if initialized
    if (this.initialized) {
      fieldDetector.registerStrategy(strategy);
    }

    console.log(`📝 Field strategy registered: ${strategy.name} (priority: ${strategy.priority})`);
  }

  /**
   * Register a container detection strategy
   */
  registerContainerStrategy(strategy: ContainerDetectionStrategy): void {
    if (this.containerStrategies.has(strategy.name)) {
      console.warn(`⚠️ Container strategy '${strategy.name}' is already registered, replacing...`);
    }

    this.containerStrategies.set(strategy.name, strategy);
    console.log(`📦 Container strategy registered: ${strategy.name} (priority: ${strategy.priority})`);
  }

  /**
   * Get a field strategy by name
   */
  getFieldStrategy(name: string): FieldDetectionStrategy | undefined {
    return this.fieldStrategies.get(name);
  }

  /**
   * Get a container strategy by name
   */
  getContainerStrategy(name: string): ContainerDetectionStrategy | undefined {
    return this.containerStrategies.get(name);
  }

  /**
   * Get all field strategies
   */
  getAllFieldStrategies(): FieldDetectionStrategy[] {
    return Array.from(this.fieldStrategies.values()).sort((a, b) => b.priority - a.priority);
  }

  /**
   * Get all container strategies
   */
  getAllContainerStrategies(): ContainerDetectionStrategy[] {
    return Array.from(this.containerStrategies.values()).sort((a, b) => b.priority - a.priority);
  }

  /**
   * Remove a field strategy
   */
  removeFieldStrategy(name: string): boolean {
    return this.fieldStrategies.delete(name);
  }

  /**
   * Remove a container strategy
   */
  removeContainerStrategy(name: string): boolean {
    return this.containerStrategies.delete(name);
  }

  /**
   * Clear all strategies
   */
  clear(): void {
    this.fieldStrategies.clear();
    this.containerStrategies.clear();
    this.initialized = false;
    console.log('🧹 Strategy registry cleared');
  }

  /**
   * Get registry statistics
   */
  getStats(): {
    fieldStrategies: number;
    containerStrategies: number;
    initialized: boolean;
    fieldStrategiesByPriority: Array<{ name: string; priority: number }>;
    containerStrategiesByPriority: Array<{ name: string; priority: number }>;
  } {
    return {
      fieldStrategies: this.fieldStrategies.size,
      containerStrategies: this.containerStrategies.size,
      initialized: this.initialized,
      fieldStrategiesByPriority: this.getAllFieldStrategies().map(s => ({
        name: s.name,
        priority: s.priority,
      })),
      containerStrategiesByPriority: this.getAllContainerStrategies().map(s => ({
        name: s.name,
        priority: s.priority,
      })),
    };
  }

  /**
   * Create a detection configuration from registered strategies
   */
  createDetectionConfig(): DetectionConfig {
    return {
      strategies: {
        field: this.getAllFieldStrategies(),
        container: this.getAllContainerStrategies(),
      },
      thresholds: {
        minConfidence: 0.5,
        minFieldCount: 1,
      },
      performance: {
        maxDetectionTime: 5000,
        debounceDelay: 300,
      },
    };
  }
}

// ============================================================================
// GLOBAL REGISTRY INSTANCE
// ============================================================================

export const strategyRegistry = new StrategyRegistry();

// ============================================================================
// CONVENIENCE FUNCTIONS
// ============================================================================

/**
 * Initialize the strategy registry with all built-in strategies
 */
export const initializeStrategies = (): void => {
  strategyRegistry.initialize();
};

/**
 * Register a custom field detection strategy
 */
export const registerFieldStrategy = (strategy: FieldDetectionStrategy): void => {
  strategyRegistry.registerFieldStrategy(strategy);
};

/**
 * Register a custom container detection strategy
 */
export const registerContainerStrategy = (strategy: ContainerDetectionStrategy): void => {
  strategyRegistry.registerContainerStrategy(strategy);
};

/**
 * Get all available field strategies
 */
export const getFieldStrategies = (): FieldDetectionStrategy[] => strategyRegistry.getAllFieldStrategies();

/**
 * Get all available container strategies
 */
export const getContainerStrategies = (): ContainerDetectionStrategy[] => strategyRegistry.getAllContainerStrategies();

/**
 * Create a preset configuration for common scenarios
 */
export const createPresetConfig = (preset: 'default' | 'fast' | 'thorough' | 'job-application'): DetectionConfig => {
  const baseConfig = strategyRegistry.createDetectionConfig();

  switch (preset) {
    case 'fast':
      return {
        ...baseConfig,
        thresholds: {
          minConfidence: 0.7,
          minFieldCount: 1,
        },
        performance: {
          maxDetectionTime: 2000,
          debounceDelay: 100,
        },
      };

    case 'thorough':
      return {
        ...baseConfig,
        thresholds: {
          minConfidence: 0.3,
          minFieldCount: 1,
        },
        performance: {
          maxDetectionTime: 10000,
          debounceDelay: 500,
        },
      };

    case 'job-application':
      return {
        ...baseConfig,
        thresholds: {
          minConfidence: 0.4,
          minFieldCount: 2,
        },
        performance: {
          maxDetectionTime: 7000,
          debounceDelay: 400,
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

// Auto-initialize strategies when this module is imported
if (typeof window !== 'undefined') {
  // Only initialize in browser environment
  setTimeout(() => {
    initializeStrategies();
  }, 0);
}
