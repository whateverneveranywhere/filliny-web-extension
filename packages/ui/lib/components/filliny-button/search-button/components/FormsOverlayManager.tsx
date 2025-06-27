import { unifiedShadowDOM } from "../../../../utils/unified-shadow-dom";
import { FormsOverlay } from "../FormsOverlay";
import React from "react";
import type { ComponentInjectionConfig } from "../../../../utils/unified-shadow-dom";
import type { OverlayPosition } from "../types";

interface FormsOverlayManagerConfig {
  formId: string;
  initialPosition: OverlayPosition;
  testMode?: boolean;
  onDismiss: () => void;
}

/**
 * Forms Overlay Manager - Manages form overlays using unified shadow DOM approach
 */
export class FormsOverlayManager {
  private static activeOverlays: Map<string, string> = new Map(); // formId -> containerId

  /**
   * Create and show a form overlay
   */
  static async createOverlay(config: FormsOverlayManagerConfig): Promise<void> {
    try {
      // Validate inputs
      if (!config.formId) {
        throw new Error("formId is required");
      }
      if (!config.initialPosition) {
        throw new Error("initialPosition is required");
      }
      if (typeof config.onDismiss !== "function") {
        throw new Error("onDismiss callback is required");
      }

      // Ensure shadow DOM is initialized
      await unifiedShadowDOM.initialize();

      const containerId = `form-overlay-${config.formId}`;

      // Clean up any existing overlay for this form
      if (this.activeOverlays.has(config.formId)) {
        this.dismissOverlay(config.formId);
      }

      // Create cleanup handler
      const handleDismiss = () => {
        try {
          config.onDismiss();
        } catch (error) {
          console.error(`Error in onDismiss callback for ${config.formId}:`, error);
        } finally {
          this.dismissOverlay(config.formId);
        }
      };

      // Create overlay component configuration
      const injectionConfig: ComponentInjectionConfig = {
        containerId,
        zIndex: 10000000,
        isolate: true,
        component: (
          <FormsOverlay
            formId={config.formId}
            initialPosition={config.initialPosition}
            onDismiss={handleDismiss}
            testMode={config.testMode}
          />
        ),
        onError: (error: Error) => {
          console.error(`Failed to create form overlay for ${config.formId}:`, error);
          handleDismiss();
        },
      };

      // Inject the overlay component
      await unifiedShadowDOM.injectComponent(injectionConfig);

      // Track the active overlay
      this.activeOverlays.set(config.formId, containerId);

      console.log(`✅ Form overlay created for ${config.formId}`);
    } catch (error) {
      console.error(`❌ Failed to create form overlay for ${config.formId}:`, error);

      // Ensure cleanup happens even on error
      try {
        config.onDismiss();
      } catch (dismissError) {
        console.error(`Error in onDismiss callback during error cleanup:`, dismissError);
      }
    }
  }

  /**
   * Dismiss a specific form overlay
   */
  static dismissOverlay(formId: string): void {
    if (!formId) {
      console.warn("Cannot dismiss overlay: formId is required");
      return;
    }

    const containerId = this.activeOverlays.get(formId);
    if (containerId) {
      try {
        unifiedShadowDOM.cleanupContainer(containerId);
        this.activeOverlays.delete(formId);
        console.log(`✅ Form overlay dismissed for ${formId}`);
      } catch (error) {
        console.error(`❌ Error dismissing form overlay for ${formId}:`, error);
        // Still remove from tracking even if cleanup failed
        this.activeOverlays.delete(formId);
      }
    }
  }

  /**
   * Dismiss all form overlays
   */
  static dismissAllOverlays(): void {
    const overlayIds = Array.from(this.activeOverlays.keys());

    if (overlayIds.length === 0) {
      console.log("No active overlays to dismiss");
      return;
    }

    console.log(`Dismissing ${overlayIds.length} active overlays`);

    for (const formId of overlayIds) {
      this.dismissOverlay(formId);
    }
  }

  /**
   * Check if an overlay is active for a specific form
   */
  static isOverlayActive(formId: string): boolean {
    if (!formId) {
      return false;
    }
    return this.activeOverlays.has(formId);
  }

  /**
   * Get all active overlay form IDs
   */
  static getActiveOverlays(): string[] {
    return Array.from(this.activeOverlays.keys());
  }

  /**
   * Get the number of active overlays
   */
  static getActiveOverlayCount(): number {
    return this.activeOverlays.size;
  }

  /**
   * Clean up all overlays and reset state (useful for testing or cleanup)
   */
  static cleanup(): void {
    try {
      this.dismissAllOverlays();
      this.activeOverlays.clear();
      console.log("✅ FormsOverlayManager cleanup completed");
    } catch (error) {
      console.error("❌ Error during FormsOverlayManager cleanup:", error);
    }
  }
}

// Convenience functions with better error handling
export const createFormOverlay = async (config: FormsOverlayManagerConfig): Promise<void> =>
  FormsOverlayManager.createOverlay(config);

export const dismissFormOverlay = (formId: string): void => FormsOverlayManager.dismissOverlay(formId);

export const dismissAllFormOverlays = (): void => FormsOverlayManager.dismissAllOverlays();

export const isFormOverlayActive = (formId: string): boolean => FormsOverlayManager.isOverlayActive(formId);

export const getActiveFormOverlays = (): string[] => FormsOverlayManager.getActiveOverlays();

export const getActiveOverlayCount = (): number => FormsOverlayManager.getActiveOverlayCount();

export const cleanupFormOverlays = (): void => FormsOverlayManager.cleanup();
