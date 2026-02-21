import {
  detectFormLikeContainers,
  isInsideCrossOriginIframe,
  openCrossOriginIframeInNewTabAndAlert,
} from './detectionHelpers';
import { FormsOverlay } from './FormsOverlay';
import { addGlowingBorder, findOrCreateShadowContainer, getFormPosition } from './overlayUtils';
import { unifiedFieldRegistry } from './unifiedFieldDetection';
import { track, AnalyticsEvent } from '@extension/shared';
import { createRoot } from 'react-dom/client';
import type { HighlightFormsOptions } from './types';

const highlightForms = async ({ visionOnly = false, testMode = false }: HighlightFormsOptions): Promise<void> => {
  const shadowRoot = document.querySelector('#chrome-extension-filliny-all')?.shadowRoot;

  if (!shadowRoot) {
    console.error('No shadow root found');
    return;
  }

  // Clear previous registry data and use unified detection
  unifiedFieldRegistry.clear();

  // Use our enhanced form detection logic
  const formLikeContainers = await detectFormLikeContainers();
  if (formLikeContainers.length === 0) {
    if (isInsideCrossOriginIframe()) {
      track(AnalyticsEvent.CROSS_ORIGIN_IFRAME_DETECTED, {
        website_domain: (() => {
          try {
            return window.location.hostname;
          } catch {
            return 'unknown';
          }
        })(),
      });
      openCrossOriginIframeInNewTabAndAlert();
    } else {
      const { showNoFormsDetectedToast } = await import('./toastHelpers');
      showNoFormsDetectedToast();
    }
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
      const formId = overlay.id.replace('overlay-', '');
      const form = document.querySelector(`[data-form-id="${formId}"]`) as HTMLElement;
      if (form) {
        form.classList.remove('filliny-pointer-events-none');
        delete form.dataset.fillinyOverlayActive;
        delete form.dataset.formId;
      }
      overlay.remove();
    });

    // Remove all existing highlights
    const highlightedForms = Array.from(document.querySelectorAll('[data-filliny-highlighted]'));
    for (const form of highlightedForms) {
      await removeFormHighlights(form as HTMLElement);
    }

    // Remove all per-field buttons to prevent stale references
    const fieldButtonContainers = document.querySelectorAll('.filliny-field-button-container');
    fieldButtonContainers.forEach(container => container.remove());
  };

  // Clean up existing overlays and highlights
  await cleanup();

  // Sort forms by their position in the document and logical grouping
  const formsArray = formLikeContainers
    .filter(form => {
      // Filter out forms that are hidden or have no detectable fields
      const style = window.getComputedStyle(form);
      const rect = form.getBoundingClientRect();

      if (style.display === 'none' || style.visibility === 'hidden') {
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

  // Track forms detected
  const totalFieldCount = formsArray.reduce((sum, form) => sum + countFormFieldsInElement(form), 0);
  track(AnalyticsEvent.FORMS_DETECTED, {
    form_count: formsArray.length,
    field_count: totalFieldCount,
    website_domain: (() => {
      try {
        return window.location.hostname;
      } catch {
        return 'unknown';
      }
    })(),
  });

  console.log(`Processing ${formsArray.length} form containers for highlighting`);

  // Log detailed information about each container being processed
  formsArray.forEach((form, idx) => {
    const fieldCount = countFormFieldsInElement(form);
    console.log(`📋 Container ${idx}: ${form.tagName}.${form.className} with ${fieldCount} fields`);
  });

  // Set form IDs for all containers but don't create multiple overlays
  formsArray.forEach((form, index) => {
    const formId = `form-${index}`;
    form.dataset.formId = formId;
  });

  if (visionOnly) {
    // For vision-only mode, highlight all forms temporarily
    for (let index = 0; index < formsArray.length; index++) {
      const form = formsArray[index];
      try {
        await removeFormHighlights(form);
        await highlightFormFields(form, index === 0);
        setTimeout(async () => {
          await removeFormHighlights(form);
        }, 2000);
      } catch (error) {
        console.error(`❌ Error highlighting form ${index}:`, error);
      }
    }
  } else {
    // Track forms highlighted
    track(AnalyticsEvent.FORMS_HIGHLIGHTED, { form_count: formsArray.length });
    // Create ONE single overlay that handles ALL forms
    if (formsArray.length > 0) {
      try {
        await createUnifiedFormOverlay(formsArray, overlaysContainer, testMode);
        console.log(`✅ Created unified overlay for ${formsArray.length} form containers`);
      } catch (error) {
        console.error(`❌ Error creating unified overlay:`, error);
      }
    }
  }

  console.log(`🎉 Completed processing ${formsArray.length} form containers`);
};

/**
 * Create a unified overlay that handles all forms at once
 */
const createUnifiedFormOverlay = async (
  forms: HTMLElement[],
  overlaysContainer: HTMLDivElement,
  testMode: boolean,
): Promise<void> => {
  const unifiedFormId = 'unified-form';

  if (overlaysContainer.querySelector(`#overlay-${unifiedFormId}`)) {
    console.warn(`An unified overlay is already active.`);
    return;
  }

  // Find the best positioned form for overlay positioning (first visible form)
  const primaryForm =
    forms.find(form => {
      const rect = form.getBoundingClientRect();
      return rect.top >= -100 && rect.top <= window.innerHeight + 100;
    }) || forms[0];

  console.log(
    `🎯 Using primary form for overlay positioning: ${primaryForm.tagName}${primaryForm.className ? '.' + primaryForm.className : ''}`,
  );

  // Mark this primary form with the unified form ID to ensure it can be found
  primaryForm.dataset.formId = unifiedFormId;

  // Also add a specific data attribute that FormsOverlay can look for
  primaryForm.setAttribute('data-filliny-unified-form', 'true');

  // Create container without affecting any form layout
  const formOverlayContainer = document.createElement('div');
  formOverlayContainer.id = `overlay-${unifiedFormId}`;
  formOverlayContainer.className = 'filliny-pointer-events-auto filliny-relative filliny-w-full filliny-h-full';

  // Ensure the overlay container doesn't affect document flow
  formOverlayContainer.style.position = 'absolute';
  formOverlayContainer.style.top = '0';
  formOverlayContainer.style.left = '0';
  formOverlayContainer.style.pointerEvents = 'none';

  // Get initial position based on the primary form
  const initialPosition = getFormPosition(primaryForm);

  // Create intersection observers for all forms to handle visibility
  const observers: IntersectionObserver[] = [];
  let isAnyFormVisible = false;

  forms.forEach((form, index) => {
    // Make sure each form has the appropriate data attributes set
    if (index === 0) {
      // Primary form already has the unified ID set above
      form.dataset.fillinyPrimaryForm = 'true';
    } else {
      // Secondary forms get tagged as part of the unified form group
      form.dataset.fillinyUnifiedFormMember = unifiedFormId;
    }

    const observer = new IntersectionObserver(
      () => {
        const overlay = overlaysContainer.querySelector(`#overlay-${unifiedFormId}`) as HTMLDivElement | null;
        if (overlay) {
          // Update visibility based on any form being visible
          const wasVisible = isAnyFormVisible;
          isAnyFormVisible = forms.some(f => {
            const rect = f.getBoundingClientRect();
            return rect.top < window.innerHeight && rect.bottom > 0;
          });

          if (wasVisible !== isAnyFormVisible) {
            overlay.style.visibility = isAnyFormVisible ? 'visible' : 'hidden';
            overlay.style.opacity = isAnyFormVisible ? '1' : '0';
          }
        }
      },
      {
        threshold: [0, 0.1, 0.5],
        rootMargin: '50px',
      },
    );

    observer.observe(form);
    observers.push(observer);
  });

  // Batch DOM operations to minimize reflows
  requestAnimationFrame(() => {
    // Add container to shadow DOM first
    overlaysContainer.appendChild(formOverlayContainer);

    const overlayRoot = createRoot(formOverlayContainer);

    const cleanup = () => {
      observers.forEach(observer => observer.disconnect());
      overlayRoot.unmount();
      formOverlayContainer.remove();

      // Clean up all forms state without affecting layout
      requestAnimationFrame(() => {
        forms.forEach(form => {
          form.classList.remove('filliny-pointer-events-none');
          delete form.dataset.fillinyOverlayActive;
        });
      });
    };

    overlayRoot.render(
      <FormsOverlay formId={unifiedFormId} initialPosition={initialPosition} onDismiss={cleanup} testMode={testMode} />,
    );

    // Apply form state changes after everything is rendered
    requestAnimationFrame(() => {
      // Mark all forms as having overlay
      forms.forEach(form => {
        form.dataset.fillinyOverlayActive = 'true';
      });

      // Scroll to the first visible form
      requestAnimationFrame(() => {
        const primaryFormRect = primaryForm.getBoundingClientRect();
        const isFormInView = primaryFormRect.top >= -100 && primaryFormRect.top <= window.innerHeight + 100;

        if (!isFormInView) {
          const scrollPosition = window.scrollY + primaryFormRect.top - 200;
          window.scrollTo({
            top: Math.max(0, scrollPosition),
            behavior: 'smooth',
          });
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
      console.warn('Could not find container ID for form highlighting');
      return;
    }

    // Get all fields for this container from the unified registry
    const fieldButtons = unifiedFieldRegistry.getFieldButtonsData(containerId);
    const highlightedElements: HTMLElement[] = [];

    fieldButtons.forEach(buttonData => {
      if (buttonData.element) {
        addGlowingBorder(buttonData.element, 'black');
        buttonData.element.dataset.fillinyHighlighted = 'true';
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
            behavior: 'smooth',
          });
        }
      });
    }

    console.log(`Highlighted ${highlightedElements.length} fields in form`);
  } catch (error) {
    console.error('Error highlighting form fields:', error);
  }
};

const countFormFieldsInElement = (element: HTMLElement): number => {
  const fieldSelectors = [
    'input:not([type="hidden"]):not([type="submit"]):not([type="button"]):not([type="reset"])',
    'select',
    'textarea',
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
      console.warn('Could not find container ID for form highlight removal');
      return;
    }

    // Get all fields for this container from the unified registry
    const fieldButtons = unifiedFieldRegistry.getFieldButtonsData(containerId);
    fieldButtons.forEach(buttonData => {
      if (buttonData.element && buttonData.element.dataset.fillinyHighlighted) {
        buttonData.element.style.removeProperty('box-shadow');
        delete buttonData.element.dataset.fillinyHighlighted;
      }
    });
    delete form.dataset.fillinyHighlighted;
  } catch (error) {
    console.error('Error removing form highlights:', error);
  }
};

export { highlightForms };
