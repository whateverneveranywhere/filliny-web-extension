import { AuthorizedFileCard } from './AuthorizedFileCard';
import { FileMetadataDialog } from './FileMetadataDialog';
import { FileUploadDialog } from './FileUploadDialog';
import { toast } from '../../hooks/use-toast';
import { cn } from '../../utils';
import { Button } from '../ui/button';
import {
  useAuthorizedFilesQuery,
  useCreateAuthorizedFileMutation,
  useUpdateAuthorizedFileMutation,
  useDeleteAuthorizedFileMutation,
  getFileDownloadUrlService,
} from '@extension/shared';
import { Plus, FileText, Loader2 } from 'lucide-react';
import { useCallback, useState } from 'react';
import type { DTOAuthorizedFile, AuthorizedFileCategory, DTOAuthorizedFileUpdate } from '@extension/shared';

interface AuthorizedFilesSectionProps {
  profileId: string | undefined;
}

const AuthorizedFilesSection = ({ profileId }: AuthorizedFilesSectionProps) => {
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [editingFile, setEditingFile] = useState<DTOAuthorizedFile | null>(null);
  const [deletingFileId, setDeletingFileId] = useState<number | null>(null);

  const { data: files, isLoading, error } = useAuthorizedFilesQuery(profileId);
  const { mutateAsync: createFile, isPending: isCreating } = useCreateAuthorizedFileMutation();
  const { mutateAsync: updateFile, isPending: isUpdating } = useUpdateAuthorizedFileMutation();
  const { mutateAsync: deleteFile } = useDeleteAuthorizedFileMutation();

  const handleUpload = useCallback(
    async (file: File, metadata: { description: string; useCases: string; category: AuthorizedFileCategory }) => {
      if (!profileId) return;

      try {
        await createFile({
          profileId,
          file,
          metadata,
        });

        toast({
          title: 'File uploaded',
          description: `"${file.name}" has been added to your authorized files.`,
        });

        setIsUploadOpen(false);
      } catch (err) {
        console.error('Failed to upload file:', err);
        toast({
          variant: 'destructive',
          title: 'Upload failed',
          description: err instanceof Error ? err.message : 'Failed to upload file. Please try again.',
        });
      }
    },
    [profileId, createFile],
  );

  const handleEdit = useCallback((file: DTOAuthorizedFile) => {
    setEditingFile(file);
  }, []);

  const handleSaveEdit = useCallback(
    async (fileId: string, data: DTOAuthorizedFileUpdate) => {
      if (!profileId) return;

      try {
        await updateFile({
          profileId,
          fileId,
          data,
        });

        toast({
          title: 'File updated',
          description: 'File details have been saved.',
        });

        setEditingFile(null);
      } catch (err) {
        console.error('Failed to update file:', err);
        toast({
          variant: 'destructive',
          title: 'Update failed',
          description: err instanceof Error ? err.message : 'Failed to update file. Please try again.',
        });
      }
    },
    [profileId, updateFile],
  );

  const handleDelete = useCallback(
    async (file: DTOAuthorizedFile) => {
      if (!profileId) return;

      const confirmed = window.confirm(`Are you sure you want to delete "${file.originalFilename}"?`);
      if (!confirmed) return;

      setDeletingFileId(file.id);

      try {
        await deleteFile({
          profileId,
          fileId: String(file.id),
        });

        toast({
          title: 'File deleted',
          description: `"${file.originalFilename}" has been removed.`,
        });
      } catch (err) {
        console.error('Failed to delete file:', err);
        toast({
          variant: 'destructive',
          title: 'Delete failed',
          description: err instanceof Error ? err.message : 'Failed to delete file. Please try again.',
        });
      } finally {
        setDeletingFileId(null);
      }
    },
    [profileId, deleteFile],
  );

  const handleDownload = useCallback(
    async (file: DTOAuthorizedFile) => {
      if (!profileId) return;

      try {
        const { downloadUrl, filename } = await getFileDownloadUrlService(profileId, String(file.id));

        // Create a temporary link and trigger download
        const link = document.createElement('a');
        link.href = downloadUrl;
        link.download = filename;
        link.target = '_blank';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      } catch (err) {
        console.error('Failed to download file:', err);
        toast({
          variant: 'destructive',
          title: 'Download failed',
          description: err instanceof Error ? err.message : 'Failed to download file. Please try again.',
        });
      }
    },
    [profileId],
  );

  if (!profileId) {
    return (
      <div className="filliny-flex filliny-flex-col filliny-items-center filliny-justify-center filliny-py-8 filliny-text-center">
        <p className="filliny-text-sm filliny-text-muted-foreground">
          Please save the profile first to add authorized files.
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

  if (error) {
    return (
      <div className="filliny-flex filliny-flex-col filliny-items-center filliny-justify-center filliny-py-8 filliny-text-center">
        <p className="filliny-text-sm filliny-text-destructive">Failed to load authorized files.</p>
        <p className="filliny-text-xs filliny-text-muted-foreground filliny-mt-1">Please try again later.</p>
      </div>
    );
  }

  return (
    <div className="filliny-space-y-4">
      {/* Header */}
      <div className="filliny-flex filliny-items-center filliny-justify-between">
        <div>
          <h3 className="filliny-text-sm filliny-font-medium">Authorized Files</h3>
          <p className="filliny-text-xs filliny-text-muted-foreground">
            Files that AI can use to fill forms automatically
          </p>
        </div>
        <Button size="sm" onClick={() => setIsUploadOpen(true)}>
          <Plus className="filliny-mr-1 filliny-h-4 filliny-w-4" />
          Add File
        </Button>
      </div>

      {/* Files List */}
      {files && files.length > 0 ? (
        <div className="filliny-grid filliny-gap-3">
          {files.map(file => (
            <AuthorizedFileCard
              key={file.id}
              file={file}
              onEdit={handleEdit}
              onDelete={handleDelete}
              onDownload={handleDownload}
              isDeleting={deletingFileId === file.id}
            />
          ))}
        </div>
      ) : (
        <div
          className={cn(
            'filliny-flex filliny-flex-col filliny-items-center filliny-justify-center filliny-rounded-lg',
            'filliny-border filliny-border-dashed filliny-border-muted-foreground/25 filliny-py-8',
          )}>
          <FileText className="filliny-mb-2 filliny-h-8 filliny-w-8 filliny-text-muted-foreground/50" />
          <p className="filliny-text-sm filliny-text-muted-foreground">No authorized files yet</p>
          <p className="filliny-text-xs filliny-text-muted-foreground/70 filliny-mt-1">
            Add files like your resume, photo, or certificates
          </p>
          <Button variant="outline" size="sm" className="filliny-mt-4" onClick={() => setIsUploadOpen(true)}>
            <Plus className="filliny-mr-1 filliny-h-4 filliny-w-4" />
            Add Your First File
          </Button>
        </div>
      )}

      {/* Upload Dialog */}
      <FileUploadDialog
        open={isUploadOpen}
        onOpenChange={setIsUploadOpen}
        onUpload={handleUpload}
        isUploading={isCreating}
      />

      {/* Edit Dialog */}
      <FileMetadataDialog
        file={editingFile}
        open={!!editingFile}
        onOpenChange={open => !open && setEditingFile(null)}
        onSave={handleSaveEdit}
        isSaving={isUpdating}
      />
    </div>
  );
};

export { AuthorizedFilesSection };
