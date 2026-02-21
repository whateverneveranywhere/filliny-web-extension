/**
 * Pure utility functions for folder scanning.
 * Extracted from FolderSelector.tsx so they can be tested independently
 * without pulling in React component dependencies (Button, toast, etc.).
 */
import type { LocalFileInfo } from '@extension/storage';

// Type declarations for File System Access API (not yet in standard TypeScript lib)
declare global {
  interface Window {
    showDirectoryPicker?: (options?: { mode?: 'read' | 'readwrite' }) => Promise<FileSystemDirectoryHandle>;
  }

  interface FileSystemDirectoryHandle {
    values(): AsyncIterableIterator<FileSystemHandle>;
  }
}

// Maximum number of files to process to prevent memory issues
const MAX_FILES_LIMIT = 100;

// Allowed file extensions for upload fields
const ALLOWED_EXTENSIONS = new Set([
  // Documents
  'pdf',
  'doc',
  'docx',
  'txt',
  'rtf',
  'odt',
  // Images
  'jpg',
  'jpeg',
  'png',
  'gif',
  'webp',
  'svg',
  'bmp',
  'heic',
  'heif',
  // Spreadsheets
  'xls',
  'xlsx',
  'csv',
  'ods',
  // Presentations
  'ppt',
  'pptx',
  'odp',
  // Archives (sometimes needed for job applications)
  'zip',
]);

/**
 * Get MIME type based on file extension
 */
const getMimeType = (extension: string): string => {
  const mimeTypes: Record<string, string> = {
    // Documents
    pdf: 'application/pdf',
    doc: 'application/msword',
    docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    txt: 'text/plain',
    rtf: 'application/rtf',
    odt: 'application/vnd.oasis.opendocument.text',
    // Images
    jpg: 'image/jpeg',
    jpeg: 'image/jpeg',
    png: 'image/png',
    gif: 'image/gif',
    webp: 'image/webp',
    svg: 'image/svg+xml',
    bmp: 'image/bmp',
    heic: 'image/heic',
    heif: 'image/heif',
    // Spreadsheets
    xls: 'application/vnd.ms-excel',
    xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    csv: 'text/csv',
    ods: 'application/vnd.oasis.opendocument.spreadsheet',
    // Presentations
    ppt: 'application/vnd.ms-powerpoint',
    pptx: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    odp: 'application/vnd.oasis.opendocument.presentation',
    // Archives
    zip: 'application/zip',
  };
  return mimeTypes[extension.toLowerCase()] || 'application/octet-stream';
};

/**
 * Check if File System Access API is supported
 */
const isFileSystemAccessSupported = (): boolean => 'showDirectoryPicker' in window;

/**
 * Scan top-level files in a directory using File System Access API.
 * Subdirectories are intentionally skipped to prevent browser crashes
 * when users select large folders (e.g., home dir, projects with node_modules).
 */
const scanDirectoryHandle = async (
  dirHandle: FileSystemDirectoryHandle,
): Promise<{ files: LocalFileInfo[]; reachedLimit: boolean }> => {
  const files: LocalFileInfo[] = [];
  let reachedLimit = false;

  try {
    for await (const entry of dirHandle.values()) {
      if (files.length >= MAX_FILES_LIMIT) {
        reachedLimit = true;
        break;
      }

      // Only process files at the top level -- skip directories entirely
      if (entry.kind !== 'file') continue;

      const fileHandle = entry as FileSystemFileHandle;
      const fileName = fileHandle.name;

      // Skip hidden files and system files
      if (fileName.startsWith('.') || fileName.startsWith('__') || fileName.startsWith('~')) {
        continue;
      }

      // Get extension
      const nameParts = fileName.split('.');
      const extension = nameParts.length > 1 ? (nameParts.pop() || '').toLowerCase() : '';

      // Skip non-allowed file types
      if (!ALLOWED_EXTENSIONS.has(extension)) {
        continue;
      }

      try {
        // Get file to access metadata (this is lazy - only loads metadata, not content)
        const file = await fileHandle.getFile();

        // Skip very large files (> 50MB)
        if (file.size > 50 * 1024 * 1024) {
          continue;
        }

        files.push({
          name: fileName,
          relativePath: fileName,
          extension,
          size: file.size,
          lastModified: file.lastModified,
          mimeType: file.type || getMimeType(extension),
        });
      } catch {
        // Skip files we can't access
        continue;
      }
    }
  } catch (err) {
    console.error('Error scanning directory:', err);
  }

  return { files, reachedLimit };
};

export { getMimeType, scanDirectoryHandle, isFileSystemAccessSupported, ALLOWED_EXTENSIONS, MAX_FILES_LIMIT };
