import type { Field } from "@extension/shared";
import { updateFormFields, processChunks } from "./fieldUpdaterHelpers";
import { aiFillService, getMatchingWebsite } from "@extension/shared";
import { profileStrorage } from "@extension/storage";
import type { DTOProfileFillingForm } from "@extension/storage";

/**
 * Safely convert any field value to a string
 */
const getStringValue = (value: string | string[] | undefined): string => {
  if (value === undefined) return "";
  if (Array.isArray(value)) return value.join(", ");
  return value;
};

/**
 * Directly set field values using DOM APIs when possible
 * This provides immediate feedback while we wait for more complete processing
 */
const tryDirectFieldUpdate = (element: HTMLElement, value: string | string[] | undefined): boolean => {
  if (value === undefined) return false;

  try {
    // Convert to string if needed
    const stringValue = getStringValue(value);

    // Dispatch events to ensure proper field behavior
    const dispatchEvents = (el: HTMLElement) => {
      // Create and dispatch focus event
      el.dispatchEvent(new Event("focus", { bubbles: true }));

      // Create and dispatch input event
      const inputEvent = new Event("input", { bubbles: true });
      el.dispatchEvent(inputEvent);

      // Create and dispatch change event
      const changeEvent = new Event("change", { bubbles: true });
      el.dispatchEvent(changeEvent);

      // Blur the element
      el.dispatchEvent(new Event("blur", { bubbles: true }));
    };

    if (element instanceof HTMLInputElement) {
      const prevValue = element.value;
      element.value = stringValue;

      // Only trigger events if value actually changed
      if (prevValue !== stringValue) {
        dispatchEvents(element);
      }
      return true;
    }

    if (element instanceof HTMLSelectElement) {
      // Find option that matches value
      const options = Array.from(element.options);
      const matchingOption = options.find(
        opt =>
          opt.value === stringValue || opt.text === stringValue || opt.text.toLowerCase() === stringValue.toLowerCase(),
      );

      if (matchingOption) {
        const prevValue = element.value;
        element.value = matchingOption.value;

        // Only trigger events if value actually changed
        if (prevValue !== element.value) {
          dispatchEvents(element);
        }
        return true;
      }
    }

    if (element instanceof HTMLTextAreaElement) {
      const prevValue = element.value;
      element.value = stringValue;

      // Only trigger events if value actually changed
      if (prevValue !== stringValue) {
        dispatchEvents(element);
      }
      return true;
    }

    // Handle contenteditable
    if (element.hasAttribute("contenteditable")) {
      const prevValue = element.textContent;
      element.textContent = stringValue;

      // Only trigger events if value actually changed
      if (prevValue !== stringValue) {
        dispatchEvents(element);
      }
      return true;
    }

    return false;
  } catch (error) {
    console.error("Direct update failed:", error);
    return false;
  }
};

/**
 * Handle filling a single field
 * This function sends just one field to the AI service and applies the result
 */
