/**
 * Console suppressor utility
 *
 * Suppresses all console logging in production builds to prevent
 * debug information from being visible to end users.
 */

// Define the Vite-specific import.meta.env interface
interface ViteImportMeta {
  env: {
    VITE_WEBAPP_ENV?: string;
    MODE?: string;
  };
}

/**
 * Safely checks for Vite import.meta.env
 * Uses eval to avoid static analysis issues with import.meta in non-ESM contexts
 */
const getViteEnv = (): ViteImportMeta['env'] | null => {
  try {
    // Use indirect eval to check for import.meta in browser ESM context
    // This avoids static parsing issues in non-ESM contexts like jiti
    const meta = new Function('return typeof import.meta !== "undefined" ? import.meta : null')();
    if (meta && 'env' in meta) {
      return (meta as ViteImportMeta).env;
    }
  } catch {
    // import.meta not available in this context
  }
  return null;
};

/**
 * Determines if the current environment is production
 */
const isProduction = (): boolean => {
  // Check for Node.js environment
  if (typeof process !== 'undefined' && process.env) {
    return process.env.NODE_ENV === 'production';
  }

  // Check for Vite environment (browser)
  const viteEnv = getViteEnv();
  if (viteEnv) {
    return viteEnv.VITE_WEBAPP_ENV === 'prod' || viteEnv.MODE === 'production';
  }

  // Default to false if environment check fails
  return false;
};

/**
 * Creates a console proxy that suppresses all logging in production
 * but preserves normal behavior in development
 */
const createConsoleProxy = (): Console => {
  // Use the actual console in development
  if (!isProduction()) {
    return console;
  }

  // Create a no-op function
  const noOp = (): void => {};

  // Create a proxy object that intercepts all console method calls
  return new Proxy(console, {
    get: (target, prop) => {
      // For essential methods like console.error that should always work,
      // you could return the original method here instead of noOp

      // Return noOp for all methods to completely silence the console
      if (typeof target[prop as keyof Console] === 'function') {
        return noOp;
      }

      // Return the original property for non-function properties
      return target[prop as keyof Console];
    },
  });
};

/**
 * Installs the console proxy globally
 */
export const suppressConsoleInProduction = (): void => {
  if (isProduction()) {
    // Replace the global console with our proxy in a way that works with TypeScript
    Object.defineProperty(window, 'console', {
      value: createConsoleProxy(),
      writable: false,
      configurable: true,
    });
  }
};

// Auto-execute when imported
if (typeof window !== 'undefined') {
  suppressConsoleInProduction();
}

export default suppressConsoleInProduction;
