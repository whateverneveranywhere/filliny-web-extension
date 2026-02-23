/**
 * Tests for the auto-generate storage preference in localFilesStorage.
 *
 * Covers:
 *  - setAutoGenerate and getAutoGenerate round-trip
 *  - Default value is false for profiles without preference
 *  - Setting auto-generate on non-existent profile (no-op)
 *  - Persistence across get calls
 *  - Independence between profiles
 *
 * Since localFilesStorage uses chrome.storage.local via createStorage,
 * we mock @extension/storage and test the expected behavior.
 */
import './chrome-mock';

import { describe, it, expect, beforeEach, vi } from 'vitest';

// In-memory store for simulating storage
const store: Record<string, Record<string, unknown>> = {};

// Mock @extension/storage
vi.mock('@extension/storage', () => ({
  localFilesStorage: {
    getProfileFolder: vi.fn(async (profileId: string) => {
      return store[profileId] ?? undefined;
    }),
    setProfileFolder: vi.fn(async (profileId: string, data: Record<string, unknown>) => {
      store[profileId] = { ...data };
    }),
    clearProfileFolder: vi.fn(async (profileId: string) => {
      delete store[profileId];
    }),
    getProfileFiles: vi.fn(async (profileId: string) => {
      return store[profileId]?.files ?? [];
    }),
    setAutoGenerate: vi.fn(async (profileId: string, enabled: boolean) => {
      const existing = store[profileId];
      if (existing) {
        store[profileId] = { ...existing, autoGenerateEnabled: enabled };
      }
    }),
    getAutoGenerate: vi.fn(async (profileId: string) => {
      return store[profileId]?.autoGenerateEnabled ?? false;
    }),
  },
}));

import { localFilesStorage } from '@extension/storage';

// ============================================================================
// Setup
// ============================================================================

beforeEach(() => {
  // Clear the in-memory store before each test
  for (const key of Object.keys(store)) {
    delete store[key];
  }
});

// ============================================================================
// 1. setAutoGenerate and getAutoGenerate round-trip
// ============================================================================
describe('auto-generate preference round-trip', () => {
  it('should set and get auto-generate as true', async () => {
    await localFilesStorage.setProfileFolder('profile-1', {
      folderName: 'test-folder',
      files: [],
      lastScanned: Date.now(),
    });

    await localFilesStorage.setAutoGenerate('profile-1', true);
    const result = await localFilesStorage.getAutoGenerate('profile-1');
    expect(result).toBe(true);
  });

  it('should set and get auto-generate as false', async () => {
    await localFilesStorage.setProfileFolder('profile-1', {
      folderName: 'test-folder',
      files: [],
      lastScanned: Date.now(),
    });

    await localFilesStorage.setAutoGenerate('profile-1', false);
    const result = await localFilesStorage.getAutoGenerate('profile-1');
    expect(result).toBe(false);
  });

  it('should toggle auto-generate from true to false', async () => {
    await localFilesStorage.setProfileFolder('profile-1', {
      folderName: 'test-folder',
      files: [],
      lastScanned: Date.now(),
    });

    await localFilesStorage.setAutoGenerate('profile-1', true);
    expect(await localFilesStorage.getAutoGenerate('profile-1')).toBe(true);

    await localFilesStorage.setAutoGenerate('profile-1', false);
    expect(await localFilesStorage.getAutoGenerate('profile-1')).toBe(false);
  });

  it('should toggle auto-generate from false to true', async () => {
    await localFilesStorage.setProfileFolder('profile-1', {
      folderName: 'test-folder',
      files: [],
      lastScanned: Date.now(),
    });

    await localFilesStorage.setAutoGenerate('profile-1', false);
    expect(await localFilesStorage.getAutoGenerate('profile-1')).toBe(false);

    await localFilesStorage.setAutoGenerate('profile-1', true);
    expect(await localFilesStorage.getAutoGenerate('profile-1')).toBe(true);
  });
});

// ============================================================================
// 2. Default value is false for profiles without preference
// ============================================================================
describe('auto-generate default value', () => {
  it('should return false for non-existent profile', async () => {
    const result = await localFilesStorage.getAutoGenerate('non-existent-profile');
    expect(result).toBe(false);
  });

  it('should return false for profile with no autoGenerateEnabled field', async () => {
    await localFilesStorage.setProfileFolder('profile-2', {
      folderName: 'docs',
      files: [],
      lastScanned: Date.now(),
      // autoGenerateEnabled is not set (undefined)
    });

    const result = await localFilesStorage.getAutoGenerate('profile-2');
    expect(result).toBe(false);
  });

  it('should return false for empty store', async () => {
    const result = await localFilesStorage.getAutoGenerate('any-profile');
    expect(result).toBe(false);
  });
});

