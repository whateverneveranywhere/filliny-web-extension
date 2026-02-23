/**
 * Integration tests for the overall auto-generate documents flow using mocks.
 *
 * Covers:
 *  - Mock chrome.runtime.sendMessage for GENERATE_DOCUMENT_FOR_FIELD
 *  - generateFileForField creates proper File objects
 *  - Timeout handling
 *  - Error propagation
 *  - saveToAuthorizedFolder with mocked directory handle
 *
 * Note: generateFileForField uses Promise.race with a 30s timeout. When the
 * sendMessage callback resolves before the timeout, the dangling timeout promise
 * eventually rejects. We suppress these expected unhandled rejections via a
 * process-level handler.
 */
import './chrome-mock';

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { mockChrome } from './chrome-mock.js';

// Mock @extension/shared
vi.mock('@extension/shared', () => ({
  MessageType: {
    GENERATE_DOCUMENT_FOR_FIELD: 'GENERATE_DOCUMENT_FOR_FIELD',
  },
}));

// Mock directory handle storage functions
const mockGetDirectoryHandle = vi.fn();
const mockVerifyWritePermission = vi.fn();
const mockWriteFileToDirectory = vi.fn();

vi.mock('@extension/storage', () => ({
  getDirectoryHandle: (...args: unknown[]) => mockGetDirectoryHandle(...args),
  verifyWritePermission: (...args: unknown[]) => mockVerifyWritePermission(...args),
  writeFileToDirectory: (...args: unknown[]) => mockWriteFileToDirectory(...args),
}));

import {
  generateFileForField,
  saveToAuthorizedFolder,
} from '../components/filliny-button/search-button/field-types/fileGenerationService.js';

// ============================================================================
// Suppress expected unhandled rejections from Promise.race timeout
// ============================================================================

const expectedErrors = [
  'Document generation timed out',
  'Generation failed',
  'Invalid response from document generation',
  'Extension context invalidated',
];

const processUnhandledRejectionHandler = (reason: unknown) => {
  const message = reason instanceof Error ? reason.message : String(reason);
  if (expectedErrors.some(s => message.includes(s))) {
    // Suppress: this is the dangling Promise.race timeout rejection
    return;
  }
  // Re-throw unexpected rejections
  throw reason;
};

// ============================================================================
// Setup
// ============================================================================

beforeEach(() => {
  vi.clearAllMocks();
  vi.useFakeTimers({ shouldAdvanceTime: true });
  mockGetDirectoryHandle.mockReset();
  mockVerifyWritePermission.mockReset();
  mockWriteFileToDirectory.mockReset();
  process.on('unhandledRejection', processUnhandledRejectionHandler);
});

afterEach(async () => {
  // Flush all pending timers so the dangling timeout fires (and gets suppressed)
  try {
    await vi.advanceTimersByTimeAsync(60_000);
  } catch {
    // Expected: dangling timeout rejection from Promise.race
  }
  vi.useRealTimers();
  process.removeListener('unhandledRejection', processUnhandledRejectionHandler);
});

// ============================================================================
// Helper: simulate chrome.runtime.sendMessage response
// ============================================================================

const setupSendMessageResponse = (response: unknown) => {
  mockChrome.runtime.sendMessage.mockImplementation((_message: unknown, callback: (response: unknown) => void) => {
    // Simulate async response
    setTimeout(() => {
      callback(response);
    }, 10);
  });
};

const setupSendMessageError = (errorMessage: string) => {
  mockChrome.runtime.sendMessage.mockImplementation((_message: unknown, callback: (response: unknown) => void) => {
    mockChrome.runtime.lastError = { message: errorMessage };
    setTimeout(() => {
      callback({ error: errorMessage });
    }, 10);
    // Reset lastError after callback
    setTimeout(() => {
      mockChrome.runtime.lastError = null;
    }, 20);
  });
};

