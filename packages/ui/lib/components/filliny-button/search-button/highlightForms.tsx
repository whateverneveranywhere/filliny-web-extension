import { createRoot } from 'react-dom/client';
import { FormsOverlay } from './FormsOverlay';
import { detectFields } from './detectionHelpers';
import { addGlowingBorder, findOrCreateShadowContainer, getFormPosition } from './overlayUtils';
import type { HighlightFormsOptions } from './types';

export const highlightForms = async ({
  visionOnly = false,
  testMode = false,
}: HighlightFormsOptions): Promise<void> => {
  const shadowRoot = document.querySelector('#chrome-extension-filliny')?.shadowRoot;

  if (!shadowRoot) {
    console.error('No shadow root found');
    return;
  }

  const forms = document.querySelectorAll<HTMLFormElement>('form');
  if (forms.length === 0) {
    alert('No form found');
    return;
  }

  const overlaysContainer = findOrCreateShadowContainer(shadowRoot);

  // First, clean up all existing overlays and highlights
  const cleanup = async () => {
    // Remove all existing overlays
    const existingOverlays = Array.from(overlaysContainer.querySelectorAll('[id^="overlay-"]'));
    existingOverlays.forEach(overlay => {
      const formId = overlay.id.replace('overlay-', '');
      const form = document.querySelector(`[data-form-id="${formId}"]`) as HTMLFormElement;
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
      await removeFormHighlights(form as HTMLFormElement);
    }
  };

  // Clean up existing overlays and highlights
  await cleanup();

  // Convert forms to array and sort by their position in the document
  const formsArray = Array.from(forms).sort((a, b) => {
    const rectA = a.getBoundingClientRect();
    const rectB = b.getBoundingClientRect();
    return rectA.top - rectB.top;
  });

  let index = 0;
  for (const form of formsArray) {
    const formId = `form-${index}`;
    form.dataset.formId = formId;

    if (visionOnly) {
      await removeFormHighlights(form);
      await highlightFormFields(form, index === 0);
      setTimeout(async () => {
        await removeFormHighlights(form);
      }, 2000);
    } else {
      createFormOverlay(form, formId, overlaysContainer, testMode, index === 0);
    }
    index++;
  }
};

const createFormOverlay = (
  form: HTMLFormElement,
  formId: string,
  overlaysContainer: HTMLDivElement,
  testMode: boolean,
  isFirstForm: boolean,
): void => {
  if (overlaysContainer.querySelector(`#overlay-${formId}`)) {
    console.warn(`An overlay is already active on form ${formId}.`);
    return;
  }

  // Create container without affecting the form yet
  const formOverlayContainer = document.createElement('div');
  formOverlayContainer.id = `overlay-${formId}`;
  formOverlayContainer.className = 'filliny-pointer-events-auto filliny-relative filliny-w-full filliny-h-full';

  // Get initial position before making any DOM changes
  const initialPosition = getFormPosition(form);

  // Create an Intersection Observer to handle visibility
  const observer = new IntersectionObserver(
    entries => {
      entries.forEach(entry => {
        const overlay = overlaysContainer.querySelector(`#overlay-${formId}`) as HTMLDivElement | null;
        if (overlay) {
          // Only hide overlays that aren't the first form
          if (!isFirstForm) {
            overlay.style.visibility = entry.isIntersecting ? 'visible' : 'hidden';
          }
        }
      });
    },
    {
      threshold: 0.1, // Show overlay when at least 10% of the form is visible
      rootMargin: '100px', // Add some margin to prevent flickering
    },
  );

  // Start observing the form
  observer.observe(form);

  // Batch DOM operations to minimize reflows and event triggers
  requestAnimationFrame(() => {
    // Use dataset modifications in a single batch
    const formUpdates = () => {
      form.dataset.formId = formId;
      form.dataset.fillinyOverlayActive = 'true';
      form.classList.add('filliny-pointer-events-none');
    };

    // Add container to shadow DOM
    overlaysContainer.appendChild(formOverlayContainer);

    const overlayRoot = createRoot(formOverlayContainer);

    const cleanup = () => {
      observer.disconnect();
      overlayRoot.unmount();
      formOverlayContainer.remove();
      // Batch cleanup operations
      requestAnimationFrame(() => {
        form.classList.remove('filliny-pointer-events-none');
        delete form.dataset.fillinyOverlayActive;
        delete form.dataset.formId;
      });
    };

    overlayRoot.render(
      <FormsOverlay formId={formId} initialPosition={initialPosition} onDismiss={cleanup} testMode={testMode} />,
    );

    // Apply form updates and scroll after everything is rendered
    requestAnimationFrame(() => {
      formUpdates();
      // Wait for next frame to ensure overlay is rendered before scrolling
      requestAnimationFrame(() => {
        if (isFirstForm) {
          const formRect = form.getBoundingClientRect();
          const isFormInView = formRect.top >= 0 && formRect.top <= window.innerHeight;
          if (!isFormInView) {
            const scrollPosition = window.scrollY + formRect.top - 200;
            window.scrollTo({ top: scrollPosition, behavior: 'smooth' });
          }
        }
      });
    });
  });
};

const highlightFormFields = async (form: HTMLFormElement, isFirstForm: boolean = false): Promise<void> => {
  const fields = await detectFields(form);
  const highlightedElements: HTMLElement[] = [];

  fields.forEach(field => {
    const element = form.querySelector<HTMLElement>(`[data-filliny-id="${field.id}"]`);
    if (element) {
      addGlowingBorder(element, 'black');
      element.dataset.fillinyHighlighted = 'true';
      highlightedElements.push(element);
    }
  });

  // If there are highlighted elements and this is the first form, scroll to it
  if (highlightedElements.length > 0 && isFirstForm) {
    requestAnimationFrame(() => {
      const formRect = form.getBoundingClientRect();
      const isFormInView = formRect.top >= 0 && formRect.top <= window.innerHeight;
      if (!isFormInView) {
        const scrollPosition = window.scrollY + formRect.top - 200;
        window.scrollTo({ top: scrollPosition, behavior: 'smooth' });
      }
    });
  }
};

const removeFormHighlights = async (form: HTMLFormElement): Promise<void> => {
  const fields = await detectFields(form);
  fields.forEach(field => {
    const element = form.querySelector<HTMLElement>(`[data-filliny-id="${field.id}"]`);
    if (element && element.dataset.fillinyHighlighted) {
      element.style.removeProperty('box-shadow');
      delete element.dataset.fillinyHighlighted;
    }
  });
  delete form.dataset.fillinyHighlighted;
};
