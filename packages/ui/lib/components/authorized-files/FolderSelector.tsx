import { scanDirectoryHandle, isFileSystemAccessSupported, MAX_FILES_LIMIT } from './folderScanUtils';
import { toast } from '../../hooks/use-toast';
import { cn } from '../../utils';
import { Button } from '../ui/button';
import { setDirectoryHandle } from '@extension/storage';
import { FolderOpen, RefreshCw, AlertCircle } from 'lucide-react';
import { useCallback, useState } from 'react';
import type { AuthorizedFolderData } from '@extension/storage';

interface FolderSelectorProps {
  currentFolder: AuthorizedFolderData | undefined;
  onFolderSelected: (folderData: AuthorizedFolderData) => void;
  disabled?: boolean;
  profileId?: string;
}

const FolderSelector = ({ currentFolder, onFolderSelected, disabled, profileId }: FolderSelectorProps) => {
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
      let dirHandle: FileSystemDirectoryHandle;
      try {
        dirHandle = await window.showDirectoryPicker({
          mode: 'readwrite',
        });
      } catch (rwError) {
        // If readwrite permission denied, fall back to read-only
        if (rwError instanceof DOMException && rwError.name === 'NotAllowedError') {
          dirHandle = await window.showDirectoryPicker({
            mode: 'read',
          });
          toast({
            title: 'Read-only access',
            description: "Write access was denied. Auto-generated files won't be saved to this folder.",
          });
        } else {
          throw rwError;
        }
      }

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

      // Store directory handle in IndexedDB for write access later
      if (profileId) {
        setDirectoryHandle(profileId, dirHandle).catch(err => {
          console.warn('Failed to store directory handle:', err);
        });
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
  }, [apiSupported, onFolderSelected, profileId]);

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
