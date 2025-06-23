import { createRoot } from "react-dom/client";
import { FormsOverlay } from "./FormsOverlay";
import { detectFormLikeContainers, openCrossOriginIframeInNewTabAndAlert } from "./detectionHelpers";
import { addGlowingBorder, findOrCreateShadowContainer, getFormPosition } from "./overlayUtils";
import { unifiedFieldRegistry } from "./unifiedFieldDetection";
import type { HighlightFormsOptions } from "./types";

export const highlightForms = async ({
  visionOnly = false,
  testMode = false,
}: HighlightFormsOptions): Promise<void> => {
  const shadowRoot = document.querySelector("#chrome-extension-filliny")?.shadowRoot;

  if (!shadowRoot) {
    console.error("No shadow root found");
    return;
  }

  // Clear previous registry data and use unified detection
  unifiedFieldRegistry.clear();

  // Use our enhanced form detection logic
  const formLikeContainers = await detectFormLikeContainers();
  if (formLikeContainers.length === 0) {
    openCrossOriginIframeInNewTabAndAlert();
    return;
  }

  const overlaysContainer = findOrCreateShadowContainer(shadowRoot);

  // Register all containers in the unified registry for consistency
  for (let i = 0; i < formLikeContainers.length; i++) {
    const container = formLikeContainers[i];
    const containerId = `highlight-container-${i}`;
    try {
      await unifiedFieldRegistry.registerContainer(container, containerId);
      console.log(`✅ Registered container ${containerId} for highlighting`);
    } catch (error) {
      console.error(`❌ Error registering container ${containerId}:`, error);
    }
  }

  // First, clean up all existing overlays and highlights
  const cleanup = async () => {
    // Remove all existing overlays
    const existingOverlays = Array.from(overlaysContainer.querySelectorAll('[id^="overlay-"]'));
    existingOverlays.forEach(overlay => {
      const formId = overlay.id.replace("overlay-", "");
      const form = document.querySelector(`[data-form-id="${formId}"]`) as HTMLElement;
      if (form) {
        form.classList.remove("filliny-pointer-events-none");
        delete form.dataset.fillinyOverlayActive;
        delete form.dataset.formId;
      }
      overlay.remove();
    });

    // Remove all existing highlights
    const highlightedForms = Array.from(document.querySelectorAll("[data-filliny-highlighted]"));
    for (const form of highlightedForms) {
      await removeFormHighlights(form as HTMLElement);
    }
  };

  // Clean up existing overlays and highlights
  await cleanup();

  // Sort forms by their position in the document and logical grouping
  const formsArray = formLikeContainers
    .filter(form => {
      // Filter out forms that are hidden or have no detectable fields
      const style = window.getComputedStyle(form);
      const rect = form.getBoundingClientRect();

      if (style.display === "none" || style.visibility === "hidden") {
        return false;
      }

      if (rect.width === 0 && rect.height === 0) {
        return false;
      }

      return true;
    })
    .sort((a, b) => {
      const rectA = a.getBoundingClientRect();
      const rectB = b.getBoundingClientRect();

      // Sort by vertical position first, then by horizontal position
      if (Math.abs(rectA.top - rectB.top) > 50) {
        return rectA.top - rectB.top;
      }

      return rectA.left - rectB.left;
    });

  console.log(`Processing ${formsArray.length} form containers for highlighting`);

  let index = 0;
  for (const form of formsArray) {
    const formId = `form-${index}`;

    // Set form ID without affecting the form's layout
    form.dataset.formId = formId;

    try {
      if (visionOnly) {
        await removeFormHighlights(form);
        await highlightFormFields(form, index === 0);
        setTimeout(async () => {
          await removeFormHighlights(form);
        }, 2000);
      } else {
        createFormOverlay(form, formId, overlaysContainer, testMode, index === 0);
      }
    } catch (error) {
      console.error(`Error processing form ${formId}:`, error);
    }

    index++;
  }
};

