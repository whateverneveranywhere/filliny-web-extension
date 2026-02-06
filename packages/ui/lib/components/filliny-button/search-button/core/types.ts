/**
 * Core types and interfaces for the field detection system
 *
 * This file defines the fundamental data structures and contracts used throughout
 * the search-button system. All modules depend on these types.
 */

import { Framework } from '@extension/shared';
import type { Field, FieldType } from '@extension/shared';

// ============================================================================
// FIELD DETECTION TYPES
// ============================================================================

/**
 * Confidence score for field detection (0-1)
 */
export type ConfidenceScore = number;

/**
 * Field detection strategy interface
 */
export interface FieldDetectionStrategy {
  readonly name: string;
  readonly priority: number;
  detect(container: HTMLElement): Promise<DetectedField[]>;
  canHandle(element: HTMLElement): boolean;
}

/**
 * Detected field with metadata
 */
export interface DetectedField extends Field {
  element: HTMLElement;
  confidence: ConfidenceScore;
  detectionStrategy: string;
  metadata: FieldMetadata;
}

/**
 * Field metadata for enhanced detection
 */
export interface FieldMetadata {
  framework: Framework;
  component?: string;
  container?: string;
  visibility: {
    isVisible: boolean;
    isInteractive: boolean;
    boundingRect?: DOMRect;
  };
  accessibility: {
    hasLabel: boolean;
    hasDescription: boolean;
    isRequired: boolean;
  };
  validation?: {
    pattern?: string;
    min?: number;
    max?: number;
    minLength?: number;
    maxLength?: number;
  };
}

// ============================================================================
// FIELD UPDATER TYPES
// ============================================================================

/**
 * Field update strategy interface
 */
export interface FieldUpdateStrategy {
  readonly name: string;
  readonly supportedTypes: FieldType[];
  canUpdate(field: DetectedField): boolean;
  update(field: DetectedField, value: unknown): Promise<UpdateResult>;
}

/**
 * Result of a field update operation
 */
export interface UpdateResult {
  success: boolean;
  error?: string;
  actualValue?: unknown;
  strategy: string;
}

// ============================================================================
// CONTAINER DETECTION TYPES
// ============================================================================

/**
 * Form container with scoring
 */
export interface FormContainer {
  element: HTMLElement;
  score: number;
  fieldCount: number;
  reasons: string[];
  type: 'form' | 'fieldset' | 'section' | 'div' | 'custom';
}

/**
 * Container detection strategy
 */
export interface ContainerDetectionStrategy {
  readonly name: string;
  readonly priority: number;
  detect(document: Document): Promise<FormContainer[]>;
}

// ============================================================================
// EVENT SYSTEM TYPES
// ============================================================================

/**
 * Event payload for field detection events
 */
export interface FieldDetectionEvent {
  type: 'field-detected' | 'field-updated' | 'container-detected';
  payload: {
    fields?: DetectedField[];
    containers?: FormContainer[];
    field?: DetectedField;
    value?: unknown;
  };
  timestamp: number;
}

/**
 * Event listener function
 */
export type EventListener<T = unknown> = (event: T) => void | Promise<void>;

// ============================================================================
// REGISTRY TYPES
// ============================================================================

/**
 * Field registry interface for centralized field management
 */
export interface FieldRegistry {
  register(field: DetectedField): void;
  unregister(fieldId: string): void;
  get(fieldId: string): DetectedField | undefined;
  getAll(): DetectedField[];
  getByContainer(containerId: string): DetectedField[];
  clear(): void;
}

/**
 * Container registry interface
 */
export interface ContainerRegistry {
  register(container: FormContainer, id: string): void;
  unregister(id: string): void;
  get(id: string): FormContainer | undefined;
  getAll(): FormContainer[];
  clear(): void;
}

// ============================================================================
// CONFIGURATION TYPES
// ============================================================================

/**
 * Detection configuration
 */
export interface DetectionConfig {
  strategies: {
    field: FieldDetectionStrategy[];
    container: ContainerDetectionStrategy[];
  };
  thresholds: {
    minConfidence: ConfidenceScore;
    minFieldCount: number;
  };
  performance: {
    maxDetectionTime: number;
    debounceDelay: number;
  };
}

/**
 * Update configuration
 */
export interface UpdateConfig {
  strategies: FieldUpdateStrategy[];
  retries: {
    maxAttempts: number;
    delay: number;
  };
  validation: {
    enabled: boolean;
    strict: boolean;
  };
}

// ============================================================================
// UTILITY TYPES
// ============================================================================

/**
 * Selector with confidence scoring
 */
export interface SelectorWithConfidence {
  selector: string;
  confidence: ConfidenceScore;
  description: string;
}

/**
 * Element position information
 */
export interface ElementPosition {
  top: number;
  left: number;
  width: number;
  height: number;
  zIndex?: number;
}

/**
 * Framework detection result
 */
export interface FrameworkDetection {
  framework: Framework;
  version?: string;
  confidence: ConfidenceScore;
  indicators: string[];
}

// ============================================================================
// ERROR TYPES
// ============================================================================

/**
 * Base error for field detection system
 */
export class FieldDetectionError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly context?: Record<string, unknown>,
  ) {
    super(message);
    this.name = 'FieldDetectionError';
  }
}

/**
 * Error codes for different failure scenarios
 */
export enum ErrorCode {
  DETECTION_FAILED = 'DETECTION_FAILED',
  UPDATE_FAILED = 'UPDATE_FAILED',
  ELEMENT_NOT_FOUND = 'ELEMENT_NOT_FOUND',
  INVALID_CONFIGURATION = 'INVALID_CONFIGURATION',
  TIMEOUT = 'TIMEOUT',
  PERMISSION_DENIED = 'PERMISSION_DENIED',
}
