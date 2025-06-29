import { FieldFillManager } from "./components/FieldFillManager";
import { unifiedShadowDOM, injectComponent } from "../../../utils/unified-shadow-dom";
import { useEffect, useState } from "react";
import type React from "react";

export interface SearchButtonMainProps {
  css?: string;
}

/**
 * Main Search Button Component - Entry point for all field detection and overlay functionality
 */
export const SearchButtonMain: React.FC<SearchButtonMainProps> = ({ css }) => {
  const [isInitialized, setIsInitialized] = useState(false);
  const [initError, setInitError] = useState<string | null>(null);

  useEffect(() => {
    const initializeSearchButton = async () => {
      try {
        console.log("🚀 Initializing Search Button with unified shadow DOM...");

        // Initialize shadow DOM with CSS
        await unifiedShadowDOM.initialize({
          css,
          shadowHostId: "chrome-extension-filliny-search-button",
        });

        setIsInitialized(true);
        console.log("✅ Search Button initialized successfully");
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : "Unknown error";
        console.error("❌ Failed to initialize Search Button:", error);
        setInitError(errorMessage);
      }
    };

    // Only initialize if not already initialized
    if (!isInitialized && !initError) {
      initializeSearchButton();
    }
  }, [isInitialized, initError, css]);

  // Show error state if initialization failed
  if (initError) {
    console.error("Search Button initialization failed:", initError);
    return null; // Silent failure for browser extension
  }

  // Don't render anything until initialization is complete
  if (!isInitialized) {
    return null;
  }

  return <FieldFillManager />;
};

export interface InitializeSearchButtonConfig {
  css?: string;
  shadowHostId?: string;
}

/**
 * Initialize the search button system with CSS support
 * This is the main entry point for the search button functionality
 */
export const initializeSearchButton = async (config: InitializeSearchButtonConfig = {}): Promise<void> => {
  try {
    console.log("🔧 Starting search button system initialization...");

    const { css, shadowHostId = "chrome-extension-filliny-search-button" } = config;

    // Initialize shadow DOM with CSS first
    await unifiedShadowDOM.initialize({
      css,
      shadowHostId,
    });

    // Use the unified shadow DOM injection system
    await injectComponent({
      containerId: "search-button-main",
      component: <SearchButtonMain css={css} />,
      zIndex: 999999,
      isolate: true,
      onError: (error: Error) => {
        console.error("❌ Search button component error:", error);
      },
    });

    console.log("✅ Search button system initialization complete");
  } catch (error) {
    console.error("❌ Failed to initialize search button system:", error);
    throw error; // Re-throw to allow caller to handle
  }
};

/**
 * Cleanup search button system
 */
export const cleanupSearchButton = (): void => {
  try {
    unifiedShadowDOM.cleanupContainer("search-button-main");
    console.log("✅ Search button system cleanup complete");
  } catch (error) {
    console.error("❌ Error cleaning up search button system:", error);
  }
};

// Default export for the main component
export default SearchButtonMain;

// Export for legacy compatibility
export { highlightForms } from "./highlightForms";
export { handleFormClick } from "./handleFormClick";
export { handleFieldFill } from "./index";
export { handleTestFieldFill } from "./handleTestFieldFill";
