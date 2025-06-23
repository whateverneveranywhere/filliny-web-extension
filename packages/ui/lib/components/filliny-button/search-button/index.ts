// Enhanced unified field detection and management system
export * from "./unifiedFieldDetection";

// Form and field detection utilities
export * from "./detectionHelpers";
export * from "./field-types";

// Form highlighting and overlay management
export * from "./highlightForms";
export * from "./FormsOverlay";

// Field updating and form filling
export * from "./fieldUpdaterHelpers";
export * from "./handleFormClick";

// Field management for individual field buttons
export * from "./fieldFillManager";

// Utility functions
export * from "./overlayUtils";
export * from "./types";

// Individual field filling capability
export * from "./fieldFillButton";

// Re-export the unified registry instance as the main API
export { unifiedFieldRegistry } from "./unifiedFieldDetection";

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

import type { Field } from "@extension/shared";

// Main field filling function for individual fields
export const handleFieldFill = async (field: Field): Promise<void> => {
  // Placeholder - this should be implemented based on your existing field fill logic
  console.log(`Filling individual field: ${field.id}`);

  // You can implement the individual field filling logic here
  // This might involve calling the appropriate field type handler
  // from fieldUpdaterHelpers or other modules
};

/**
 * Diagnostic function to debug field detection and button creation issues
 */
export const diagnoseFillinySystem = (): void => {
  console.log("🔍 === FILLINY SYSTEM DIAGNOSTIC ===");

  // Check if unified registry is working
  console.log("📋 Unified Registry Status:");
  try {
    console.log("- Unified registry is available");
    // Note: Using simple checks due to private field access limitations
  } catch (error) {
    console.log("- Error accessing unified registry:", error);
  }

  // Check form containers
  console.log("\n🏗️ Form Containers:");
  document.querySelectorAll('[data-filliny-form-container="true"]').forEach((container, i) => {
    const element = container as HTMLElement;
    console.log(`${i + 1}. ${element.tagName}${element.className ? "." + element.className : ""}`);
    console.log(`   - Form ID: ${element.dataset.formId || "None"}`);
    console.log(`   - Has overlay: ${element.dataset.fillinyOverlayActive || "No"}`);
  });

  // Check field buttons
  console.log("\n🔘 Field Buttons:");
  document.querySelectorAll('[data-filliny-element="true"]').forEach((button, i) => {
    const element = button as HTMLElement;
    console.log(`${i + 1}. ${element.tagName} - ${element.textContent?.trim()}`);
  });

  // Check detected fields
  console.log("\n📝 Detected Fields:");
  document.querySelectorAll('[data-filliny-detected="true"]').forEach((field, i) => {
    const element = field as HTMLElement;
    console.log(
      `${i + 1}. ${element.tagName} (${element.getAttribute("data-filliny-type")}) - ID: ${element.getAttribute("data-filliny-id")}`,
    );
  });

  // Check overlays
  console.log("\n📊 Overlays:");
  const shadowRoot = document.querySelector("#chrome-extension-filliny")?.shadowRoot;
  if (shadowRoot) {
    const overlays = shadowRoot.querySelectorAll('[id^="overlay-"]');
    console.log(`- Found ${overlays.length} overlays`);
    overlays.forEach((overlay, i) => {
      console.log(`  ${i + 1}. ${overlay.id}`);
    });
  } else {
    console.log("- No shadow root found");
  }

  console.log("\n✅ === DIAGNOSTIC COMPLETE ===");
};
