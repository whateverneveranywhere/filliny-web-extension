import {
  createAuthorizedFileService,
  confirmAuthorizedFileUploadService,
  updateAuthorizedFileService,
  deleteAuthorizedFileService,
  uploadFileToPresignedUrl,
} from '../../services/api/AuthorizedFiles/index.js';
import { queryKeys } from '../queryKeys.js';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import type { DTOAuthorizedFileCreate, DTOAuthorizedFileUpdate } from '../../services/schemas/index.js';

/**
 * Mutation hook for creating and uploading an authorized file
 * This handles the full flow: create entry -> upload file -> confirm upload
 */
export const useCreateAuthorizedFileMutation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      profileId,
      file,
      metadata,
    }: {
      profileId: string;
      file: File;
      metadata: Omit<DTOAuthorizedFileCreate, 'filename' | 'originalFilename' | 'extension' | 'mimeType' | 'fileSize'>;
    }) => {
      // Extract file info
      const extension = file.name.split('.').pop() || '';
      const fileData: DTOAuthorizedFileCreate = {
        ...metadata,
        filename: file.name,
        originalFilename: file.name,
        extension,
        mimeType: file.type || 'application/octet-stream',
        fileSize: file.size,
      };

      // Step 1: Create file entry and get presigned URL
      const presignedResponse = await createAuthorizedFileService(profileId, fileData);

      // Step 2: Upload file to presigned URL
      await uploadFileToPresignedUrl(presignedResponse.uploadUrl, file);

      // Step 3: Confirm upload completed
      const confirmedFile = await confirmAuthorizedFileUploadService(profileId, String(presignedResponse.fileId));

      return confirmedFile;
    },
    retry: false,
    onSuccess: (_data, { profileId }) => {
      // Invalidate files list for the profile
      queryClient.invalidateQueries({ queryKey: queryKeys.profile.files.list(profileId) });
    },
    onError: (error: Error) => {
      console.error('Failed to upload authorized file:', error.message);
      throw error;
    },
  });
};

/**
 * Mutation hook for updating an authorized file's metadata
 */
export const useUpdateAuthorizedFileMutation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ profileId, fileId, data }: { profileId: string; fileId: string; data: DTOAuthorizedFileUpdate }) =>
      updateAuthorizedFileService(profileId, fileId, data),
    retry: false,
    onSuccess: (_data, { profileId }) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.profile.files.list(profileId) });
    },
    onError: (error: Error) => {
      console.error('Failed to update authorized file:', error.message);
      throw error;
    },
  });
};

/**
 * Mutation hook for deleting an authorized file
 */
export const useDeleteAuthorizedFileMutation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ profileId, fileId }: { profileId: string; fileId: string }) =>
      deleteAuthorizedFileService(profileId, fileId),
    retry: false,
    onSuccess: (_data, { profileId }) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.profile.files.list(profileId) });
    },
    onError: (error: Error) => {
      console.error('Failed to delete authorized file:', error.message);
      throw error;
    },
  });
};
