/**
 * File Generation Service
 *
 * Handles auto-generation of documents for file upload fields by communicating
 * with the background script which calls the backend API.
 */

import { MessageType } from '@extension/shared';
import { getDirectoryHandle, verifyWritePermission, writeFileToDirectory } from '@extension/storage';

const GENERATION_TIMEOUT = 30_000; // 30 seconds per file
const MAX_GENERATED_FILE_SIZE = 10 * 1024 * 1024; // 10 MB safety cap

/** Document types that can be auto-generated (text documents, not binary media) */
const GENERATABLE_MIME_PATTERNS = [
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument',
  'text/',
];

const NON_GENERATABLE_MIME_PATTERNS = ['image/', 'video/', 'audio/'];

const NON_GENERATABLE_EXTENSIONS = new Set([
  'jpg',
  'jpeg',
  'png',
  'gif',
  'webp',
  'svg',
  'bmp',
  'heic',
  'heif',
  'mp4',
  'mov',
  'avi',
  'webm',
  'mp3',
  'wav',
  'ogg',
  'zip',
  'rar',
  '7z',
  'tar',
  'gz',
]);

/**
 * Check if the accept types indicate a document type that can be auto-generated.
 * Returns false for images, videos, audio, and other binary formats.
 */
const isGeneratableDocumentType = (acceptTypes?: string): boolean => {
  if (!acceptTypes) return true; // No restriction = could be a document

  const lower = acceptTypes.toLowerCase();

  // Check if any non-generatable patterns are present
  for (const pattern of NON_GENERATABLE_MIME_PATTERNS) {
    if (lower.includes(pattern)) return false;
  }

  // Check individual extensions
  const parts = lower.split(',').map(p => p.trim());
  for (const part of parts) {
    const ext = part.replace(/^\./, '');
    if (NON_GENERATABLE_EXTENSIONS.has(ext)) return false;
  }

  // Check if any generatable patterns are present
  for (const pattern of GENERATABLE_MIME_PATTERNS) {
    if (lower.includes(pattern)) return true;
  }

  // Check for common document extensions
  const docExtensions = ['.pdf', '.doc', '.docx', '.txt', '.md', '.rtf'];
  for (const ext of docExtensions) {
    if (lower.includes(ext)) return true;
  }

  return true; // Default: assume generatable if no clear signal
};

interface GenerateFileResult {
  file: File;
  docId: number;
  filename: string;
  mimeType: string;
}

interface GenerateDocumentResponse {
  arrayBuffer?: number[];
  filename?: string;
  mimeType?: string;
  docId?: number;
  error?: string;
}

/**
 * Generate a file for a file upload field by sending a message to the background script.
 * The background script calls the generate-for-field API endpoint, converts + downloads the file.
 */
const generateFileForField = async (
  profileId: string,
  websiteId: string,
  fieldLabel: string,
  fieldDescription?: string,
  acceptTypes?: string,
): Promise<GenerateFileResult> => {
  const response = await new Promise<GenerateDocumentResponse>((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('Document generation timed out')), GENERATION_TIMEOUT);

    chrome.runtime.sendMessage(
      {
        type: MessageType.GENERATE_DOCUMENT_FOR_FIELD,
        profileId,
        websiteId,
        fieldLabel,
        fieldDescription,
        acceptTypes,
      },
      (result: GenerateDocumentResponse) => {
        clearTimeout(timer);
        if (chrome.runtime.lastError) {
          resolve({ error: chrome.runtime.lastError.message });
        } else {
          resolve(result);
        }
      },
    );
  });

  if (response.error) {
    throw new Error(response.error);
  }

  if (!response.arrayBuffer || !response.filename) {
    throw new Error('Invalid response from document generation');
  }

  // Safety cap: reject excessively large generated files
  if (response.arrayBuffer.length > MAX_GENERATED_FILE_SIZE) {
    throw new Error(`Generated file too large (${response.arrayBuffer.length} bytes)`);
  }

  const uint8Array = new Uint8Array(response.arrayBuffer);
  const file = new File([uint8Array], response.filename, {
    type: response.mimeType || 'application/pdf',
  });

  return {
    file,
    docId: response.docId || 0,
    filename: response.filename,
    mimeType: response.mimeType || 'application/pdf',
  };
};

/**
 * Fire-and-forget: save a generated file to the authorized folder.
 * Silently skips if no handle, no write permission, or any error.
 */
const saveToAuthorizedFolder = async (profileId: string, file: File): Promise<void> => {
  try {
    const handle = await getDirectoryHandle(profileId);
    if (!handle) return;

    const hasPermission = await verifyWritePermission(handle);
    if (!hasPermission) return;

    await writeFileToDirectory(handle, file.name, file);
    console.log(`Saved generated file to authorized folder: ${file.name}`);
  } catch (err) {
    console.warn('Failed to save generated file to authorized folder:', err);
  }
};

export { isGeneratableDocumentType, generateFileForField, saveToAuthorizedFolder };
export type { GenerateFileResult };
