// packages/ui/lib/components/filliny-button/search-button/highlightForms.tsx
import { getOverlayContainer } from '@extension/shared';
import { addGlowingBorder, detectFields } from './detectionHelpers';
import { FormsOverlay } from './FormsOverlay';
import { createRoot } from 'react-dom/client';

interface HighlightFormsOptions {
  visionOnly?: boolean;
}

let isHighlighting = false;

export const highlightForms = ({ visionOnly = false }: HighlightFormsOptions): void => {
  if (isHighlighting) {
    console.warn('Highlighting is already in progress.');
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
      console.warn('A loading overlay is already active on this form.');
      return;
    }

    form.dataset.formId = `form-${index}`;

    if (visionOnly) {
      highlightFormFields(form);
      isHighlighting = false;
    } else {
      const overlayContainer = getOverlayContainer();
      const overlayRoot = createRoot(overlayContainer);

      // Get form position and dimensions
      const formRect = form.getBoundingClientRect();
      const scrollX = window.scrollX;
      const scrollY = window.scrollY;

      overlayRoot.render(
        <FormsOverlay
          formId={form.dataset.formId!}
          position={{
            top: formRect.top + scrollY,
            left: formRect.left + scrollX,
            width: formRect.width,
            height: formRect.height,
          }}
          onDismiss={() => {
            overlayRoot.unmount();
            form.style.pointerEvents = 'auto';
            isHighlighting = false;
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
