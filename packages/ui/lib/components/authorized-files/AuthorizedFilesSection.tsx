import { FolderSelector } from './FolderSelector';
import { LocalFilesList } from './LocalFilesList';
import { toast } from '../../hooks/use-toast';
import { cn } from '../../utils';
import { Button } from '../ui/button';
import { localFilesStorage } from '@extension/storage';
import { FolderOpen, Trash2, Loader2, Info } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import type { AuthorizedFolderData } from '@extension/storage';

interface AuthorizedFilesSectionProps {
  profileId: string | undefined;
}

const AuthorizedFilesSection = ({ profileId }: AuthorizedFilesSectionProps) => {
  const [folderData, setFolderData] = useState<AuthorizedFolderData | undefined>(undefined);
  const [isLoading, setIsLoading] = useState(true);

  // Load folder data from storage when profile changes
  useEffect(() => {
    const loadFolderData = async () => {
      if (!profileId) {
        setFolderData(undefined);
        setIsLoading(false);
        return;
      }

      setIsLoading(true);
      try {
        const data = await localFilesStorage.getProfileFolder(profileId);
        setFolderData(data);
      } catch (err) {
        console.error('Failed to load folder data:', err);
        toast({
          variant: 'destructive',
          title: 'Error',
          description: 'Failed to load authorized folder data.',
        });
      } finally {
        setIsLoading(false);
      }
    };

    loadFolderData();
  }, [profileId]);

  const handleFolderSelected = useCallback(
    async (data: AuthorizedFolderData) => {
      if (!profileId) return;

      try {
        await localFilesStorage.setProfileFolder(profileId, data);
        setFolderData(data);
        toast({
          title: 'Folder authorized',
          description: `${data.files.length} files scanned from "${data.folderName}".`,
        });
      } catch (err) {
        console.error('Failed to save folder data:', err);
        toast({
          variant: 'destructive',
          title: 'Error',
          description: 'Failed to save authorized folder data.',
        });
      }
    },
    [profileId],
  );

  const handleClearFolder = useCallback(async () => {
    if (!profileId) return;

    const confirmed = window.confirm('Are you sure you want to remove the authorized folder?');
    if (!confirmed) return;

    try {
      await localFilesStorage.clearProfileFolder(profileId);
      setFolderData(undefined);
      toast({
        title: 'Folder removed',
        description: 'Authorized folder has been removed.',
      });
    } catch (err) {
      console.error('Failed to clear folder data:', err);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to remove authorized folder.',
      });
    }
  }, [profileId]);

  if (!profileId) {
    return (
      <div className="filliny-flex filliny-flex-col filliny-items-center filliny-justify-center filliny-py-8 filliny-text-center">
        <p className="filliny-text-sm filliny-text-muted-foreground">
          Please save the profile first to configure authorized files.
        </p>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="filliny-flex filliny-items-center filliny-justify-center filliny-py-8">
        <Loader2 className="filliny-h-6 filliny-w-6 filliny-animate-spin filliny-text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="filliny-space-y-4 filliny-min-w-0">
      {/* Header */}
      <div className="filliny-flex filliny-items-start filliny-justify-between filliny-gap-2">
        <div className="filliny-min-w-0 filliny-flex-1">
          <h3 className="filliny-text-sm filliny-font-medium">Authorized Files for Upload</h3>
          <p className="filliny-text-xs filliny-text-muted-foreground">
            Select a folder containing files AI can suggest when filling file upload fields. Only top-level files are
            scanned.
          </p>
        </div>
        {folderData && (
          <Button
            variant="ghost"
            size="sm"
            onClick={handleClearFolder}
            className="filliny-text-destructive hover:filliny-text-destructive filliny-shrink-0">
            <Trash2 className="filliny-mr-1 filliny-h-4 filliny-w-4" />
            Remove
          </Button>
        )}
      </div>

      {/* Folder Selector */}
      <FolderSelector currentFolder={folderData} onFolderSelected={handleFolderSelected} />

      {/* Files List or Empty State with Guidance */}
      {folderData ? (
        <LocalFilesList files={folderData.files} />
      ) : (
        <div
          className={cn(
            'filliny-flex filliny-flex-col filliny-items-center filliny-justify-center filliny-rounded-lg',
            'filliny-border filliny-border-dashed filliny-border-muted-foreground/25 filliny-py-6',
          )}>
          <FolderOpen className="filliny-mb-2 filliny-h-8 filliny-w-8 filliny-text-muted-foreground/50" />
          <p className="filliny-text-sm filliny-font-medium filliny-text-muted-foreground">No folder selected</p>
          <p className="filliny-text-xs filliny-text-muted-foreground/70 filliny-mt-1 filliny-text-center filliny-px-4">
            Create a folder with your files (resumes, photos, certificates)
            <br />
            and select it here for AI to use when filling upload fields.
            <br />
            Only top-level files are scanned — subfolders are not included.
          </p>
        </div>
      )}

      {/* Naming Tips */}
      <div className="filliny-rounded-md filliny-bg-primary/5 filliny-border filliny-border-primary/20 filliny-p-3">
        <div className="filliny-flex filliny-gap-2">
          <Info className="filliny-h-4 filliny-w-4 filliny-text-primary filliny-shrink-0 filliny-mt-0.5" />
          <div>
            <p className="filliny-text-xs filliny-font-medium filliny-text-primary filliny-mb-1">
              Tip: Use descriptive file names
            </p>
            <p className="filliny-text-xs filliny-text-muted-foreground">
              AI matches files by name. Use clear names like <span className="filliny-font-mono">Resume.pdf</span>,{' '}
              <span className="filliny-font-mono">Headshot.jpg</span>, or{' '}
              <span className="filliny-font-mono">Certificate_AWS.pdf</span> so AI can find the right file for each
              upload field.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export { AuthorizedFilesSection };
