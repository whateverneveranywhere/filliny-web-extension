import { createRoot } from 'react-dom/client';
import { FormsOverlay } from './FormsOverlay';
import { detectFields } from './detectionHelpers';
import { addGlowingBorder, findOrCreateShadowContainer, getFormPosition } from './overlayUtils';
import type { HighlightFormsOptions } from './types';

export const highlightForms = ({ visionOnly = false }: HighlightFormsOptions): void => {
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

  forms.forEach((form, index) => {
    const formId = `form-${index}`;
    form.dataset.formId = formId;

    if (visionOnly) {
      // Remove any existing highlights first
      removeFormHighlights(form);

      // Apply new highlights
      highlightFormFields(form);

      // Remove highlights after 2 seconds
      setTimeout(() => {
        removeFormHighlights(form);
      }, 2000);
    } else {
      if (overlaysContainer.querySelector(`#overlay-${formId}`)) {
        console.warn(`An overlay is already active on form ${formId}.`);
        return;
      }
      createFormOverlay(form, formId, overlaysContainer);
    }
  });
};

const createFormOverlay = (form: HTMLFormElement, formId: string, overlaysContainer: HTMLDivElement): void => {
  if (overlaysContainer.querySelector(`#overlay-${formId}`)) {
    console.warn(`An overlay is already active on form ${formId}.`);
    return;
  }

  const formOverlayContainer = document.createElement('div');
  formOverlayContainer.id = `overlay-${formId}`;
  formOverlayContainer.className = 'filliny-pointer-events-auto filliny-relative filliny-w-full filliny-h-full';
  overlaysContainer.appendChild(formOverlayContainer);

  const overlayRoot = createRoot(formOverlayContainer);
  const formElement = form as HTMLElement;
  const initialPosition = getFormPosition(form);

  const cleanup = () => {
    overlayRoot.unmount();
    formOverlayContainer.remove();
    formElement.classList.remove('filliny-pointer-events-none');
    delete form.dataset.fillinyOverlayActive;
    delete form.dataset.formId;
  };

  overlayRoot.render(<FormsOverlay formId={formId} initialPosition={initialPosition} onDismiss={cleanup} />);

  formElement.classList.add('filliny-pointer-events-none');
  form.dataset.fillinyOverlayActive = 'true';
};

const highlightFormFields = (form: HTMLFormElement): void => {
  const fields = detectFields(form);
  fields.forEach(field => {
    const element = form.querySelector<HTMLElement>(`[data-filliny-id="${field.id}"]`);
    if (element) {
      addGlowingBorder(element, 'black');
      element.dataset.fillinyHighlighted = 'true';
    }
  });
};

const removeFormHighlights = (form: HTMLFormElement): void => {
  const fields = detectFields(form);
  fields.forEach(field => {
    const element = form.querySelector<HTMLElement>(`[data-filliny-id="${field.id}"]`);
    if (element && element.dataset.fillinyHighlighted) {
      element.style.removeProperty('box-shadow');
      delete element.dataset.fillinyHighlighted;
    }
  });
  delete form.dataset.fillinyHighlighted;
};
