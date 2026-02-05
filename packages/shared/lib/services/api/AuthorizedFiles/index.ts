import { apiEndpoints } from '../../endpoints.js';
import { httpService } from '../../httpService.js';
import type {
  DTOAuthorizedFile,
  DTOAuthorizedFileCreate,
  DTOAuthorizedFileUpdate,
  DTOPresignedUrlResponse,
  DTOFileDownloadUrl,
  SuccessResponse,
} from '../../schemas/index.js';

const { profiles } = apiEndpoints;

/**
 * List all authorized files for a profile
 */
export const listAuthorizedFilesService = (profileId: string): Promise<DTOAuthorizedFile[]> =>
  httpService.get(profiles.files.list(profileId));

/**
 * Create a new authorized file entry and get presigned upload URL
 * Returns the presigned URL for uploading to R2
 */
export const createAuthorizedFileService = (
  profileId: string,
  data: DTOAuthorizedFileCreate,
): Promise<DTOPresignedUrlResponse> => httpService.post(profiles.files.create(profileId), data);

/**
 * Confirm that file upload to R2 is complete
 * This should be called after successfully uploading the file to the presigned URL
 */
export const confirmAuthorizedFileUploadService = (profileId: string, fileId: string): Promise<DTOAuthorizedFile> =>
  httpService.post(profiles.files.confirm(profileId, String(fileId)));

/**
 * Update an authorized file's metadata
 */
export const updateAuthorizedFileService = (
  profileId: string,
  fileId: string,
  data: DTOAuthorizedFileUpdate,
): Promise<DTOAuthorizedFile> => httpService.put(profiles.files.update(profileId, String(fileId)), data);

/**
 * Delete an authorized file
 */
export const deleteAuthorizedFileService = (profileId: string, fileId: string): Promise<SuccessResponse> =>
  httpService.delete(profiles.files.delete(profileId, String(fileId)));

/**
 * Get a signed download URL for an authorized file
 * The URL expires after a short period (typically 5 minutes)
 */
export const getFileDownloadUrlService = (profileId: string, fileId: string): Promise<DTOFileDownloadUrl> =>
  httpService.get(profiles.files.download(profileId, String(fileId)));

/**
 * Upload a file to the presigned URL
 * This is a direct upload to R2, not through the API
 */
export const uploadFileToPresignedUrl = async (presignedUrl: string, file: File): Promise<void> => {
  const response = await fetch(presignedUrl, {
    method: 'PUT',
    body: file,
    headers: {
      'Content-Type': file.type,
    },
  });

  if (!response.ok) {
    throw new Error(`Failed to upload file: ${response.status} ${response.statusText}`);
  }
};

/**
 * Download a file from a signed URL
 * Returns the file as a Blob
 */
export const downloadFileFromSignedUrl = async (downloadUrl: string, filename: string): Promise<File> => {
  const response = await fetch(downloadUrl);

  if (!response.ok) {
    throw new Error(`Failed to download file: ${response.status} ${response.statusText}`);
  }

  const blob = await response.blob();
  const contentType = response.headers.get('content-type') || 'application/octet-stream';

  return new File([blob], filename, {
    type: contentType,
    lastModified: Date.now(),
  });
};
