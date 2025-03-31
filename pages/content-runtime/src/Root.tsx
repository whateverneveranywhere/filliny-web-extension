import { createRoot } from "react-dom/client";
import App from "@src/App";
import injectedStyle from "@src/index.css?inline";

export function mount() {
  // Check if our element already exists to avoid duplication
  const existingRoot = document.getElementById("chrome-extension-filliny");
  if (existingRoot) {
    console.log("Runtime content view: Root element already exists, skipping initialization");
    return;
  }

  // If it doesn't exist, create and append it
  const root = document.createElement("div");
  root.id = "chrome-extension-filliny";

  // Only append to body if it exists
  if (document.body) {
    document.body.append(root);
  } else {
    // If body doesn't exist yet, wait for DOM content loaded
    window.addEventListener("DOMContentLoaded", () => {
      document.body.append(root);
      initializeShadowRoot(root);
    });
    return;
  }

  initializeShadowRoot(root);
}

function initializeShadowRoot(root: HTMLElement) {
  const rootIntoShadow = document.createElement("div");
  rootIntoShadow.id = "filliny-shadow-root";

  const shadowRoot = root.attachShadow({ mode: "open" });

  if (navigator.userAgent.includes("Firefox")) {
    /**
     * In the firefox environment, adoptedStyleSheets cannot be used due to the bug
     * @url https://bugzilla.mozilla.org/show_bug.cgi?id=1770592
     *
     * Injecting styles into the document, this may cause style conflicts with the host page
     */
    const styleElement = document.createElement("style");
    styleElement.innerHTML = injectedStyle;
    shadowRoot.appendChild(styleElement);
  } else {
    /** Inject styles into shadow dom */
    const globalStyleSheet = new CSSStyleSheet();
    globalStyleSheet.replaceSync(injectedStyle);
    shadowRoot.adoptedStyleSheets = [globalStyleSheet];
  }

  shadowRoot.appendChild(rootIntoShadow);
  createRoot(rootIntoShadow).render(<App />);
  // createRoot(rootIntoShadow).render(<></>);
}