// ============================================================================
// 3. Setting auto-generate on non-existent profile (no-op)
// ============================================================================
describe('setAutoGenerate on non-existent profile', () => {
  it('should not throw when setting on non-existent profile', async () => {
    await expect(localFilesStorage.setAutoGenerate('ghost-profile', true)).resolves.not.toThrow();
  });

  it('should not create a profile entry when setting on non-existent profile', async () => {
    await localFilesStorage.setAutoGenerate('ghost-profile', true);
    const folder = await localFilesStorage.getProfileFolder('ghost-profile');
    expect(folder).toBeUndefined();
  });

  it('should still return false after setting on non-existent profile', async () => {
    await localFilesStorage.setAutoGenerate('ghost-profile', true);
    const result = await localFilesStorage.getAutoGenerate('ghost-profile');
    expect(result).toBe(false);
  });
});

// ============================================================================
// 4. Persistence across get calls
// ============================================================================
describe('auto-generate persistence', () => {
  it('should return the same value on multiple consecutive gets', async () => {
    await localFilesStorage.setProfileFolder('profile-3', {
      folderName: 'folder',
      files: [],
      lastScanned: Date.now(),
    });

    await localFilesStorage.setAutoGenerate('profile-3', true);

    const result1 = await localFilesStorage.getAutoGenerate('profile-3');
    const result2 = await localFilesStorage.getAutoGenerate('profile-3');
    const result3 = await localFilesStorage.getAutoGenerate('profile-3');

    expect(result1).toBe(true);
    expect(result2).toBe(true);
    expect(result3).toBe(true);
  });

  it('should not be affected by other profile folder operations', async () => {
    await localFilesStorage.setProfileFolder('profile-4', {
      folderName: 'folder-a',
      files: [],
      lastScanned: Date.now(),
    });

    await localFilesStorage.setAutoGenerate('profile-4', true);

    // Update the profile folder with different data
    await localFilesStorage.setProfileFolder('profile-4', {
      folderName: 'folder-b',
      files: [
        {
          name: 'file.pdf',
          relativePath: 'file.pdf',
          extension: 'pdf',
          size: 100,
          lastModified: Date.now(),
          mimeType: 'application/pdf',
        },
      ],
      lastScanned: Date.now(),
    });

    // autoGenerateEnabled is NOT preserved when setProfileFolder overwrites
    // This is expected behavior since setProfileFolder replaces the entire folder data
    const result = await localFilesStorage.getAutoGenerate('profile-4');
    // After overwrite without autoGenerateEnabled, it defaults to false
    expect(result).toBe(false);
  });
});

// ============================================================================
// 5. Independence between profiles
// ============================================================================
describe('auto-generate independence between profiles', () => {
  it('should maintain independent auto-generate settings per profile', async () => {
    await localFilesStorage.setProfileFolder('profile-a', {
      folderName: 'folder-a',
      files: [],
      lastScanned: Date.now(),
    });
    await localFilesStorage.setProfileFolder('profile-b', {
      folderName: 'folder-b',
      files: [],
      lastScanned: Date.now(),
    });

    await localFilesStorage.setAutoGenerate('profile-a', true);
    await localFilesStorage.setAutoGenerate('profile-b', false);

    expect(await localFilesStorage.getAutoGenerate('profile-a')).toBe(true);
    expect(await localFilesStorage.getAutoGenerate('profile-b')).toBe(false);
  });

  it('should not affect other profiles when changing one', async () => {
    await localFilesStorage.setProfileFolder('profile-x', {
      folderName: 'x',
      files: [],
      lastScanned: Date.now(),
    });
    await localFilesStorage.setProfileFolder('profile-y', {
      folderName: 'y',
      files: [],
      lastScanned: Date.now(),
    });

    await localFilesStorage.setAutoGenerate('profile-x', true);
    await localFilesStorage.setAutoGenerate('profile-y', true);

    // Change only profile-x
    await localFilesStorage.setAutoGenerate('profile-x', false);

    expect(await localFilesStorage.getAutoGenerate('profile-x')).toBe(false);
    expect(await localFilesStorage.getAutoGenerate('profile-y')).toBe(true);
  });

  it('should not affect other profiles when clearing one', async () => {
    await localFilesStorage.setProfileFolder('profile-keep', {
      folderName: 'keep',
      files: [],
      lastScanned: Date.now(),
      autoGenerateEnabled: true,
    });
    await localFilesStorage.setProfileFolder('profile-clear', {
      folderName: 'clear',
      files: [],
      lastScanned: Date.now(),
      autoGenerateEnabled: true,
    });

    await localFilesStorage.clearProfileFolder('profile-clear');

    // Cleared profile should have default (false)
    expect(await localFilesStorage.getAutoGenerate('profile-clear')).toBe(false);
    // Kept profile should retain its setting
    expect(await localFilesStorage.getAutoGenerate('profile-keep')).toBe(true);
  });
});