export const handleFieldFill = async (field: Field): Promise<void> => {
  console.log(`Starting field fill for: ${field.id}, type: ${field.type}`);

  try {
    // Add a loading indicator to the field
    const element = document.querySelector<HTMLElement>(`[data-filliny-id="${field.id}"]`);
    if (!element) {
      console.error(`Element with ID ${field.id} not found`);
      return;
    }

    // Add visual feedback
    element.setAttribute("data-filliny-loading", "true");
    // Mark as our element to avoid observer loops
    element.setAttribute("data-filliny-element", "true");

    // Add a highlight effect to show which field is being filled
    const originalOutline = element.style.outline;
    const originalOutlineOffset = element.style.outlineOffset;
    const originalTransition = element.style.transition;

    element.style.outline = "2px solid #4f46e5";
    element.style.outlineOffset = "2px";
    element.style.transition = "all 0.3s ease";

    // Get profile data
    const [defaultProfile] = await Promise.all([profileStrorage.get()]);
    const visitingUrl = window.location.href;
    const matchingWebsite = getMatchingWebsite((defaultProfile as DTOProfileFillingForm).fillingWebsites, visitingUrl);

    // Set up message listener for streaming response (same mechanism as in handleFormClick)
    const streamPromise = new Promise<void>((resolve, reject) => {
      const messageHandler = (message: { type: string; data?: string; error?: string }) => {
        if (message.type === "STREAM_CHUNK" && message.data) {
          try {
            console.log("Received stream chunk:", message.data.substring(0, 100) + "...");

            // Extract and apply field values from chunk
            try {
              const parsedData = JSON.parse(message.data);
              if (parsedData?.data && Array.isArray(parsedData.data)) {
                const relevantField = parsedData.data.find((f: Field) => f.id === field.id);
                if (relevantField && relevantField.value) {
                  console.log(`Updating field ${field.id} with value from chunk:`, relevantField.value);

                  // Try direct update first for immediate feedback
                  tryDirectFieldUpdate(element, relevantField.value);

                  // Also run the regular update for completeness
                  const allFields = [field]; // Starting with just this field for context
                  processChunks(message.data, allFields);
                }
              }
            } catch (parseError) {
              console.error("Error parsing chunk:", parseError);
            }
          } catch (error) {
            console.error("Field Fill: Error processing chunk:", error);
            // Don't reject here, continue processing other chunks
          }
        } else if (message.type === "STREAM_DONE") {
          console.log("Stream processing complete for field:", field.id);
          chrome.runtime.onMessage.removeListener(messageHandler);
          resolve();
        } else if (message.type === "STREAM_ERROR") {
          console.error("Field Fill: Stream error:", message.error);
          chrome.runtime.onMessage.removeListener(messageHandler);
          reject(new Error(message.error || "Stream error"));
        }
      };

      chrome.runtime.onMessage.addListener(messageHandler);
    });

    // Call AI service with just this field
    console.log(`Calling AI service for field: ${field.id}, label: ${field.label || field.name}`);
    const response = await aiFillService({
      contextText: matchingWebsite?.fillingContext || defaultProfile?.defaultFillingContext || "",
      formData: [field], // Send only this single field
      websiteUrl: visitingUrl,
      preferences: defaultProfile?.preferences,
    });

    // Process the response in the same way as handleFormClick
    if (response instanceof ReadableStream) {
      console.log("Received ReadableStream response, waiting for stream processing");
      // Wait for all streaming chunks to be processed
      await streamPromise;
    } else if ("data" in response && Array.isArray(response.data) && response.data.length > 0) {
      // Get the updated field value
      const updatedField = response.data[0];
      console.log(`Received direct value for field ${field.id}:`, updatedField.value);

      // Try direct update first for immediate feedback
      if (updatedField.value) {
        tryDirectFieldUpdate(element, updatedField.value);
      }

      // Use the same updateFormFields mechanism as handleFormClick
      await updateFormFields([updatedField], false);
    } else {
      console.error("Field Fill: Invalid response format:", response);
      throw new Error("Invalid response format from API");
    }

    // Show success feedback
    element.style.outline = "2px solid #10b981"; // Green success color

    // Reset outline after a delay
    setTimeout(() => {
      element.style.outline = originalOutline;
      element.style.outlineOffset = originalOutlineOffset;
      element.style.transition = originalTransition;
    }, 2000);
  } catch (error) {
    console.error("Error in handleFieldFill:", error);

    // Show error feedback if element exists
    const element = document.querySelector<HTMLElement>(`[data-filliny-id="${field.id}"]`);
    if (element) {
      element.style.outline = "2px solid #ef4444"; // Red error color
    }
  } finally {
    // Remove loading indicator
    const element = document.querySelector<HTMLElement>(`[data-filliny-id="${field.id}"]`);
    if (element) {
      element.removeAttribute("data-filliny-loading");
      // Leave data-filliny-element to mark it as processed
    }
  }
};
