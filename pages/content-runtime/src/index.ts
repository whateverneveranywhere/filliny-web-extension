import "@extension/shared/src/utils/console-suppressor";
import { mount } from "@src/Root";

console.log("runtime script loaded");

// Listen for the activation message
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === "ACTIVATE_CONTENT_RUNTIME") {
    // Mount the component
    mount();

    // Send a response back
    sendResponse({ success: true, message: "Content runtime activated" });
  }

  return true; // Keep the message channel open for the async response
});
