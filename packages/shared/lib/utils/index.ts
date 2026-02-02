/**
 * Utils barrel file
 * Exports all utility functions, types, and constants from the utils directory
 *
 * NOTE: frameworkDetection.ts is the single source of truth for Framework enum
 * Do NOT re-export Framework from types/enums.ts to avoid duplicates
 */

// Constants (consolidated from root const.ts)
export * from './const.js';

// Utility functions
export * from './helpers.js';
export * from './colorful-logger.js';
export * from './init-app-with-shadow.js';
export * from './dateConstants.js';
export * from './debug-logger.js';
export * from './frameworkDetection.js';
export * from './runtime-type-guards.js';
export * from './chromeApi.js';
export * from './console-suppressor.js';

// Types (utility-specific types)
export * from './types.js';
