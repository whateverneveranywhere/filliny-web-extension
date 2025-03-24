import "@extension/shared/src/utils/console-suppressor";
import { sampleFunction } from "@src/sampleFunction";

// Make sure this statement is preserved in the build
console.log("content script loaded");

// Shows how to call a function defined in another module
sampleFunction();

// Export a dummy function to ensure code isn't tree-shaken
export function contentLoadedMarker() {
  return "content script loaded";
}
