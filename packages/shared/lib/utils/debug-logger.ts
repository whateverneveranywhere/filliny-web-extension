/**
 * Debug logger utility for development-only logging
 * Logs are suppressed in production builds
 */

/**
 * Extended global interface for accessing process.env in both Node and browser environments
 */
interface ExtendedGlobalThis {
  process?: {
    env?: {
      NODE_ENV?: string;
    };
  };
}

// Static check at module load time - check process.env.NODE_ENV
// This is safe because Vite replaces process.env.NODE_ENV at build time
const DEBUG = (() => {
  try {
    const extendedGlobal = globalThis as unknown as ExtendedGlobalThis;
    const processEnv = extendedGlobal.process?.env;
    if (processEnv?.NODE_ENV === 'development') {
      return true;
    }
    // For browser environments, check if we're in dev mode
    // by looking at the host or other indicators
    if (typeof window !== 'undefined') {
      const hostname = window.location?.hostname || '';
      if (hostname === 'localhost' || hostname === '127.0.0.1' || hostname.includes('.local')) {
        return true;
      }
    }
    return false;
  } catch {
    return false;
  }
})();

/**
 * Debug logger that only logs in development mode
 */
export const debugLog = (...args: unknown[]): void => {
  if (DEBUG) {
    console.log(...args);
  }
};

/**
 * Debug warning that only logs in development mode
 */
export const debugWarn = (...args: unknown[]): void => {
  if (DEBUG) {
    console.warn(...args);
  }
};

/**
 * Debug error - logs in all environments as errors should be visible
 */
export const debugError = (...args: unknown[]): void => {
  console.error(...args);
};

/**
 * Debug group for organized logging in development
 */
export const debugGroup = (label: string): void => {
  if (DEBUG) {
    console.group(label);
  }
};

/**
 * Debug group end
 */
export const debugGroupEnd = (): void => {
  if (DEBUG) {
    console.groupEnd();
  }
};

/**
 * Create a namespaced debug logger
 */
export const createDebugLogger = (
  namespace: string,
): {
  log: (...args: unknown[]) => void;
  warn: (...args: unknown[]) => void;
  error: (...args: unknown[]) => void;
  group: (label: string) => void;
  groupEnd: () => void;
} => ({
  log: (...args: unknown[]) => debugLog(`[${namespace}]`, ...args),
  warn: (...args: unknown[]) => debugWarn(`[${namespace}]`, ...args),
  error: (...args: unknown[]) => debugError(`[${namespace}]`, ...args),
  group: (label: string) => debugGroup(`[${namespace}] ${label}`),
  groupEnd: () => debugGroupEnd(),
});
