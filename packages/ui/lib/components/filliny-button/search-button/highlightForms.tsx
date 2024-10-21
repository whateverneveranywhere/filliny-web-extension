import { FormsOverlay } from './FormsOverlay';
import { addGlowingBorder, detectFields } from './detectionHelpers';
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-expect-error
import tailwindcssOutput from '@src/tailwind-output.css?inline';
import { createRoot } from 'react-dom/client';

interface HighlightFormsOptions {
  visionOnly?: boolean;
}

let isHighlighting = false;

// Function to inject Tailwind CSS into the shadow root
const injectTailwindCSS = (shadowRoot: ShadowRoot) => {
  const styleElement = document.createElement('style');
  styleElement.innerHTML = tailwindcssOutput;
  shadowRoot.appendChild(styleElement);
};

export const highlightForms = ({ visionOnly = false }: HighlightFormsOptions): void => {
  if (isHighlighting) {
    console.warn('Highlighting is already in progress. Not adding another.');
    return; // Prevent adding a new overlay if highlighting is already in progress
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
      return; // Prevent adding a new overlay if the form already has one
    }

    form.dataset.formId = `form-${index}`;

    if (visionOnly) {
      highlightFormFields(form);
    } else {
      const overlayContainer = document.createElement('div');
      const shadowRoot = overlayContainer.attachShadow({ mode: 'open' });

      // Inject Tailwind CSS into the shadow root
      injectTailwindCSS(shadowRoot);

      form.appendChild(overlayContainer);

      const root = createRoot(shadowRoot);
      root.render(
        <FormsOverlay
          formId={form.dataset.formId!}
          onDismiss={() => {
            root.unmount();
            form.style.pointerEvents = 'auto';
            overlayContainer.remove(); // Ensure the overlay is removed
            isHighlighting = false; // Reset the highlighting flag
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
