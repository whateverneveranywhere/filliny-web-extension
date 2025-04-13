import { dispatchEvent } from "./utils";

/**
 * Update a file input with the provided file data
 * Uses multiple strategies to handle different file input implementations
 */
export const updateFileInput = async (element: HTMLInputElement, value: string | string[]): Promise<void> => {
  try {
    // Skip if no value provided
    if (!value || (Array.isArray(value) && value.length === 0)) {
      console.log("No file value provided, skipping file input update");
      return;
    }

    console.log(`Updating file input ${element.id || element.name || "unnamed"}`);

    // Normalize input to array of file URLs
    const fileUrls = Array.isArray(value) ? value : [value];
    if (fileUrls.length === 0) return;

    // Check if input is actually visible/enabled
    const isDisabled = element.disabled || element.getAttribute("aria-disabled") === "true";
    if (isDisabled) {
      console.log("File input is disabled, attempting to enable it");
      element.disabled = false;
    }

    // Check if in viewport for scroll-to-view if needed
    const rect = element.getBoundingClientRect();
    const isInViewport =
      rect.top >= 0 &&
      rect.left >= 0 &&
      rect.bottom <= (window.innerHeight || document.documentElement.clientHeight) &&
      rect.right <= (window.innerWidth || document.documentElement.clientWidth);

    if (!isInViewport) {
      console.log("File input not in viewport, scrolling into view");
      element.scrollIntoView({ behavior: "smooth", block: "center" });
      // Small delay to let scroll complete
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    // If element has a parent form, check for max file size limitations
    const parentForm = element.closest("form");
    if (parentForm) {
      const maxSizeAttr = parentForm.getAttribute("data-max-file-size") || parentForm.getAttribute("enctype");
      if (maxSizeAttr) {
        console.log("Form has file size limitations:", maxSizeAttr);
      }
    }

    // Check for modern browsers with DataTransfer support
    if (typeof DataTransfer !== "undefined") {
      console.log("Using DataTransfer API for file upload");
      try {
        // Strategy 1: Use DataTransfer to create a mock file drop event
        // This is the most modern and reliable method
        const dataTransfer = new DataTransfer();

        // Process each URL to fetch and create File objects
        let atLeastOneFileAdded = false;
        for (const url of fileUrls) {
          try {
            // Validate and normalize URL
            // Accept data URLs, blob URLs, and regular URLs
            if (!url.startsWith("data:") && !url.startsWith("blob:") && !url.startsWith("http")) {
              console.log(`Invalid URL format for file: ${url}`);
              continue;
            }

            // Extract file name from URL or generate one if not present
            let fileName = url.split("/").pop() || "uploaded-file";
            // Clean up file name
            fileName = fileName.split("?")[0]; // Remove query params
            if (!fileName.includes(".")) {
              // Add extension based on content if possible
              if (url.startsWith("data:image/")) {
                const mimeType = url.split(";")[0].split(":")[1];
                const ext = mimeType.split("/")[1];
                fileName = `${fileName}.${ext}`;
              } else {
                fileName = `${fileName}.jpg`; // Default extension
              }
            }

            // For data URLs, we can create a file directly
            if (url.startsWith("data:")) {
              const mimeMatch = url.match(/data:(.*?);/);
              const mimeType = mimeMatch ? mimeMatch[1] : "application/octet-stream";
              const byteString = atob(url.split(",")[1]);
              const ab = new ArrayBuffer(byteString.length);
              const ia = new Uint8Array(ab);
              for (let i = 0; i < byteString.length; i++) {
                ia[i] = byteString.charCodeAt(i);
              }
              const file = new File([ab], fileName, { type: mimeType });
              dataTransfer.items.add(file);
              atLeastOneFileAdded = true;
              console.log(`Added data URL as file: ${fileName} (${mimeType})`);
            }
            // For HTTP URLs, we need to fetch the file
            else if (url.startsWith("http")) {
              console.log(`Skipping HTTP URL: ${url} - direct fetch not supported in content scripts`);
              // Note: Due to CORS and content script limitations,
              // we can't reliably fetch from arbitrary URLs
            }
            // For blob URLs (which could be created by the extension)
            else if (url.startsWith("blob:")) {
              console.log(`Attempting to use blob URL: ${url}`);
              // Blob URLs should already be accessible in the same context
              const response = await fetch(url);
              const blob = await response.blob();
              const file = new File([blob], fileName, { type: blob.type });
              dataTransfer.items.add(file);
              atLeastOneFileAdded = true;
            }
          } catch (err) {
            console.error(`Error processing file URL ${url}:`, err);
          }
        }

        if (atLeastOneFileAdded) {
          // Set the files property directly
          element.files = dataTransfer.files;
          console.log(`Set files property with ${dataTransfer.files.length} files`);

          // Dispatch events to notify any listeners
          dispatchEvent(element, "change");
          return; // Success! No need to try other methods
        } else {
          console.log("No files were successfully added with DataTransfer, trying other methods");
        }
      } catch (err) {
        console.error("Error using DataTransfer API:", err);
      }
    }

    // Strategy 2: Try to use a programmatic click
    console.log("Trying programmatic click strategy");
    try {
      // Store original click handler
      const originalClick = element.onclick;

      // Temporarily override click handler to prevent file dialog
      element.onclick = function (e) {
        e.preventDefault();
        return false;
      };

      // Trigger click to ensure any listeners are fired
      element.click();

      // Restore original click handler
      element.onclick = originalClick;

      // Some frameworks use shadow DOM or custom elements
      // Look for modern file upload components
      const uploadContainer = element.closest(
        '[class*="upload"], [class*="file"], [role="button"][aria-label*="file"], [role="button"][aria-label*="upload"]',
      );

      if (uploadContainer && uploadContainer !== element) {
        console.log("Found upload container, attempting to trigger its events");

        // Some file upload components use hidden inputs but expose buttons
        const uploadButton = uploadContainer.querySelector('button, [role="button"], [type="button"]');

        if (uploadButton) {
          console.log("Found upload button in container, clicking it");
          // Don't actually click to avoid file picker dialog
          // Just simulate the event for listeners
          const mockEvent = new MouseEvent("click", { bubbles: true });
          uploadButton.dispatchEvent(mockEvent);
        }
      }
    } catch (err) {
      console.error("Error with programmatic click strategy:", err);
    }

    // Strategy 3: Create mock drop event
    // This can work for frameworks that support drag-and-drop
    console.log("Trying mock drop event strategy");
    try {
      // Create a mock file object with the minimum properties
      // Note: This won't actually contain file data, but might trigger UI updates
      const mockFileList = {
        0: {
          name: fileUrls[0].split("/").pop() || "file.jpg",
          size: 1024,
          type: "image/jpeg",
        },
        length: 1,
        item: (index: number) => mockFileList[index as 0],
      };

      // Create drop event
      const dropEvent = new Event("drop", { bubbles: true });
      // Add dataTransfer property to the event
      Object.defineProperty(dropEvent, "dataTransfer", {
        value: {
          files: mockFileList,
          items: [
            {
              kind: "file",
              type: "image/jpeg",
              getAsFile: () => mockFileList[0],
            },
          ],
          types: ["Files"],
        },
      });

      // Find the drop target - could be the input or a container
      const dropTarget =
        element.closest('[class*="dropzone"], [class*="upload-area"], [class*="file-upload"]') || element;

      // Dispatch drag events sequence
      dropTarget.dispatchEvent(new Event("dragenter", { bubbles: true }));
      dropTarget.dispatchEvent(new Event("dragover", { bubbles: true }));
      dropTarget.dispatchEvent(dropEvent);

      console.log("Dispatched mock drop event");
    } catch (err) {
      console.error("Error with mock drop event:", err);
    }

    // Strategy 4: Update value directly and trigger events
    // This won't work for security reasons, but attempt it anyway
    try {
      console.log("Attempting direct value update (likely to fail for security reasons)");

      // This will likely fail, but try anyway
      const fileName = fileUrls[0].split("/").pop() || "file.jpg";

      element.value = fileName;

      dispatchEvent(element, "change");
    } catch (err) {
      console.log("Expected error with direct value update:", err);
    }

    // Strategy 5: Look for alternative upload mechanisms
    try {
      console.log("Looking for alternative upload mechanisms");

      // Some sites use a visible button near the file input
      const nearbyButtons = Array.from(
        document.querySelectorAll(
          'button[id*="upload"], button[class*="upload"], button[id*="file"], button[class*="file"]',
        ),
      );

      // Find the closest button by physical proximity
      if (nearbyButtons.length > 0) {
        const rect = element.getBoundingClientRect();
        let closestButton = null;
        let minDistance = Infinity;

        for (const button of nearbyButtons) {
          const buttonRect = button.getBoundingClientRect();
          const distance = Math.sqrt(Math.pow(rect.left - buttonRect.left, 2) + Math.pow(rect.top - buttonRect.top, 2));

          if (distance < minDistance) {
            minDistance = distance;
            closestButton = button;
          }
        }

        if (closestButton && minDistance < 200) {
          // Only if reasonably close
          console.log("Found nearby upload button, but not clicking to avoid file dialog");
          // We don't actually click, just log for diagnostic purposes
        }
      }

      // Check for drag-drop zones
      const dropzones = document.querySelectorAll('[class*="dropzone"], [class*="drop-zone"], [aria-label*="drop"]');
      if (dropzones.length > 0) {
        console.log(`Found ${dropzones.length} potential drop zones`);
      }
    } catch (err) {
      console.error("Error looking for alternative upload mechanisms:", err);
    }

    // At this point, we've tried multiple strategies, but can't guarantee success
    // File inputs have strict security measures in browsers
    console.log(
      "Completed all file upload strategies, but success not guaranteed due to browser security restrictions",
    );
  } catch (error) {
    console.error("Error in updateFileInput:", error);
  }
};
