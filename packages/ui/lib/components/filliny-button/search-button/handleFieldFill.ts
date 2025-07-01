import { updateFormFields, processChunks } from "./fieldUpdaterHelpers";
import { unifiedFieldRegistry } from "./unifiedFieldDetection";
import { aiFillService, getMatchingWebsite } from "@extension/shared";
import { profileStrorage } from "@extension/storage";
import type { Field } from "@extension/shared";
import type { DTOProfileFillingForm } from "@extension/storage";

/**
 * Handle filling a single field
 * This function sends just one field to the AI service and applies the result
 */
export const handleFieldFill = async (field: Field): Promise<void> => {
  console.log(`Starting field fill for: ${field.id}, type: ${field.type}`);

  // Get the definitive element from the registry
  const fieldInfo = unifiedFieldRegistry.getField(field.id);
  const element = fieldInfo?.element;

  if (!element) {
    console.error(`Element for field ID ${field.id} not found in registry.`);
    return;
  }

  try {
    // Add a loading indicator to the field
    element.setAttribute("data-filliny-loading", "true");
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

    // Set up message listener for streaming response
    const streamPromise = new Promise<void>((resolve, reject) => {
      const messageHandler = (message: { type: string; data?: string; error?: string }) => {
        if (message.type === "STREAM_CHUNK" && message.data) {
          try {
            console.log("Received stream chunk:", message.data.substring(0, 100) + "...");
            // Pass ALL fields from the registry to processChunks for proper merging
            const allFields = unifiedFieldRegistry.getAllFields();
            processChunks(message.data, allFields);
          } catch (error) {
            console.error("Field Fill: Error processing chunk:", error);
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

    // Process the response
    if (response instanceof ReadableStream) {
      console.log("Received ReadableStream response, waiting for stream processing");
      await streamPromise;
    } else if ("data" in response && Array.isArray(response.data) && response.data.length > 0) {
      const updatedField = response.data[0];
      console.log(`Received direct value for field ${field.id}:`, updatedField.value);
      await updateFormFields([updatedField], false);
    } else {
      console.error("Field Fill: Invalid response format:", response);
      throw new Error("Invalid response format from API");
    }

    // Show success feedback
    element.style.outline = "2px solid #10b981";

    setTimeout(() => {
      element.style.outline = originalOutline;
      element.style.outlineOffset = originalOutlineOffset;
      element.style.transition = originalTransition;
    }, 2000);
  } catch (error) {
    console.error("Error in handleFieldFill:", error);
    element.style.outline = "2px solid #ef4444";
  } finally {
    element.removeAttribute("data-filliny-loading");
  }
};
