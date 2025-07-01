// Modern React components (refactored)
export * from "./components";

// Main initialization
export { initializeSearchButton, cleanupSearchButton } from "./main";

// Core functionality
export { handleFieldFill } from "./handleFieldFill";
export { handleFormClick } from "./handleFormClick";
export { highlightForms } from "./highlightForms";

// Test mode helpers
export * from "./testModeHelpers";

// Field detection and management
export { detectFormLikeContainers } from "./detectionHelpers";
export { unifiedFieldRegistry } from "./unifiedFieldDetection";

// Field types
export * from "./field-types";

// Types
export type * from "./types";

// Utilities (keeping essential ones only)
export { resetOverlays, addGlowingBorder } from "./overlayUtils";

// Field updating
export { updateField, updateFormFields } from "./fieldUpdaterHelpers";

/**
 * Main API for unified field detection and management
 *
 * This system ensures consistency between:
 * - Form overlay detection (bulk filling)
 * - Individual field button creation
 * - Grouped field handling (radio/checkbox groups)
 *
 * Usage:
 * 1. Form containers are detected using detectFormLikeContainers()
 * 2. Each container is registered with unifiedFieldRegistry
 * 3. Field buttons are created using getFieldButtonsData()
 * 4. Form overlays use getAllFields() for bulk operations
 * 5. All strategies share the same field detection logic
 */

// Note: diagnoseFillinySystem is now imported from detectionHelpers.ts
// to avoid duplicate exports