const createFormOverlay = (
  form: HTMLElement,
  formId: string,
  overlaysContainer: HTMLDivElement,
  testMode: boolean,
  isFirstForm: boolean,
): void => {
  if (overlaysContainer.querySelector(`#overlay-${formId}`)) {
    console.warn(`An overlay is already active on form ${formId}.`);
    return;
  }

  // Find the outermost form container for better overlay coverage
  const outermostContainer = findOutermostFormContainer(form);
  console.log(
    `🎯 Using ${outermostContainer === form ? "original" : "outermost"} container for overlay: ${outermostContainer.tagName}${outermostContainer.className ? "." + outermostContainer.className : ""}`,
  );

  // Create container without affecting the form layout
  const formOverlayContainer = document.createElement("div");
  formOverlayContainer.id = `overlay-${formId}`;
  formOverlayContainer.className = "filliny-pointer-events-auto filliny-relative filliny-w-full filliny-h-full";

  // Ensure the overlay container doesn't affect document flow
  formOverlayContainer.style.position = "absolute";
  formOverlayContainer.style.top = "0";
  formOverlayContainer.style.left = "0";
  formOverlayContainer.style.pointerEvents = "none";

  // Get initial position based on the outermost container for better coverage
  const initialPosition = getFormPosition(outermostContainer);

  // Create an Intersection Observer to handle visibility with improved thresholds
  const observer = new IntersectionObserver(
    entries => {
      entries.forEach(entry => {
        const overlay = overlaysContainer.querySelector(`#overlay-${formId}`) as HTMLDivElement | null;
        if (overlay) {
          // Show/hide overlay based on form visibility, but don't hide the first form
          if (!isFirstForm) {
            overlay.style.visibility = entry.isIntersecting ? "visible" : "hidden";
            overlay.style.opacity = entry.isIntersecting ? "1" : "0";
          }
        }
      });
    },
    {
      threshold: [0, 0.1, 0.5], // Multiple thresholds for smoother transitions
      rootMargin: "50px", // Show overlay slightly before form comes into view
    },
  );

  // Start observing the outermost container for better visibility detection
  observer.observe(outermostContainer);

  // Batch DOM operations to minimize reflows and prevent layout issues
  requestAnimationFrame(() => {
    // Add container to shadow DOM first
    overlaysContainer.appendChild(formOverlayContainer);

    const overlayRoot = createRoot(formOverlayContainer);

    const cleanup = () => {
      observer.disconnect();
      overlayRoot.unmount();
      formOverlayContainer.remove();

      // Clean up form state without affecting layout
      requestAnimationFrame(() => {
        form.classList.remove("filliny-pointer-events-none");
        delete form.dataset.fillinyOverlayActive;
        delete form.dataset.formId;
      });
    };

    overlayRoot.render(
      <FormsOverlay formId={formId} initialPosition={initialPosition} onDismiss={cleanup} testMode={testMode} />,
    );

    // Apply form state changes and scroll handling after everything is rendered
    requestAnimationFrame(() => {
      // Mark form as having overlay, but don't disable pointer events unless necessary
      form.dataset.fillinyOverlayActive = "true";

      // Only disable pointer events during active filling to prevent accidental interactions
      // This will be handled by the overlay component itself

      // Wait for next frame to ensure overlay is rendered before scrolling
      requestAnimationFrame(() => {
        if (isFirstForm) {
          const formRect = form.getBoundingClientRect();
          const isFormInView = formRect.top >= -100 && formRect.top <= window.innerHeight + 100;

          if (!isFormInView) {
            const scrollPosition = window.scrollY + formRect.top - 200;
            window.scrollTo({
              top: Math.max(0, scrollPosition),
              behavior: "smooth",
            });
          }
        }
      });
    });
  });
};

