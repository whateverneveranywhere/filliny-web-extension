/**
 * Core module exports - Foundation layer for field detection and management
 *
 * This module provides the essential building blocks that all other modules depend on.
 * It follows the dependency inversion principle where higher-level modules depend on abstractions.
 */

// Core types and interfaces
export * from './types';

// Base field detection engine
export * from './field-detector';

// Field registry for centralized management
export * from './field-registry';

// Event system for decoupled communication
export * from './event-system';

// Utility functions used across modules
export * from './utils';
