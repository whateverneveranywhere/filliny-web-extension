import { listAuthorizedFilesService, getFileDownloadUrlService } from '../../services/api/AuthorizedFiles/index.js';
import { queryKeys } from '../queryKeys.js';
import { useQuery } from '@tanstack/react-query';

/**
 * Hook to fetch authorized files for a profile
 */
export const useAuthorizedFilesQuery = (profileId: string | undefined) =>
  useQuery({
    queryKey: queryKeys.profile.files.list(profileId || ''),
    queryFn: () => listAuthorizedFilesService(profileId!),
    enabled: !!profileId,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

/**
 * Hook to get a download URL for an authorized file
 * This is typically called on-demand when user wants to download/preview a file
 */
export const useFileDownloadUrlQuery = (profileId: string | undefined, fileId: string | undefined) =>
  useQuery({
    queryKey: [...queryKeys.profile.files.all(profileId || ''), 'download', fileId],
    queryFn: () => getFileDownloadUrlService(profileId!, String(fileId)),
    enabled: !!profileId && !!fileId,
    staleTime: 4 * 60 * 1000, // 4 minutes (URLs expire in 5)
    gcTime: 4 * 60 * 1000, // Remove from cache after 4 minutes
  });
