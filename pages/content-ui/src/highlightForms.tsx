import { createRoot } from 'react-dom/client';
import { createOverlayRoot } from '.';
import { FormsOverlay } from '@extension/ui/lib/components/filliny-button/search-button/FormsOverlay';
import {
  addGlowingBorder,
  detectFields,
} from '@extension/ui/lib/components/filliny-button/search-button/detectionHelpers';

interface HighlightFormsOptions {
  visionOnly?: boolean;
}

let isHighlighting = false;

export const highlightFormsNew = ({ visionOnly = false }: HighlightFormsOptions): void => {
  if (isHighlighting) {
    console.warn('Highlighting is already in progress. Not adding another.');
    return;
  }

  const forms = document.querySelectorAll('form');
  if (forms.length === 0) {
    alert('No form found');
    return;
  }

  isHighlighting = true;

  forms.forEach((form, index) => {
    if (form.querySelector('[data-highlight-overlay="true"]')) {
      console.warn('A loading overlay is already active on this form. Skipping.');
      return;
    }

    form.dataset.formId = `form-${index}`;

    if (visionOnly) {
      highlightFormFields(form);
      isHighlighting = false; // Reset after highlighting fields without overlay
    } else {
      const overlayContainer = createOverlayRoot();
      if (!overlayContainer) {
        console.error('Overlay container not found');
        return;
      }
      const shadowRoot = overlayContainer.attachShadow({ mode: 'open' });

      form.appendChild(overlayContainer);

      const root = createRoot(shadowRoot);
      root.render(
        <FormsOverlay
          formId={form.dataset.formId!}
          onDismiss={() => {
            root.unmount();
            form.style.pointerEvents = 'auto';
            overlayContainer.remove();
            isHighlighting = false; // Reset after overlay removal
          }}
        />,
      );

      form.style.pointerEvents = 'none';
      form.style.position = 'relative';
    }
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
