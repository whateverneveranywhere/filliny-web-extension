/**
 * Chrome API mock - must be imported before any other imports
 */
import { vi } from 'vitest';
import type { Mock } from 'vitest';

// ============================================================================
// Chrome API Mock Type Definitions
// ============================================================================

interface MockEventHandler {
  addListener: Mock;
  removeListener: Mock;
}

interface MockStorageArea {
  get: Mock;
  set: Mock;
  remove: Mock;
  onChanged: MockEventHandler;
}

interface MockSessionStorageArea extends MockStorageArea {
  setAccessLevel: Mock;
}

interface MockChromeAPI {
  runtime: {
    sendMessage: Mock;
    onMessage: MockEventHandler;
    lastError: chrome.runtime.LastError | null | undefined;
    getURL: Mock;
    id: string;
  };
  storage: {
    local: MockStorageArea;
    sync: MockStorageArea;
    session: MockSessionStorageArea;
    onChanged: MockEventHandler;
  };
  tabs: {
    query: Mock;
    sendMessage: Mock;
    onUpdated: MockEventHandler;
  };
  cookies: {
    get: Mock;
    onChanged: MockEventHandler;
  };
}

// Mock Chrome API - must be set globally before any imports that use it
const mockChrome: MockChromeAPI = {
  runtime: {
    sendMessage: vi.fn(),
    onMessage: {
      addListener: vi.fn(),
      removeListener: vi.fn(),
    },
    lastError: null,
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
};

// Assign mock to globalThis.chrome
// Using Object.defineProperty to avoid TypeScript's strict typing
Object.defineProperty(globalThis, 'chrome', {
  value: mockChrome,
  writable: true,
  configurable: true,
});

export { mockChrome };
