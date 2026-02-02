/**
 * Test setup for Vitest
 * Provides DOM mocking and Chrome API mocking for unit tests
 */
import { vi, beforeEach } from 'vitest';

// Mock Chrome API
const mockChrome = {
  runtime: {
    sendMessage: vi.fn(),
    onMessage: {
      addListener: vi.fn(),
      removeListener: vi.fn(),
    },
    lastError: null,
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

// @ts-expect-error - Mock chrome global
globalThis.chrome = mockChrome;

// Reset all mocks before each test
beforeEach(() => {
  vi.clearAllMocks();
});

// Export mock for test access
export { mockChrome };
