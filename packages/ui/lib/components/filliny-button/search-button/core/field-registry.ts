/**
 * Centralized field registry for managing detected fields and containers
 *
 * This registry provides a single source of truth for all detected fields and containers,
 * ensuring consistency across the application and preventing duplicate detection work.
 */

import { eventBus, emitFieldDetectionEvent } from './event-system';
import type { DetectedField, FormContainer, FieldRegistry, ContainerRegistry } from './types';

// ============================================================================
// FIELD REGISTRY IMPLEMENTATION
// ============================================================================

class FieldRegistryImpl implements FieldRegistry {
  private fields = new Map<string, DetectedField>();
  private fieldsByContainer = new Map<string, Set<string>>();

  /**
   * Register a detected field
   */
  register(field: DetectedField): void {
    const existingField = this.fields.get(field.id);

    // Update existing field or add new one
    this.fields.set(field.id, field);

    // Track container association
    if (field.metadata?.container) {
      const containerId = field.metadata.container;
      if (!this.fieldsByContainer.has(containerId)) {
        this.fieldsByContainer.set(containerId, new Set());
      }
      this.fieldsByContainer.get(containerId)!.add(field.id);
    }

    // Emit event
    emitFieldDetectionEvent('field-detected', { field });

    console.log(`📝 Field registered: ${field.id} (${field.type}) - ${existingField ? 'Updated' : 'New'}`);
  }

  /**
   * Unregister a field
   */
  unregister(fieldId: string): void {
    const field = this.fields.get(fieldId);
    if (!field) return;

    this.fields.delete(fieldId);

    // Remove from container associations
    for (const [containerId, fieldIds] of this.fieldsByContainer.entries()) {
      fieldIds.delete(fieldId);
      if (fieldIds.size === 0) {
        this.fieldsByContainer.delete(containerId);
      }
    }

    console.log(`🗑️ Field unregistered: ${fieldId}`);
  }

  /**
   * Get a specific field
   */
  get(fieldId: string): DetectedField | undefined {
    return this.fields.get(fieldId);
  }

  /**
   * Get all registered fields
   */
  getAll(): DetectedField[] {
    return Array.from(this.fields.values());
  }

  /**
   * Get fields by container
   */
  getByContainer(containerId: string): DetectedField[] {
    const fieldIds = this.fieldsByContainer.get(containerId);
    if (!fieldIds) return [];

    return Array.from(fieldIds)
      .map(id => this.fields.get(id))
      .filter((field): field is DetectedField => field !== undefined);
  }

  /**
   * Get fields by type
   */
  getByType(type: string): DetectedField[] {
    return Array.from(this.fields.values()).filter(field => field.type === type);
  }

  /**
   * Get visible and interactive fields
   */
  getInteractive(): DetectedField[] {
    return Array.from(this.fields.values()).filter(
      field => field.metadata.visibility.isVisible && field.metadata.visibility.isInteractive,
    );
  }

  /**
   * Clear all fields
   */
  clear(): void {
    const count = this.fields.size;
    this.fields.clear();
    this.fieldsByContainer.clear();

    console.log(`🧹 Field registry cleared: ${count} fields removed`);
  }

  /**
   * Get registry statistics
   */
  getStats(): {
    totalFields: number;
    fieldsByType: Record<string, number>;
    fieldsByContainer: Record<string, number>;
    interactiveFields: number;
  } {
    const fields = this.getAll();

    const fieldsByType = fields.reduce(
      (acc, field) => {
        acc[field.type] = (acc[field.type] || 0) + 1;
        return acc;
      },
      {} as Record<string, number>,
    );

    const fieldsByContainer: Record<string, number> = {};
    for (const [containerId, fieldIds] of this.fieldsByContainer.entries()) {
      fieldsByContainer[containerId] = fieldIds.size;
    }

    return {
      totalFields: fields.length,
      fieldsByType,
      fieldsByContainer,
      interactiveFields: this.getInteractive().length,
    };
  }
}

// ============================================================================
// CONTAINER REGISTRY IMPLEMENTATION
// ============================================================================

class ContainerRegistryImpl implements ContainerRegistry {
  private containers = new Map<string, FormContainer>();

  /**
   * Register a form container
   */
  register(container: FormContainer, id: string): void {
    const existing = this.containers.get(id);
    this.containers.set(id, container);

    // Emit event
    emitFieldDetectionEvent('container-detected', { containers: [container] });

    console.log(
      `📦 Container registered: ${id} (${container.type}) - Score: ${container.score}, Fields: ${container.fieldCount} - ${existing ? 'Updated' : 'New'}`,
    );
  }