// ============================================================================
// 1. generateFileForField creates proper File objects
// ============================================================================
describe('generateFileForField - successful generation', () => {
  it('should create a File from the response arrayBuffer', async () => {
    const pdfContent = new TextEncoder().encode('%PDF-1.4\ntest');
    setupSendMessageResponse({
      arrayBuffer: Array.from(pdfContent),
      filename: 'Generated-CL.pdf',
      mimeType: 'application/pdf',
      docId: 42,
    });

    const resultPromise = generateFileForField('profile-1', 'website-1', 'Resume Upload');
    await vi.advanceTimersByTimeAsync(50);
    const result = await resultPromise;

    expect(result.file).toBeInstanceOf(File);
    expect(result.file.name).toBe('Generated-CL.pdf');
    expect(result.file.type).toBe('application/pdf');
    expect(result.docId).toBe(42);
    expect(result.filename).toBe('Generated-CL.pdf');
    expect(result.mimeType).toBe('application/pdf');
  });

  it('should default mimeType to application/pdf when not provided', async () => {
    const content = new TextEncoder().encode('test content');
    setupSendMessageResponse({
      arrayBuffer: Array.from(content),
      filename: 'doc.pdf',
      docId: 1,
      // mimeType is omitted
    });

    const resultPromise = generateFileForField('p1', 'w1', 'file upload');
    await vi.advanceTimersByTimeAsync(50);
    const result = await resultPromise;

    expect(result.mimeType).toBe('application/pdf');
    expect(result.file.type).toBe('application/pdf');
  });

  it('should default docId to 0 when not provided', async () => {
    const content = new TextEncoder().encode('data');
    setupSendMessageResponse({
      arrayBuffer: Array.from(content),
      filename: 'file.pdf',
      mimeType: 'application/pdf',
      // docId is omitted
    });

    const resultPromise = generateFileForField('p1', 'w1', 'upload');
    await vi.advanceTimersByTimeAsync(50);
    const result = await resultPromise;

    expect(result.docId).toBe(0);
  });

  it('should send correct message structure to background script', async () => {
    const content = new TextEncoder().encode('data');
    setupSendMessageResponse({
      arrayBuffer: Array.from(content),
      filename: 'result.pdf',
      mimeType: 'application/pdf',
      docId: 10,
    });

    const resultPromise = generateFileForField('prof-123', 'web-456', 'Cover Letter', 'Upload in PDF', '.pdf,.docx');
    await vi.advanceTimersByTimeAsync(50);
    await resultPromise;

    expect(mockChrome.runtime.sendMessage).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'GENERATE_DOCUMENT_FOR_FIELD',
        profileId: 'prof-123',
        websiteId: 'web-456',
        fieldLabel: 'Cover Letter',
        fieldDescription: 'Upload in PDF',
        acceptTypes: '.pdf,.docx',
      }),
      expect.any(Function),
    );
  });

  it('should handle optional parameters as undefined', async () => {
    const content = new TextEncoder().encode('data');
    setupSendMessageResponse({
      arrayBuffer: Array.from(content),
      filename: 'output.pdf',
      mimeType: 'application/pdf',
      docId: 5,
    });

    const resultPromise = generateFileForField('p1', 'w1', 'upload field');
    await vi.advanceTimersByTimeAsync(50);
    await resultPromise;

    expect(mockChrome.runtime.sendMessage).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'GENERATE_DOCUMENT_FOR_FIELD',
        profileId: 'p1',
        websiteId: 'w1',
        fieldLabel: 'upload field',
        fieldDescription: undefined,
        acceptTypes: undefined,
      }),
      expect.any(Function),
    );
  });
});

// ============================================================================
// 2. Error propagation
// ============================================================================
describe('generateFileForField - error handling', () => {
  it('should throw when response contains error', async () => {
    setupSendMessageResponse({
      error: 'Generation failed: quota exceeded',
    });

    const resultPromise = generateFileForField('p1', 'w1', 'upload');
    await vi.advanceTimersByTimeAsync(50);

    await expect(resultPromise).rejects.toThrow('Generation failed: quota exceeded');
  });

  it('should throw when response has no arrayBuffer', async () => {
    setupSendMessageResponse({
      filename: 'file.pdf',
      mimeType: 'application/pdf',
      docId: 1,
      // arrayBuffer is missing
    });

    const resultPromise = generateFileForField('p1', 'w1', 'upload');
    await vi.advanceTimersByTimeAsync(50);

    await expect(resultPromise).rejects.toThrow('Invalid response from document generation');
  });

  it('should throw when response has no filename', async () => {
    setupSendMessageResponse({
      arrayBuffer: [1, 2, 3],
      mimeType: 'application/pdf',
      docId: 1,
      // filename is missing
    });

    const resultPromise = generateFileForField('p1', 'w1', 'upload');
    await vi.advanceTimersByTimeAsync(50);

    await expect(resultPromise).rejects.toThrow('Invalid response from document generation');
  });

  it('should propagate chrome.runtime.lastError', async () => {
    setupSendMessageError('Extension context invalidated');

    const resultPromise = generateFileForField('p1', 'w1', 'upload');
    await vi.advanceTimersByTimeAsync(50);

    await expect(resultPromise).rejects.toThrow('Extension context invalidated');
  });
});

