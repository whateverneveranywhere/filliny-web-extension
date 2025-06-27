import "@src/Popup.css";
import { t } from "@extension/i18n";
import { useStorage, withErrorBoundary, withSuspense } from "@extension/shared";
import { exampleThemeStorage } from "@extension/storage";
import { Button, ErrorDisplay, LoadingSpinner } from "@extension/ui";
import type { ComponentPropsWithoutRef } from "react";

const errorMessage = "Failed to activate the content script!";

const Popup = () => {
  const theme = useStorage(exampleThemeStorage);
  const isLight = theme.isLight;
  const logo = "popup/logo.svg";
  const goGithubSite = () =>
    chrome.tabs.create({ url: "https://github.com/Jonghakseo/chrome-extension-boilerplate-react-vite" });

  const activateContentRuntime = async () => {
    try {
      // Get the current active tab
      const [tab] = await chrome.tabs.query({ currentWindow: true, active: true });

      if (!tab || !tab.id) {
        console.error("No active tab found");
        return;
      }

      // Check if we can interact with this URL
      if (tab.url && (tab.url.startsWith("about:") || tab.url.startsWith("chrome:"))) {
        console.error("Cannot interact with this URL type:", errorMessage);
        return;
      }

      // Send a message to activate the content runtime
      chrome.tabs.sendMessage(tab.id, { type: "ACTIVATE_CONTENT_RUNTIME" }, response => {
        if (chrome.runtime.lastError) {
          console.error("Content script communication error:", chrome.runtime.lastError);
          console.error("Failed to communicate with the page. Content script might not be loaded.");
          return;
        }

        console.log("Content runtime activated:", response);
      });
    } catch (err) {
      console.error("Failed to activate content runtime:", err);
    }
  };

  return (
    <div className={`App ${isLight ? "filliny-bg-slate-50" : "filliny-bg-gray-800"}`}>
      <header className={`App-header ${isLight ? "filliny-text-gray-900" : "filliny-text-gray-100"}`}>
        <button onClick={goGithubSite}>
          <img src={chrome.runtime.getURL(logo)} className="App-logo" alt="logo" />
        </button>
        <p>
          Edit <code>pages/popup/src/Popup.tsx</code>
        </p>
        <button
          className={
            "mt-4 rounded px-4 py-1 font-bold shadow hover:scale-105 " +
            (isLight ? "filliny-bg-blue-200 filliny-text-black" : "filliny-bg-gray-700 filliny-text-white")
          }
          onClick={activateContentRuntime}>
          Click to activate Content Script
        </button>
        <ToggleButton>{t("toggleTheme")}</ToggleButton>
      </header>
    </div>
  );
};

const ToggleButton = (props: ComponentPropsWithoutRef<"button">) => (
  <Button variant={"default"} className="bg-slate-50" onClick={exampleThemeStorage.toggle}>
    {props.children}
  </Button>
);

export default withErrorBoundary(withSuspense(Popup, <LoadingSpinner />), ErrorDisplay);
