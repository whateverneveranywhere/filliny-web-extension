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

  const forms = document.querySelectorAll('form');
  if (forms.length === 0) {
    alert('No form found');
    return;
  }

  const overlaysContainer = findOrCreateShadowContainer(shadowRoot);

  forms.forEach((form, index) => {
    if (form.querySelector('[data-highlight-overlay="true"]')) {
      console.warn('A loading overlay is already active on this form.');
      return;
    }

    const formId = `form-${index}`;
    form.dataset.formId = formId;

    visionOnly ? highlightFormFields(form) : createFormOverlay(form, formId, overlaysContainer);
  });
};

const createFormOverlay = (form: HTMLFormElement, formId: string, overlaysContainer: HTMLDivElement): void => {
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
      }}
    />,
  );

  Object.assign(formElement.style, {
    pointerEvents: 'none',
    position: 'relative',
  });
};

const highlightFormFields = (form: HTMLFormElement): void => {
  const fields = detectFields(form);
  fields.forEach(field => {
    const element = document.querySelector<HTMLElement>(`[data-filliny-id="${field.id}"]`);
    if (element) {
      addGlowingBorder(element, 'black');
    }
  });
};
