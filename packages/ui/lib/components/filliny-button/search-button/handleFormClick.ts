import { processChunks, updateFormFields } from "./fieldUpdaterHelpers";
import { highlightForms } from "./highlightForms";
import { disableOtherButtons, resetOverlays, showLoadingIndicator } from "./overlayUtils";
import { prepareFieldForTestMode, showTestModeIndicator } from "./testModeHelpers";
import { unifiedFieldRegistry } from "./unifiedFieldDetection";
import { aiFillService, getMatchingWebsite } from "@extension/shared";
import { profileStrorage } from "@extension/storage";
import type { Field, FieldType } from "@extension/shared";
import type { DTOProfileFillingForm } from "@extension/storage";

/**
 * Handle form click event
 * This is the main entry point for form filling functionality
 */
export const handleFormClick = async (
  event: React.MouseEvent<HTMLButtonElement>,
  formId: string,
  testMode = false,
): Promise<void> => {
  // Make sure event doesn't propagate
  if (event) {
    try {
      event.preventDefault();
      event.stopPropagation();

      // For extra safety with React synthetic events
      if (event.nativeEvent) {
        event.nativeEvent.stopImmediatePropagation?.();
        event.nativeEvent.stopPropagation?.();
        event.nativeEvent.preventDefault?.();
      }
    } catch (eventError) {
      console.debug("Error handling event propagation:", eventError);
    }
  }

  const totalStartTime = performance.now();

  // For unified overlay approach, we need to find ALL form containers
  let formContainers: HTMLElement[] = [];

  try {
    // If we have a unified form, find all registered containers
    if (formId === "unified-form") {
      formContainers = findAllFormContainers();
    } else {
      // Fallback to single form container for backward compatibility
      const singleContainer = findFormContainer(formId);
      if (singleContainer) {
        formContainers = [singleContainer];
      }
    }
  } catch (findError) {
    console.warn("Error finding form containers:", findError);
  }

  // Fallback: try to find any form-like containers
  if (formContainers.length === 0) {
    try {
      const fallbackSelectors = ["form", "[data-filliny-form-container]", '[role="form"]', "[data-form-id]"];
      for (const selector of fallbackSelectors) {
        const fallbackContainers = Array.from(document.querySelectorAll<HTMLElement>(selector));
        if (fallbackContainers.length > 0) {
          console.log(`Using fallback containers: ${selector} (${fallbackContainers.length} found)`);
          formContainers = fallbackContainers;
          break;
        }
      }
    } catch (fallbackError) {
      console.error("Fallback container search also failed:", fallbackError);
    }
  }

  if (formContainers.length === 0) {
    alert("No forms found. Please try again.");
    try {
      resetOverlays();
      highlightForms({ visionOnly: false });
    } catch (resetError) {
      console.error("Error resetting overlays:", resetError);
    }
    return;
  }

  console.log(
    `🎯 Processing ${formContainers.length} form containers:`,
    formContainers.map(c => `${c.tagName}${c.className ? "." + c.className : ""}`),
  );

  try {
    disableOtherButtons(formId);
    showLoadingIndicator(formId);
  } catch (uiError) {
    console.debug("Error updating UI indicators:", uiError);
  }

  try {
    const startTime = performance.now();

    // Get fields from all form containers
    const allFields: Field[] = [];

    // Process each container to collect all fields
    for (let containerIndex = 0; containerIndex < formContainers.length; containerIndex++) {
      const formContainer = formContainers[containerIndex];
      console.log(`Processing container ${containerIndex + 1}/${formContainers.length}: ${formContainer.tagName}`);

      // Get fields from unified registry instead of re-detecting
      // First check if this container is already registered
      const containerId = findContainerIdForFormContainer(formContainer);
      let containerFields: Field[] = [];

      if (containerId) {
        try {
          containerFields = unifiedFieldRegistry.getAllFields(containerId);
          console.log(`Form Click: Using cached fields from registry for container ${containerId}`);
        } catch (registryError) {
          console.warn("Error getting fields from registry:", registryError);
        }
      }

      if (containerFields.length === 0) {
        // Fallback: register the container if not found or if registry failed
        console.log("Form Click: Container not in registry or empty, registering now...");
        try {
          const newContainerId = `form-click-${Date.now()}-${containerIndex}`;
          await unifiedFieldRegistry.registerContainer(formContainer, newContainerId);
          containerFields = unifiedFieldRegistry.getAllFields(newContainerId);
        } catch (registrationError) {
          console.error("Error registering container:", registrationError);

          // Last resort: use basic field detection
          try {
            console.log("Using basic fallback field detection...");
            const basicFields = detectFormFieldsInElement(formContainer);
            // Convert to Field objects (simplified)
            containerFields = basicFields.map((element, index) => ({
              id: element.id || `fallback-field-${containerIndex}-${index}`,
              type: element.tagName.toLowerCase() as FieldType,
              label: element.getAttribute("aria-label") || element.getAttribute("placeholder") || "",
              value: "",
              element: element,
            }));
          } catch (basicDetectionError) {
            console.error("Even basic field detection failed:", basicDetectionError);
            continue; // Skip this container and try the next one
          }
        }
      }

      // Add container fields to the total collection
      allFields.push(...containerFields);
    }

    // Use all collected fields
    const fields = allFields;

    if (fields.length === 0) {
      alert("Unable to detect form fields in any container. Please refresh the page and try again.");
      return;
    }

    console.log("Form Click: Detected fields:", fields);
    console.log(
      `%c⏱ Detection took: ${((performance.now() - startTime) / 1000).toFixed(2)}s`,
      "background: #059669; color: white; padding: 4px 8px; border-radius: 4px; font-size: 14px; font-weight: bold;",
    );

    if (testMode) {
      try {
        console.log("Running in test mode with example values");

        // Show test mode indicator using shared utility
        showTestModeIndicator();

        // Use the shared utility to prepare fields with test values
        const fieldsWithTestValues = fields.map(field => prepareFieldForTestMode(field));

        // Log the test values for debugging
        console.log(
          "Test mode: Values generated:",
          fieldsWithTestValues.map(f => ({
            id: f.id,
            type: f.type,
            value: f.value,
          })),
        );

        // Apply visual changes sequentially to simulate streaming updates
        await simulateStreamingForTestMode(fieldsWithTestValues);
        return;
      } catch (testModeError) {
        console.error("Error in test mode:", testModeError);
        alert("Test mode failed. Please try again.");
        return;
      }
    }

    // Only execute API call logic if not in test mode
    try {
      const [defaultProfile] = await Promise.all([profileStrorage.get()]);
      const visitingUrl = window.location.href;
      const matchingWebsite = getMatchingWebsite(
        (defaultProfile as DTOProfileFillingForm).fillingWebsites,
        visitingUrl,
      );

      // Set up message listener for streaming response
      const streamPromise = new Promise<void>((resolve, reject) => {
        const messageHandler = (message: { type: string; data?: string; error?: string }) => {
          try {
            if (message.type === "STREAM_CHUNK" && message.data) {
              try {
                processChunks(message.data, fields);
              } catch (error) {
                console.error("Form Click: Error processing chunk:", error);
                // Don't reject here, continue processing other chunks
              }
            } else if (message.type === "STREAM_DONE") {
              chrome.runtime.onMessage.removeListener(messageHandler);
              resolve();
            } else if (message.type === "STREAM_ERROR") {
              console.error("Form Click: Stream error:", message.error);
              chrome.runtime.onMessage.removeListener(messageHandler);
              reject(new Error(message.error || "Stream error"));
            }
          } catch (messageError) {
            console.error("Error handling stream message:", messageError);
          }
        };

        chrome.runtime.onMessage.addListener(messageHandler);
      });

      // Make the API call
      const response = await aiFillService({
        contextText: matchingWebsite?.fillingContext || defaultProfile?.defaultFillingContext || "",
        formData: fields,
        websiteUrl: visitingUrl,
        preferences: defaultProfile?.preferences,
      });

      if (response instanceof ReadableStream) {
        // Wait for all streaming chunks to be processed
        await streamPromise;
      } else if (response.data) {
        await updateFormFields(response.data, false);
      } else {
        console.error("Form Click: Invalid response format:", response);
        throw new Error("Invalid response format from API");
      }
    } catch (apiError) {
      console.error("Form Click: Error in API call:", apiError);
      throw apiError; // Re-throw to be handled by outer catch
    }
  } catch (error) {
    console.error("Form Click: Error processing AI fill service:", error);
    const errorMessage =
      error instanceof Error
        ? error.message
        : typeof error === "object"
          ? JSON.stringify(error)
          : "Unknown error occurred";
    alert(`Failed to fill form: ${errorMessage}`);
  } finally {
    try {
      console.log(
        `%c⏱ Total process took: ${((performance.now() - totalStartTime) / 1000).toFixed(2)}s`,
        "background: #059669; color: white; padding: 4px 8px; border-radius: 4px; font-size: 14px; font-weight: bold;",
      );
      resetOverlays();
    } catch (finallyError) {
      console.error("Error in finally block:", finallyError);
    }
  }
};