// ============================================================================
// 3. Timeout handling
// ============================================================================
describe('generateFileForField - timeout', () => {
  it('should reject after 30 seconds timeout', async () => {
    // Never call the callback to simulate a hanging request
    mockChrome.runtime.sendMessage.mockImplementation(() => {
      // Intentionally not calling callback
    });

    const resultPromise = generateFileForField('p1', 'w1', 'upload');

    // Advance timer to just before timeout
    await vi.advanceTimersByTimeAsync(29_000);
    // The promise should still be pending (not rejected yet)

    // Advance past the timeout
    await vi.advanceTimersByTimeAsync(2_000);

    await expect(resultPromise).rejects.toThrow('Document generation timed out');
  });
});

// ============================================================================
// 4. saveToAuthorizedFolder with mocked directory handle
// ============================================================================
describe('saveToAuthorizedFolder', () => {
  it('should skip silently when no directory handle exists', async () => {
    mockGetDirectoryHandle.mockResolvedValue(null);

    const file = new File(['content'], 'test.pdf', { type: 'application/pdf' });
    await saveToAuthorizedFolder('profile-1', file);

    expect(mockGetDirectoryHandle).toHaveBeenCalledWith('profile-1');
    expect(mockVerifyWritePermission).not.toHaveBeenCalled();
    expect(mockWriteFileToDirectory).not.toHaveBeenCalled();
  });

  it('should skip silently when write permission is denied', async () => {
    const mockHandle = { name: 'folder' };
    mockGetDirectoryHandle.mockResolvedValue(mockHandle);
    mockVerifyWritePermission.mockResolvedValue(false);

    const file = new File(['content'], 'test.pdf', { type: 'application/pdf' });
    await saveToAuthorizedFolder('profile-1', file);

    expect(mockGetDirectoryHandle).toHaveBeenCalledWith('profile-1');
    expect(mockVerifyWritePermission).toHaveBeenCalledWith(mockHandle);
    expect(mockWriteFileToDirectory).not.toHaveBeenCalled();
  });

  it('should write file when handle exists and permission is granted', async () => {
    const mockHandle = { name: 'folder' };
    mockGetDirectoryHandle.mockResolvedValue(mockHandle);
    mockVerifyWritePermission.mockResolvedValue(true);
    mockWriteFileToDirectory.mockResolvedValue(undefined);

    const file = new File(['content'], 'generated.pdf', { type: 'application/pdf' });
    await saveToAuthorizedFolder('profile-1', file);

    expect(mockWriteFileToDirectory).toHaveBeenCalledWith(mockHandle, 'generated.pdf', file);
  });

  it('should not throw when writeFileToDirectory fails', async () => {
    const mockHandle = { name: 'folder' };
    mockGetDirectoryHandle.mockResolvedValue(mockHandle);
    mockVerifyWritePermission.mockResolvedValue(true);
    mockWriteFileToDirectory.mockRejectedValue(new Error('Write failed'));

    const file = new File(['content'], 'broken.pdf', { type: 'application/pdf' });

    // Should not throw - errors are caught internally
    await expect(saveToAuthorizedFolder('profile-1', file)).resolves.not.toThrow();
  });

  it('should not throw when getDirectoryHandle fails', async () => {
    mockGetDirectoryHandle.mockRejectedValue(new Error('IDB error'));

    const file = new File(['content'], 'test.pdf', { type: 'application/pdf' });

    await expect(saveToAuthorizedFolder('profile-1', file)).resolves.not.toThrow();
  });
});
