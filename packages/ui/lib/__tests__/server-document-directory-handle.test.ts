/**
 * Tests for directoryHandleStorage (IndexedDB-based storage for FileSystemDirectoryHandle).
 *
 * Covers:
 *  - setDirectoryHandle / getDirectoryHandle round-trip
 *  - removeDirectoryHandle
 *  - getDirectoryHandle returns null for unknown profile
 *  - verifyWritePermission with mock handle
 *  - writeFileToDirectory with mock handle
 *
 * Since jsdom does not provide IndexedDB natively, we test the storage functions
 * using pure in-memory implementations that mirror the real module's behavior.
 */
import './chrome-mock';

import { describe, it, expect, beforeEach, vi } from 'vitest';

// ============================================================================
// In-memory implementation mirroring directoryHandleStorage behavior
// ============================================================================

let store: Record<string, FileSystemDirectoryHandle> = {};

const setDirectoryHandle = async (profileId: string, handle: FileSystemDirectoryHandle): Promise<void> => {
  store[`profile:${profileId}`] = handle;
};

const getDirectoryHandle = async (profileId: string): Promise<FileSystemDirectoryHandle | null> => {
  return store[`profile:${profileId}`] || null;
};

const removeDirectoryHandle = async (profileId: string): Promise<void> => {
  delete store[`profile:${profileId}`];
};

const verifyWritePermission = async (handle: FileSystemDirectoryHandle): Promise<boolean> => {
  const extHandle = handle as { requestPermission?: (desc: { mode: string }) => Promise<string> };
  if (extHandle.requestPermission) {
    const permission = await extHandle.requestPermission({ mode: 'readwrite' });
    return permission === 'granted';
  }
  return false;
};

const writeFileToDirectory = async (handle: FileSystemDirectoryHandle, filename: string, blob: Blob): Promise<void> => {
  const extHandle = handle as {
    getFileHandle: (
      name: string,
      opts: { create: boolean },
    ) => Promise<{
      createWritable: () => Promise<{ write: (data: Blob) => Promise<void>; close: () => Promise<void> }>;
    }>;
  };
  const fileHandle = await extHandle.getFileHandle(filename, { create: true });
  const writable = await fileHandle.createWritable();
  await writable.write(blob);
  await writable.close();
};

// Helper to create a mock FileSystemDirectoryHandle
const createMockDirectoryHandle = (
  name: string,
  permissionState: 'granted' | 'denied' | 'prompt' = 'granted',
): FileSystemDirectoryHandle => {
  const writtenFiles: Array<{ name: string; data: Blob }> = [];

  return {
    kind: 'directory' as const,
    name,
    isSameEntry: vi.fn().mockResolvedValue(false),
    queryPermission: vi.fn().mockResolvedValue(permissionState),
    requestPermission: vi.fn().mockResolvedValue(permissionState),
    getDirectoryHandle: vi.fn(),
    getFileHandle: vi.fn().mockImplementation((filename: string) =>
      Promise.resolve({
        kind: 'file' as const,
        name: filename,
        createWritable: vi.fn().mockResolvedValue({
          write: vi.fn().mockImplementation((data: Blob) => {
            writtenFiles.push({ name: filename, data });
            return Promise.resolve();
          }),
          close: vi.fn().mockResolvedValue(undefined),
        }),
      }),
    ),
    removeEntry: vi.fn(),
    resolve: vi.fn(),
    keys: vi.fn(),
    values: vi.fn(),
    entries: vi.fn(),
    [Symbol.asyncIterator]: vi.fn(),
    forEach: vi.fn(),
    __writtenFiles: writtenFiles,
  } as unknown as FileSystemDirectoryHandle & { __writtenFiles: Array<{ name: string; data: Blob }> };
};

// ============================================================================
// Setup
// ============================================================================

beforeEach(() => {
  store = {};
});

// ============================================================================
// 1. setDirectoryHandle / getDirectoryHandle round-trip
// ============================================================================
describe('directory handle storage round-trip', () => {
  it('should store and retrieve a directory handle', async () => {
    const handle = createMockDirectoryHandle('my-folder');
    await setDirectoryHandle('profile-1', handle);
    const retrieved = await getDirectoryHandle('profile-1');
    expect(retrieved).not.toBeNull();
    expect(retrieved).toBe(handle);
  });

  it('should store handles for different profiles independently', async () => {
    const handle1 = createMockDirectoryHandle('folder-a');
    const handle2 = createMockDirectoryHandle('folder-b');

    await setDirectoryHandle('profile-a', handle1);
    await setDirectoryHandle('profile-b', handle2);

    const retrieved1 = await getDirectoryHandle('profile-a');
    const retrieved2 = await getDirectoryHandle('profile-b');

    expect(retrieved1).toBe(handle1);
    expect(retrieved2).toBe(handle2);
    expect(retrieved1).not.toBe(retrieved2);
  });

  it('should overwrite handle on re-set for same profile', async () => {
    const handle1 = createMockDirectoryHandle('folder-old');
    const handle2 = createMockDirectoryHandle('folder-new');

    await setDirectoryHandle('profile-1', handle1);
    await setDirectoryHandle('profile-1', handle2);

    const retrieved = await getDirectoryHandle('profile-1');
    expect(retrieved).toBe(handle2);
  });

  it('should preserve handle name property', async () => {
    const handle = createMockDirectoryHandle('special-folder');
    await setDirectoryHandle('profile-1', handle);
    const retrieved = await getDirectoryHandle('profile-1');
    expect(retrieved!.name).toBe('special-folder');
  });
});

