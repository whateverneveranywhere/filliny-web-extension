import type React from "react";
import { useEffect, useState, useCallback, useRef } from "react";
import { createPortal } from "react-dom";
import type { Field } from "@extension/shared";
import { detectFormLikeContainers } from "./detectionHelpers";
import { FieldFillButton } from "./fieldFillButton";
import { handleFieldFill } from ".";
import { unifiedFieldRegistry, type FieldButtonData } from "./unifiedFieldDetection";

export const FieldFillManager: React.FC = () => {
  const [fieldButtons, setFieldButtons] = useState<FieldButtonData[]>([]);
  const [isInitialDetectionDone, setIsInitialDetectionDone] = useState(false);
  const detectAttempts = useRef(0);
  const maxDetectAttempts = 5;

  // Debounce function to prevent too many rapid updates
  const debounce = <T extends (...args: unknown[]) => void>(func: T, wait: number) => {
    let timeout: NodeJS.Timeout;
    return (...args: Parameters<T>) => {
      clearTimeout(timeout);
      timeout = setTimeout(() => func(...args), wait);
    };
  };

  // Enhanced field detection using unified registry
  const detectAllFields = useCallback(async () => {
    try {
      console.log("🔍 FieldFillManager: Starting unified field detection...");

      // Clear previous registry data
      unifiedFieldRegistry.clear();

      // First, detect form containers to ensure consistency with form overlays
      const formContainers = await detectFormLikeContainers();
      console.log(`📋 Found ${formContainers.length} form containers`);

      if (formContainers.length === 0) {
        console.log("⚠️ No form containers found, using document body as fallback");
        formContainers.push(document.body);
      }

      // Register each container and get field button data
      const allFieldButtons: FieldButtonData[] = [];

      for (let i = 0; i < formContainers.length; i++) {
        const container = formContainers[i];
        const containerId = `container-${i}`;

        try {
          console.log(
            `🔍 Registering container ${i + 1}/${formContainers.length}: ${container.tagName}${container.className ? "." + container.className : ""}`,
          );
          const containerInfo = await unifiedFieldRegistry.registerContainer(container, containerId);
          console.log(`📋 Container ${containerId} registered with ${containerInfo.totalFieldCount} total fields`);

          // Get field button data for this container
          const containerFieldButtons = unifiedFieldRegistry.getFieldButtonsData(containerId);
          console.log(`✅ Container ${containerId}: ${containerFieldButtons.length} field buttons created`);

          // Debug: log field types
          const fieldTypes = containerFieldButtons.reduce(
            (acc, btn) => {
              acc[btn.field.type] = (acc[btn.field.type] || 0) + 1;
              return acc;
            },
            {} as Record<string, number>,
          );
          console.log(`📊 Field button types for ${containerId}:`, fieldTypes);

          allFieldButtons.push(...containerFieldButtons);
        } catch (error) {
          console.error(`❌ Error registering container ${containerId}:`, error);
        }
      }

      // Filter buttons to only include visible and interactive elements
      const visibleFieldButtons = allFieldButtons.filter(buttonData => {
        return buttonData.element && isElementVisibleAndInteractive(buttonData.element);
      });

      console.log(`🎯 Final result: ${visibleFieldButtons.length} field buttons will be created`);

      if (visibleFieldButtons.length > 0) {
        setFieldButtons(visibleFieldButtons);
        setIsInitialDetectionDone(true);
      } else if (detectAttempts.current < maxDetectAttempts) {
        detectAttempts.current++;
        console.log(`🔄 No field buttons found, retrying... (attempt ${detectAttempts.current}/${maxDetectAttempts})`);
        setTimeout(detectAllFields, 1000);
      }
    } catch (error) {
      console.error("❌ Error in unified field detection:", error);
    }
  }, []);

  // Enhanced visibility and interactivity check
  const isElementVisibleAndInteractive = (element: HTMLElement): boolean => {
    try {
      // Skip if element is disabled or readonly
      if (element.hasAttribute("disabled") || element.hasAttribute("readonly")) {
        return false;
      }

      // Skip if element is hidden
      const style = window.getComputedStyle(element);
      if (style.display === "none" || style.visibility === "hidden") {
        return false;
      }

      // Check if element has dimensions or is a functional radio/checkbox
      const rect = element.getBoundingClientRect();
      const isCheckableInput =
        element instanceof HTMLInputElement && (element.type === "checkbox" || element.type === "radio");

      // Allow checkable inputs even if they have zero dimensions (they might be custom styled)
      if (!isCheckableInput && (rect.width === 0 || rect.height === 0)) {
        return false;
      }

      // Skip if element is marked as decorative
      if (element.getAttribute("aria-hidden") === "true" || element.getAttribute("role") === "presentation") {
        return false;
      }

      // Additional check: ensure element is actually in the DOM and not detached
      if (!document.body.contains(element)) {
        return false;
      }

      return true;
    } catch (error) {
      console.debug("Error checking element visibility:", error);
      return false;
    }
  };

  // Initialize detection on mount
  useEffect(() => {
    const handleDOMReady = () => {
      detectAllFields().then(() => {
        console.log("✅ Initial comprehensive field detection complete");
      });
    };

    if (document.readyState === "complete" || document.readyState === "interactive") {
      handleDOMReady();
    } else {
      window.addEventListener("DOMContentLoaded", handleDOMReady);
      window.addEventListener("load", handleDOMReady);

      return () => {
        window.removeEventListener("DOMContentLoaded", handleDOMReady);
        window.removeEventListener("load", handleDOMReady);
      };
    }

    return () => {};
  }, [detectAllFields]);

  // Retry detection after delay
  useEffect(() => {
    const retryTimer = setTimeout(() => {
      if (fieldButtons.length === 0) {
        console.log("🔄 Retrying field detection after delay");
        detectAllFields();
      }
    }, 2000);

    return () => clearTimeout(retryTimer);
  }, [detectAllFields, fieldButtons.length]);

  // Set up mutation observer after initial detection
  useEffect(() => {
    if (!isInitialDetectionDone) return;

    const debouncedDetectFields = debounce(detectAllFields, 500);

    const isFormField = (node: Node): boolean => {
      if (!(node instanceof HTMLElement)) return false;

      return (
        node instanceof HTMLInputElement ||
        node instanceof HTMLSelectElement ||
        node instanceof HTMLTextAreaElement ||
        node.getAttribute("role") === "textbox" ||
        node.getAttribute("role") === "combobox" ||
        node.getAttribute("role") === "checkbox" ||
        node.getAttribute("role") === "radio" ||
        node.getAttribute("role") === "switch" ||
        node.hasAttribute("contenteditable")
      );
    };

    const shouldIgnoreElement = (node: Node): boolean => {
      if (!(node instanceof HTMLElement)) return true;
      if (node.hasAttribute("data-filliny-element")) return true;
      if (["SCRIPT", "STYLE", "META", "LINK", "TITLE"].includes(node.tagName)) return true;
      return false;
    };

    const observer = new MutationObserver(mutations => {
      let shouldRedetect = false;

      mutations.forEach(mutation => {
        mutation.addedNodes.forEach(node => {
          if (shouldIgnoreElement(node)) return;

          if (isFormField(node)) {
            shouldRedetect = true;
          } else if (node instanceof HTMLElement) {
            const childFields = node.querySelectorAll(
              "input, select, textarea, [role='textbox'], [role='combobox'], [role='checkbox'], [role='radio']",
            );
            if (childFields.length > 0) {
              shouldRedetect = true;
            }
          }
        });

        mutation.removedNodes.forEach(node => {
          if (shouldIgnoreElement(node)) return;
          if (isFormField(node) || (node instanceof HTMLElement && node.querySelector("input, select, textarea"))) {
            shouldRedetect = true;
          }
        });
      });

      if (shouldRedetect) {
        console.log("🔄 DOM changes detected, re-detecting fields...");
        debouncedDetectFields();
      }
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true,
    });

    return () => {
      observer.disconnect();
    };
  }, [isInitialDetectionDone, detectAllFields]);

  // Handle field fill
  const handleFillField = async (field: Field) => {
    try {
      console.log(`🎯 Filling field: ${field.id} (${field.type})`);
      await handleFieldFill(field);
    } catch (error) {
      console.error(`❌ Error filling field ${field.id}:`, error);
    }
  };

  // Clean up when component unmounts
  useEffect(() => {
    return () => {
      document.querySelectorAll('[data-filliny-element="true"]').forEach(element => {
        if (element.getAttribute("data-filliny-element") === "true" && element.tagName === "BUTTON") {
          element.remove();
        }
      });
    };
  }, []);

  // Render buttons directly to document.body using portals
  return (
    <>
      {fieldButtons.map(buttonData =>
        createPortal(
          <FieldFillButton
            key={buttonData.field.id}
            fieldElement={buttonData.element}
            field={buttonData.field}
            onFill={handleFillField}
          />,
          document.body,
        ),
      )}
    </>
  );
};
