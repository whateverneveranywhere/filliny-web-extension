/**
 * Chrome API mock - must be imported before any other imports
 */
import { vi } from 'vitest';

// Mock Chrome API - must be set globally before any imports that use it
const mockChrome = {
  runtime: {
    sendMessage: vi.fn(),
    onMessage: {
      addListener: vi.fn(),
      removeListener: vi.fn(),
    },
    lastError: null as chrome.runtime.LastError | null | undefined,
    getURL: vi.fn((path: string) => `chrome-extension://test/${path}`),
    id: 'test-extension-id',
  },
  storage: {
    local: {
      get: vi.fn(),
      set: vi.fn(),
      remove: vi.fn(),
      onChanged: {
        addListener: vi.fn(),
        removeListener: vi.fn(),
      },
    },
    sync: {
      get: vi.fn(),
      set: vi.fn(),
      remove: vi.fn(),
      onChanged: {
        addListener: vi.fn(),
        removeListener: vi.fn(),
      },
    },
    session: {
      get: vi.fn(),
      set: vi.fn(),
      remove: vi.fn(),
      setAccessLevel: vi.fn(),
      onChanged: {
        addListener: vi.fn(),
        removeListener: vi.fn(),
      },
    },
    onChanged: {
      addListener: vi.fn(),
      removeListener: vi.fn(),
    },
  },
  tabs: {
    query: vi.fn(),
    sendMessage: vi.fn(),
    onUpdated: {
      addListener: vi.fn(),
      removeListener: vi.fn(),
    },
  },
  cookies: {
    get: vi.fn(),
    onChanged: {
      addListener: vi.fn(),
      removeListener: vi.fn(),
    },
  },
} as unknown as typeof chrome;

// Assign mock to globalThis.chrome
// Using Object.defineProperty to avoid TypeScript's strict typing
Object.defineProperty(globalThis, 'chrome', {
  value: mockChrome,
  writable: true,
  configurable: true,
});

export { mockChrome };