  /**
   * Unregister a container
   */
  unregister(id: string): void {
    if (this.containers.delete(id)) {
      console.log(`🗑️ Container unregistered: ${id}`);
    }
  }

  /**
   * Get a specific container
   */
  get(id: string): FormContainer | undefined {
    return this.containers.get(id);
  }

  /**
   * Get all registered containers
   */
  getAll(): FormContainer[] {
    return Array.from(this.containers.values());
  }

  /**
   * Get containers sorted by score
   */
  getBestContainers(limit?: number): FormContainer[] {
    const containers = this.getAll().sort((a, b) => b.score - a.score);
    return limit ? containers.slice(0, limit) : containers;
  }

  /**
   * Clear all containers
   */
  clear(): void {
    const count = this.containers.size;
    this.containers.clear();

    console.log(`🧹 Container registry cleared: ${count} containers removed`);
  }

  /**
   * Get registry statistics
   */
  getStats(): {
    totalContainers: number;
    containersByType: Record<string, number>;
    averageScore: number;
    totalFields: number;
  } {
    const containers = this.getAll();

    const containersByType = containers.reduce(
      (acc, container) => {
        acc[container.type] = (acc[container.type] || 0) + 1;
        return acc;
      },
      {} as Record<string, number>,
    );

    const averageScore =
      containers.length > 0 ? containers.reduce((sum, c) => sum + c.score, 0) / containers.length : 0;

    const totalFields = containers.reduce((sum, c) => sum + c.fieldCount, 0);

    return {
      totalContainers: containers.length,
      containersByType,
      averageScore: Math.round(averageScore * 100) / 100,
      totalFields,
    };
  }
}

// ============================================================================
// UNIFIED REGISTRY
// ============================================================================

/**
 * Unified registry that manages both fields and containers
 */
class UnifiedRegistry {
  public readonly fields: FieldRegistry;
  public readonly containers: ContainerRegistry;

  constructor() {
    this.fields = new FieldRegistryImpl();
    this.containers = new ContainerRegistryImpl();
  }

  /**
   * Register a container and its fields
   */
  async registerContainerWithFields(
    container: FormContainer,
    containerId: string,
    fields: DetectedField[],
  ): Promise<void> {
    // Register the container
    this.containers.register(container, containerId);

    // Register all fields with container association
    for (const field of fields) {
      // Add container reference to field metadata
      field.metadata = {
        ...field.metadata,
        container: containerId,
      };

      this.fields.register(field);
    }

    console.log(`🎯 Container with fields registered: ${containerId} (${fields.length} fields)`);
  }

  /**
   * Clear everything
   */
  clear(): void {
    this.fields.clear();
    this.containers.clear();
  }

  /**
   * Get comprehensive statistics
   */
  getStats(): {
    fields: ReturnType<FieldRegistryImpl['getStats']>;
    containers: ReturnType<ContainerRegistryImpl['getStats']>;
    summary: {
      totalElements: number;
      detectionEfficiency: number;
    };
  } {
    const fieldStats = (this.fields as FieldRegistryImpl).getStats();
    const containerStats = (this.containers as ContainerRegistryImpl).getStats();

    return {
      fields: fieldStats,
      containers: containerStats,
      summary: {
        totalElements: fieldStats.totalFields + containerStats.totalContainers,
        detectionEfficiency:
          containerStats.totalContainers > 0 ? fieldStats.totalFields / containerStats.totalContainers : 0,
      },
    };
  }

  /**
   * Export registry data for debugging
   */
  exportData(): {
    fields: DetectedField[];
    containers: FormContainer[];
    timestamp: number;
  } {
    return {
      fields: this.fields.getAll(),
      containers: this.containers.getAll(),
      timestamp: Date.now(),
    };
  }
}

// ============================================================================
// GLOBAL REGISTRY INSTANCE
// ============================================================================

const registry = new UnifiedRegistry();

// Individual registries for direct access
const fieldRegistry = registry.fields;
const containerRegistry = registry.containers;

// ============================================================================
// REGISTRY EVENT HANDLERS
// ============================================================================

// Log registry changes in development
if (process.env.NODE_ENV === 'development') {
  eventBus.on('field-detection', event => {
    console.log('🔍 Field detection event:', event);
  });
}

// ============================================================================
// EXPORTS (at end of file per ESLint import-x/exports-last rule)
// ============================================================================

export { registry, fieldRegistry, containerRegistry };