/**
 * Find all form containers on the page
 */
const findAllFormContainers = (): HTMLElement[] => {
  console.log("🔍 Looking for all form containers on page");

  const containers: HTMLElement[] = [];

  // Strategy 1: Find all containers with form IDs
  const formIdContainers = Array.from(document.querySelectorAll<HTMLElement>("[data-form-id]"));
  containers.push(...formIdContainers);

  // Strategy 2: Find semantic form containers
  const semanticSelectors = ["form", '[role="form"]', "[data-filliny-form-container]", "[data-form]", "fieldset"];

  for (const selector of semanticSelectors) {
    try {
      const elements = Array.from(document.querySelectorAll<HTMLElement>(selector));
      elements.forEach(element => {
        if (!containers.includes(element)) {
          containers.push(element);
        }
      });
    } catch (e) {
      console.debug(`Selector failed: ${selector}`, e);
    }
  }

  // Strategy 3: Find containers with significant form fields
  const potentialContainers = Array.from(document.querySelectorAll<HTMLElement>("div, section, main, article"));
  for (const container of potentialContainers) {
    const fieldCount = detectFormFieldsInElement(container).length;
    if (fieldCount >= 2 && !containers.includes(container)) {
      containers.push(container);
    }
  }

  console.log(`✅ Found ${containers.length} form containers`);
  return containers;
};

