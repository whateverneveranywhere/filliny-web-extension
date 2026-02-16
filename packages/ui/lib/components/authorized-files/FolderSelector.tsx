import { toast } from '../../hooks/use-toast';
import { cn } from '../../utils';
import { Button } from '../ui/button';
import { FolderOpen, RefreshCw, AlertCircle } from 'lucide-react';
import { useCallback, useState } from 'react';
import type { LocalFileInfo, AuthorizedFolderData } from '@extension/storage';

// Type declarations for File System Access API (not yet in standard TypeScript lib)
declare global {
  interface Window {
    showDirectoryPicker?: (options?: { mode?: 'read' | 'readwrite' }) => Promise<FileSystemDirectoryHandle>;
  }

  interface FileSystemDirectoryHandle {
    values(): AsyncIterableIterator<FileSystemHandle>;
  }
}

interface FolderSelectorProps {
  currentFolder: AuthorizedFolderData | undefined;
  onFolderSelected: (folderData: AuthorizedFolderData) => void;
  disabled?: boolean;
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

      // Only process files at the top level — skip directories entirely
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

const FolderSelector = ({ currentFolder, onFolderSelected, disabled }: FolderSelectorProps) => {
  const [isProcessing, setIsProcessing] = useState(false);
  const [apiSupported] = useState(isFileSystemAccessSupported);

  const handleSelectFolder = useCallback(async () => {
    if (!apiSupported) {
      toast({
        variant: 'destructive',
        title: 'Not supported',
        description: 'Your browser does not support folder selection. Please use Chrome 86 or later.',
      });
      return;
    }

    setIsProcessing(true);

    try {
      // Use the modern File System Access API
      // This opens a native folder picker and returns a handle we can iterate lazily
      if (!window.showDirectoryPicker) {
        throw new Error('showDirectoryPicker not available');
      }
      const dirHandle = await window.showDirectoryPicker({
        mode: 'read',
      });

      const folderName = dirHandle.name;

      // Scan the directory lazily (won't crash on large folders)
      const { files, reachedLimit } = await scanDirectoryHandle(dirHandle);

      if (files.length === 0) {
        toast({
          variant: 'destructive',
          title: 'No valid files found',
          description:
            'No supported files (PDF, images, documents) found at the top level. Subfolders are not scanned — place files directly in the selected folder.',
        });
        return;
      }

      onFolderSelected({
        folderName,
        files,
        lastScanned: Date.now(),
      });

      if (reachedLimit) {
        toast({
          title: 'Some files skipped',
          description: `Only the first ${MAX_FILES_LIMIT} top-level files were imported. Subfolders are not scanned. Consider using a smaller, dedicated folder.`,
        });
      }
    } catch (err) {
      // User cancelled the picker - this is not an error
      if (err instanceof Error && err.name === 'AbortError') {
        return;
      }

      console.error('Error selecting folder:', err);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to access folder. Please try again.',
      });
    } finally {
      setIsProcessing(false);
    }
  }, [apiSupported, onFolderSelected]);

  const hasFolder = !!currentFolder;

  // Show warning if API not supported
  if (!apiSupported) {
    return (
      <div className="filliny-flex filliny-flex-col filliny-gap-2">
        <div className="filliny-flex filliny-items-center filliny-gap-2 filliny-rounded-md filliny-bg-destructive/10 filliny-p-3 filliny-text-sm filliny-text-destructive">
          <AlertCircle className="filliny-h-4 filliny-w-4 filliny-shrink-0" />
          <span>Folder selection requires Chrome 86+. Please update your browser.</span>
        </div>
      </div>
    );
  }

  return (
    <div className="filliny-flex filliny-flex-col filliny-gap-2">
      {/* Select/Rescan Button */}
      <Button
        variant={hasFolder ? 'outline' : 'default'}
        size="sm"
        onClick={handleSelectFolder}
        disabled={disabled || isProcessing}
        className={cn('filliny-w-full', hasFolder && 'filliny-border-dashed')}>
        {isProcessing ? (
          <>
            <RefreshCw className="filliny-mr-2 filliny-h-4 filliny-w-4 filliny-animate-spin" />
            Scanning...
          </>
        ) : hasFolder ? (
          <>
            <RefreshCw className="filliny-mr-2 filliny-h-4 filliny-w-4" />
            Rescan Folder
          </>
        ) : (
          <>
            <FolderOpen className="filliny-mr-2 filliny-h-4 filliny-w-4" />
            Select Folder
          </>
        )}
      </Button>

      {/* Folder Info */}
      {hasFolder && (
        <div className="filliny-text-xs filliny-text-muted-foreground">
          <span className="filliny-font-medium">{currentFolder.folderName}</span>
          <span className="filliny-mx-1">•</span>
          <span>{currentFolder.files.length} files</span>
          <span className="filliny-mx-1">•</span>
          <span>Scanned {new Date(currentFolder.lastScanned).toLocaleDateString()}</span>
        </div>
      )}
    </div>
  );
};

export { FolderSelector };