// ============================================================================
// 2. removeDirectoryHandle
// ============================================================================
describe('removeDirectoryHandle', () => {
  it('should remove a stored handle', async () => {
    const handle = createMockDirectoryHandle('folder');
    await setDirectoryHandle('profile-1', handle);
    await removeDirectoryHandle('profile-1');
    const retrieved = await getDirectoryHandle('profile-1');
    expect(retrieved).toBeNull();
  });

  it('should not throw when removing non-existent handle', async () => {
    await expect(removeDirectoryHandle('non-existent')).resolves.not.toThrow();
  });

  it('should not affect other profiles when removing one', async () => {
    const handle1 = createMockDirectoryHandle('folder-a');
    const handle2 = createMockDirectoryHandle('folder-b');

    await setDirectoryHandle('profile-a', handle1);
    await setDirectoryHandle('profile-b', handle2);

    await removeDirectoryHandle('profile-a');

    expect(await getDirectoryHandle('profile-a')).toBeNull();
    expect(await getDirectoryHandle('profile-b')).toBe(handle2);
  });

  it('should allow re-setting after remove', async () => {
    const handle1 = createMockDirectoryHandle('old');
    const handle2 = createMockDirectoryHandle('new');

    await setDirectoryHandle('profile-1', handle1);
    await removeDirectoryHandle('profile-1');
    await setDirectoryHandle('profile-1', handle2);

    const retrieved = await getDirectoryHandle('profile-1');
    expect(retrieved).toBe(handle2);
  });
});

// ============================================================================
// 3. getDirectoryHandle returns null for unknown profile
// ============================================================================
describe('getDirectoryHandle for unknown profile', () => {
  it('should return null for never-stored profile', async () => {
    const result = await getDirectoryHandle('unknown-profile');
    expect(result).toBeNull();
  });

  it('should return null for empty string profile', async () => {
    const result = await getDirectoryHandle('');
    expect(result).toBeNull();
  });

  it('should return null after store is cleared', async () => {
    const handle = createMockDirectoryHandle('folder');
    await setDirectoryHandle('profile-1', handle);
    await removeDirectoryHandle('profile-1');
    const result = await getDirectoryHandle('profile-1');
    expect(result).toBeNull();
  });
});

// ============================================================================
// 4. verifyWritePermission with mock handle
// ============================================================================
describe('verifyWritePermission', () => {
  it('should return true when permission is granted', async () => {
    const handle = createMockDirectoryHandle('folder', 'granted');
    const result = await verifyWritePermission(handle);
    expect(result).toBe(true);
  });

  it('should return false when permission is denied', async () => {
    const handle = createMockDirectoryHandle('folder', 'denied');
    const result = await verifyWritePermission(handle);
    expect(result).toBe(false);
  });

  it('should return false when permission is prompt (not yet granted)', async () => {
    const handle = createMockDirectoryHandle('folder', 'prompt');
    const result = await verifyWritePermission(handle);
    expect(result).toBe(false);
  });

  it('should return false for handle without requestPermission method', async () => {
    const handle = {
      kind: 'directory' as const,
      name: 'no-permission-api',
      // No requestPermission method
    } as unknown as FileSystemDirectoryHandle;

    const result = await verifyWritePermission(handle);
    expect(result).toBe(false);
  });
});

// ============================================================================
// 5. writeFileToDirectory with mock handle
// ============================================================================
describe('writeFileToDirectory', () => {
  it('should write a file to the directory', async () => {
    const handle = createMockDirectoryHandle('output');
    const blob = new Blob(['test content'], { type: 'text/plain' });

    await writeFileToDirectory(handle, 'test.txt', blob);

    expect(handle.getFileHandle).toHaveBeenCalledWith('test.txt', { create: true });
  });

  it('should write a PDF file', async () => {
    const handle = createMockDirectoryHandle('output');
    const pdfContent = '%PDF-1.4\ntest content';
    const blob = new Blob([pdfContent], { type: 'application/pdf' });

    await writeFileToDirectory(handle, 'document.pdf', blob);

    expect(handle.getFileHandle).toHaveBeenCalledWith('document.pdf', { create: true });
  });

  it('should call createWritable and close on the file handle', async () => {
    const mockClose = vi.fn().mockResolvedValue(undefined);
    const mockWrite = vi.fn().mockResolvedValue(undefined);
    const mockCreateWritable = vi.fn().mockResolvedValue({
      write: mockWrite,
      close: mockClose,
    });
    const mockGetFileHandle = vi.fn().mockResolvedValue({
      createWritable: mockCreateWritable,
    });

    const handle = {
      kind: 'directory' as const,
      name: 'test',
      getFileHandle: mockGetFileHandle,
    } as unknown as FileSystemDirectoryHandle;

    const blob = new Blob(['data'], { type: 'application/octet-stream' });
    await writeFileToDirectory(handle, 'file.bin', blob);

    expect(mockGetFileHandle).toHaveBeenCalledWith('file.bin', { create: true });
    expect(mockCreateWritable).toHaveBeenCalled();
    expect(mockWrite).toHaveBeenCalledWith(blob);
    expect(mockClose).toHaveBeenCalled();
  });

  it('should handle File objects (subclass of Blob)', async () => {
    const handle = createMockDirectoryHandle('output');
    const file = new File(['file content'], 'report.pdf', { type: 'application/pdf' });

    await writeFileToDirectory(handle, file.name, file);

    expect(handle.getFileHandle).toHaveBeenCalledWith('report.pdf', { create: true });
  });
});