/**
 * Find container ID for a form container from the unified registry
 */
const findContainerIdForFormContainer = (formContainer: HTMLElement): string | null => {
  // Check if this container has a form ID that we can map to a container ID
  const formId = formContainer.dataset.formId;
  if (formId) {
    // Try to map form ID to container ID based on naming patterns
    const match = formId.match(/form-(\d+)/);
    if (match) {
      // Try different container ID patterns
      const patterns = [`highlight-container-${match[1]}`, `container-${match[1]}`, `form-click-container-${match[1]}`];

      for (const containerId of patterns) {
        const fields = unifiedFieldRegistry.getAllFields(containerId);
        if (fields.length > 0) {
          return containerId;
        }
      }
    }
  }

  // Fallback: check if this container matches any registered container
  // This is more expensive but ensures we find the right one
  return null; // Will trigger re-registration
};

/**
 * Enhanced form container finder that prioritizes the outermost wrapper
 */
const findFormContainer = (formId: string): HTMLElement | null => {
  console.log(`🔍 Looking for form container with ID: ${formId}`);

  // Strategy 1: Look for exact matches first
  const exactMatches = [
    `form[data-form-id="${formId}"]`,
    `[data-filliny-form-container][data-form-id="${formId}"]`,
    `[data-form-id="${formId}"]`,
  ];

  for (const selector of exactMatches) {
    const element = document.querySelector<HTMLElement>(selector);
    if (element) {
      console.log(`✅ Found exact match: ${selector}`);
      return validateAndExpandFormContainer(element);
    }
  }

  // Strategy 2: Look for any element with the form ID and expand to find true outermost container
  const anyFormElement = document.querySelector<HTMLElement>(`[data-form-id="${formId}"]`);
  if (anyFormElement) {
    console.log(`🔍 Found element with form ID, expanding to find outermost container...`);
    return validateAndExpandFormContainer(anyFormElement);
  }

  // Strategy 3: Fallback to any form-like container
  const fallbackSelectors = [
    "form",
    "[data-filliny-form-container]",
    "[role='form']",
    "[data-form]",
    ".form",
    ".form-container",
    ".form-wrapper",
  ];

  for (const selector of fallbackSelectors) {
    const elements = document.querySelectorAll<HTMLElement>(selector);
    if (elements.length > 0) {
      console.log(`⚠️ Using fallback selector: ${selector}`);
      // Return the largest form container (most likely to be outermost)
      return Array.from(elements).reduce((largest, current) => {
        const largestRect = largest.getBoundingClientRect();
        const currentRect = current.getBoundingClientRect();
        return currentRect.width * currentRect.height > largestRect.width * largestRect.height ? current : largest;
      });
    }
  }

  console.error(`❌ No form container found for ID: ${formId}`);
  return null;
};

