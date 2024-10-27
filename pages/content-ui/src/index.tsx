// pages/content-ui/src/index.tsx
import { createRoot } from 'react-dom/client';
import App from '@src/App';
import tailwindcssOutput from '../dist/tailwind-output.css?inline';

// Initialize global style management
const initializeStyles = () => {
  // Create style element for the main page (for overlay content)
  const pageStyles = document.createElement('style');
  pageStyles.id = 'filliny-global-styles';
  pageStyles.textContent = tailwindcssOutput;
  document.head.appendChild(pageStyles);

  return tailwindcssOutput;
};

// Initialize root container for the main extension UI
const initializeMainUI = (styles: string) => {
  const root = document.createElement('div');
  root.id = 'chrome-extension-filliny';
  document.body.append(root);

  const rootIntoShadow = document.createElement('div');
  rootIntoShadow.id = 'shadow-root';

  const shadowRoot = root.attachShadow({ mode: 'open' });

  // Apply styles to shadow DOM
  if (navigator.userAgent.includes('Firefox')) {
    const styleElement = document.createElement('style');
    styleElement.innerHTML = styles;
    shadowRoot.appendChild(styleElement);
  } else {
    const globalStyleSheet = new CSSStyleSheet();
    globalStyleSheet.replaceSync(styles);
    shadowRoot.adoptedStyleSheets = [globalStyleSheet];
  }

  shadowRoot.appendChild(rootIntoShadow);
  return rootIntoShadow;
};

// Initialize overlay container for dynamically injected content
const initializeOverlayContainer = () => {
  const overlayContainer = document.createElement('div');
  overlayContainer.id = 'filliny-overlay-container';
  document.body.appendChild(overlayContainer);
  return overlayContainer;
};

// Main initialization
const styles = initializeStyles();
const mainRoot = initializeMainUI(styles);
initializeOverlayContainer();

// Render main app
createRoot(mainRoot).render(<App />);

// Export a helper for creating overlay roots
export const createOverlayRoot = () => {
  return document.getElementById('filliny-overlay-container');
};
