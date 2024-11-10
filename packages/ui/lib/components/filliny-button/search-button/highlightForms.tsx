import { createRoot } from 'react-dom/client';
import { FormsOverlay } from './FormsOverlay';
import { addGlowingBorder, detectFields } from './detectionHelpers';
import { createElementWithStyles, findOrCreateShadowContainer, getFormPosition } from './overlayUtils';
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
      if (form.dataset.fillinyHighlighted === 'true') {
        console.warn(`Highlights already exist for form ${formId}.`);
        return;
      }
      highlightFormFields(form);
      form.dataset.fillinyHighlighted = 'true';
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

  const formOverlayContainer = createElementWithStyles('div', `overlay-${formId}`, {});
  overlaysContainer.appendChild(formOverlayContainer);

  const overlayRoot = createRoot(formOverlayContainer);
  const formElement = form as HTMLElement;

  const initialPosition = getFormPosition(form);

  overlayRoot.render(
    <FormsOverlay
      formId={formId}
      initialPosition={initialPosition}
      onDismiss={() => {
        overlayRoot.unmount();
        formOverlayContainer.remove();
        formElement.style.pointerEvents = 'auto';
        delete form.dataset.fillinyOverlayActive;
      }}
    />,
  );

  Object.assign(formElement.style, {
    pointerEvents: 'none',
  });

  form.dataset.fillinyOverlayActive = 'true';
};

const highlightFormFields = (form: HTMLFormElement): void => {
  const fields = detectFields(form);
  fields.forEach(field => {
    const element = form.querySelector<HTMLElement>(`[data-filliny-id="${field.id}"]`);
    if (element && !element.dataset.fillinyHighlighted) {
      addGlowingBorder(element, 'black');
      element.dataset.fillinyHighlighted = 'true';
    }
  });
};
