/**
 * Test setup for Vitest
 * Provides DOM mocking and Chrome API mocking for unit tests
 */
import { vi, beforeEach } from 'vitest';

/**
 * Partial Chrome API mock for testing
 * Only includes the parts we actually use in tests
 */
interface MockChromeAPI {
  runtime: {
    sendMessage: ReturnType<typeof vi.fn>;
    onMessage: {
      addListener: ReturnType<typeof vi.fn>;
      removeListener: ReturnType<typeof vi.fn>;
    };
    lastError: { message?: string } | null | undefined;
    id: string;
  };
  storage: {
    local: {
      get: ReturnType<typeof vi.fn>;
      set: ReturnType<typeof vi.fn>;
      remove: ReturnType<typeof vi.fn>;
    };
    sync: {
      get: ReturnType<typeof vi.fn>;
      set: ReturnType<typeof vi.fn>;
      remove: ReturnType<typeof vi.fn>;
    };
  };
  tabs: {
    query: ReturnType<typeof vi.fn>;
    sendMessage: ReturnType<typeof vi.fn>;
  };
  cookies: {
    get: ReturnType<typeof vi.fn>;
    onChanged: {
      addListener: ReturnType<typeof vi.fn>;
    };
  };
}

// Create a partial mock of the Chrome API with only the parts we use
const mockChrome: MockChromeAPI = {
  runtime: {
    sendMessage: vi.fn(),
    onMessage: {
      addListener: vi.fn(),
      removeListener: vi.fn(),
    },
    lastError: null,
    id: 'test-extension-id',
  },
  storage: {
    local: {
      get: vi.fn(),
      set: vi.fn(),
      remove: vi.fn(),
    },
    sync: {
      get: vi.fn(),
      set: vi.fn(),
      remove: vi.fn(),
    },
  },
  tabs: {
    query: vi.fn(),
    sendMessage: vi.fn(),
  },
  cookies: {
    get: vi.fn(),
    onChanged: {
      addListener: vi.fn(),
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

// Reset all mocks before each test
beforeEach(() => {
  vi.clearAllMocks();
});

// Export mock for test access
export { mockChrome };
export type { MockChromeAPI };