/**
 * Validate and potentially expand a form container to ensure we have the outermost wrapper
 */
const validateAndExpandFormContainer = (element: HTMLElement): HTMLElement => {
  console.log(`🔍 Validating form container: ${element.tagName}${element.className ? "." + element.className : ""}`);

  // First, detect all form fields within this element
  const fieldsInElement = detectFormFieldsInElement(element);
  console.log(`📋 Found ${fieldsInElement.length} form fields in current container`);

  if (fieldsInElement.length === 0) {
    console.warn(`⚠️ No form fields found in container, returning as-is`);
    return element;
  }

  // Strategy: Walk up the DOM tree to find a container that has significantly more fields
  // This helps us find the true outermost form container
  let bestContainer = element;
  let maxFieldCount = fieldsInElement.length;

  // Walk up the DOM tree
  let parent = element.parentElement;
  while (parent && parent !== document.body) {
    // Don't go beyond certain boundary elements
    if (parent.tagName === "BODY" || parent.tagName === "HTML") {
      break;
    }

    // Check if this parent has significantly more fields
    const fieldsInParent = detectFormFieldsInElement(parent);

    // If parent has more fields, it might be a better container
    if (fieldsInParent.length > maxFieldCount) {
      console.log(
        `🔍 Parent ${parent.tagName}${parent.className ? "." + parent.className : ""} has ${fieldsInParent.length} fields (more than ${maxFieldCount})`,
      );

      // Additional validation: make sure this isn't too broad
      const ratio = fieldsInParent.length / maxFieldCount;

      // If the parent has 50% more fields or more, and isn't the entire page, use it
      if (ratio >= 1.5 && ratio <= 10) {
        bestContainer = parent;
        maxFieldCount = fieldsInParent.length;
        console.log(`✅ Using parent as better container: ${parent.tagName}`);
      } else if (ratio > 10) {
        console.log(`⚠️ Parent has too many fields (${fieldsInParent.length}), probably too broad`);
        break;
      }
    }

    parent = parent.parentElement;
  }

  // Special case: if we found a semantic form element, prefer it
  let semanticParent = bestContainer.parentElement;
  while (semanticParent && semanticParent !== document.body) {
    if (
      semanticParent.tagName === "FORM" ||
      semanticParent.getAttribute("role") === "form" ||
      semanticParent.hasAttribute("data-form") ||
      semanticParent.className.toLowerCase().includes("form")
    ) {
      const semanticFields = detectFormFieldsInElement(semanticParent);
      if (semanticFields.length >= maxFieldCount * 0.8) {
        // At least 80% of the fields
        console.log(`✅ Found semantic form parent: ${semanticParent.tagName}`);
        bestContainer = semanticParent;
        break;
      }
    }
    semanticParent = semanticParent.parentElement;
  }

  console.log(
    `🎯 Final container choice: ${bestContainer.tagName}${bestContainer.className ? "." + bestContainer.className : ""} with ${maxFieldCount} fields`,
  );
  return bestContainer;
};

/**
 * Count form fields in an element (lightweight version)
 */
const detectFormFieldsInElement = (element: HTMLElement): HTMLElement[] => {
  const fieldSelectors = [
    'input:not([type="hidden"]):not([type="submit"]):not([type="button"]):not([type="reset"])',
    "select",
    "textarea",
    '[role="textbox"]',
    '[role="combobox"]',
    '[role="checkbox"]',
    '[role="radio"]',
    '[contenteditable="true"]',
  ];

  const fields: HTMLElement[] = [];

  fieldSelectors.forEach(selector => {
    try {
      const elements = element.querySelectorAll<HTMLElement>(selector);
      elements.forEach(el => {
        // Basic visibility check
        const style = window.getComputedStyle(el);
        if (style.display !== "none" && style.visibility !== "hidden") {
          fields.push(el);
        }
      });
    } catch {
      // Ignore selector errors
    }
  });

  return fields;
};

/**
 * Simulate streaming updates for test mode by updating fields in batches
 * This creates a more realistic visual experience similar to regular streaming mode
 */
const simulateStreamingForTestMode = async (fields: Field[]): Promise<void> => {
  // Process all fields at once for instant updates in test mode
  console.log("Test mode: Processing all fields instantly");
  await updateFormFields(fields, true);
  console.log("Test mode: All fields processed");
};