const highlightFormFields = async (form: HTMLElement, isFirstForm: boolean = false): Promise<void> => {
  try {
    // Find the container ID for this form in the unified registry
    const containerId = findContainerIdForForm(form);
    if (!containerId) {
      console.warn("Could not find container ID for form highlighting");
      return;
    }

    // Get all fields for this container from the unified registry
    const fieldButtons = unifiedFieldRegistry.getFieldButtonsData(containerId);
    const highlightedElements: HTMLElement[] = [];

    fieldButtons.forEach(buttonData => {
      if (buttonData.element) {
        addGlowingBorder(buttonData.element, "black");
        buttonData.element.dataset.fillinyHighlighted = "true";
        highlightedElements.push(buttonData.element);
      }
    });

    // If there are highlighted elements and this is the first form, scroll to it
    if (highlightedElements.length > 0 && isFirstForm) {
      requestAnimationFrame(() => {
        const formRect = form.getBoundingClientRect();
        const isFormInView = formRect.top >= -100 && formRect.top <= window.innerHeight + 100;

        if (!isFormInView) {
          const scrollPosition = window.scrollY + formRect.top - 200;
          window.scrollTo({
            top: Math.max(0, scrollPosition),
            behavior: "smooth",
          });
        }
      });
    }

    console.log(`Highlighted ${highlightedElements.length} fields in form`);
  } catch (error) {
    console.error("Error highlighting form fields:", error);
  }
};

const findOutermostFormContainer = (form: HTMLElement): HTMLElement => {
  // Walk up the DOM tree to find the outermost meaningful container
  let bestContainer = form;
  let maxFieldCount = 0;

  // Count fields in the original form
  const originalFieldCount = countFormFieldsInElement(form);
  maxFieldCount = originalFieldCount;

  // Walk up parent elements
  let parent = form.parentElement;
  while (parent && parent !== document.body && parent !== document.documentElement) {
    const parentFieldCount = countFormFieldsInElement(parent);

    // If parent has significantly more fields or similar field count with better semantic meaning
    const hasMoreFields = parentFieldCount > maxFieldCount * 1.2;
    const hasSemanticMeaning = isSemanticFormContainer(parent);
    const hasSimilarFields = parentFieldCount >= maxFieldCount * 0.8 && parentFieldCount <= maxFieldCount * 1.2;

    if (hasMoreFields || (hasSimilarFields && hasSemanticMeaning)) {
      bestContainer = parent;
      maxFieldCount = parentFieldCount;
      console.log(`🔄 Found better container: ${parent.tagName}.${parent.className} with ${parentFieldCount} fields`);
    }

    parent = parent.parentElement;
  }

  return bestContainer;
};

const countFormFieldsInElement = (element: HTMLElement): number => {
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

  let count = 0;
  fieldSelectors.forEach(selector => {
    try {
      count += element.querySelectorAll(selector).length;
    } catch {
      // Continue if selector fails
    }
  });

  return count;
};

const isSemanticFormContainer = (element: HTMLElement): boolean => {
  const tagName = element.tagName.toLowerCase();
  const className = element.className.toLowerCase();
  const role = element.getAttribute("role");

  // Check for semantic indicators
  const semanticTags = ["form", "fieldset"];
  const semanticRoles = ["form", "group"];
  const semanticClasses = ["form", "form-container", "form-wrapper", "form-body", "form-content"];

  return (
    semanticTags.includes(tagName) ||
    (role && semanticRoles.includes(role)) ||
    semanticClasses.some(cls => className.includes(cls))
  );
};

const findContainerIdForForm = (form: HTMLElement): string | null => {
  // Find which container ID corresponds to this form
  // We'll match based on the highlight-container pattern we used when registering
  const formId = form.dataset.formId;
  if (formId) {
    // Extract container index from form ID if it exists
    const match = formId.match(/form-(\d+)/);
    if (match) {
      return `highlight-container-${match[1]}`;
    }
  }

  // Fallback: find the container that contains this form
  // This is a bit expensive but necessary for consistency
  return `highlight-container-0`; // Use first container as fallback
};

const removeFormHighlights = async (form: HTMLElement): Promise<void> => {
  try {
    // Find the container ID for this form
    const containerId = findContainerIdForForm(form);
    if (!containerId) {
      console.warn("Could not find container ID for form highlight removal");
      return;
    }

    // Get all fields for this container from the unified registry
    const fieldButtons = unifiedFieldRegistry.getFieldButtonsData(containerId);
    fieldButtons.forEach(buttonData => {
      if (buttonData.element && buttonData.element.dataset.fillinyHighlighted) {
        buttonData.element.style.removeProperty("box-shadow");
        delete buttonData.element.dataset.fillinyHighlighted;
      }
    });
    delete form.dataset.fillinyHighlighted;
  } catch (error) {
    console.error("Error removing form highlights:", error);
  }
};
