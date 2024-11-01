import type { OverlayPosition } from './types';

export const resetOverlays = (): void => {
  document.querySelectorAll<HTMLDivElement>('div[style*="position: absolute"]').forEach(overlay => {
    const parentForm = overlay.closest<HTMLFormElement>('form');
    if (parentForm) {
      parentForm.style.pointerEvents = 'auto';
      delete parentForm.dataset.formId;
    }
    overlay.remove();
  });
};

export const showLoadingIndicator = (formId: string): void => {
  const form = document.querySelector<HTMLFormElement>(`form[data-form-id="${formId}"]`);
  if (!form) return;

  const overlay = form.querySelector<HTMLDivElement>('div[data-highlight-overlay="true"]');
  if (!overlay) return;

  overlay.innerHTML = '';
  overlay.appendChild(createSpinner());
  appendSpinnerAnimation();
};

const createSpinner = (): HTMLDivElement => {
  const spinner = document.createElement('div');
  Object.assign(spinner.style, {
    border: '4px solid rgba(0, 0, 0, 0.1)',
    borderLeftColor: '#fff',
    borderRadius: '50%',
    width: '36px',
    height: '36px',
    animation: 'spin 1s linear infinite',
  });
  return spinner;
};

const appendSpinnerAnimation = (): void => {
  const animation = document.createElement('style');
  animation.innerHTML = `
    @keyframes spin {
      to {
        transform: rotate(360deg);
      }
    }
  `;
  document.head.appendChild(animation);
};

export const disableOtherButtons = (formId: string): void => {
  document.querySelectorAll<HTMLButtonElement>('button[data-form-id]').forEach(button => {
    if (button.dataset.formId !== formId) {
      button.disabled = true;
    }
  });
};

export const addGlowingBorder = (element: HTMLElement, color: string = 'green'): void => {
  Object.assign(element.style, {
    boxShadow: `0 0 10px 2px ${color}`,
    transition: 'box-shadow 0.3s ease-in-out',
  });

  setTimeout(() => {
    element.style.boxShadow = '';
  }, 2000);
};

// domUtils.ts
export const createElementWithStyles = (tag: string, id: string, styles: Partial<CSSStyleDeclaration>): HTMLElement => {
  const element = document.createElement(tag);
  element.id = id;
  Object.assign(element.style, {
    position: 'absolute',
    pointerEvents: 'none',
    ...styles,
  });
  return element;
};

export const getFormPosition = (form: HTMLFormElement): OverlayPosition => {
  const formRect = form.getBoundingClientRect();
  return {
    top: formRect.top,
    left: formRect.left,
    width: formRect.width,
    height: formRect.height,
  };
};

export const findOrCreateShadowContainer = (shadowRoot: ShadowRoot): HTMLDivElement => {
  let container = shadowRoot.querySelector('#filliny-overlays-container') as HTMLDivElement;

  if (!container) {
    container = createElementWithStyles('div', 'filliny-overlays-container', {
      top: '0',
      left: '0',
      width: '100%',
      height: '100%',
    }) as HTMLDivElement;
    shadowRoot.appendChild(container);
  }

  return container;
};
