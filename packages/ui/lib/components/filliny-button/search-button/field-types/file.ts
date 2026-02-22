import { createBaseField } from './utils';
import { Framework, FieldTypeEnum } from '@extension/shared';
import type { Field, FillinyFileInputElement } from '@extension/shared';

/**
 * Typed querySelector that returns HTMLInputElement | null.
 * Avoids repetitive `as HTMLInputElement | null` casts on file input selectors.
 */
const queryInputElement = (parent: ParentNode, selector: string): HTMLInputElement | null =>
  parent.querySelector<HTMLInputElement>(selector);

/**
 * Store Filliny file references on an HTMLInputElement.
 * Uses the FillinyFileInputElement extension from @extension/shared.
 */
const setFillinyFiles = (input: HTMLInputElement, files: File[]): void => {
  (input as FillinyFileInputElement).__fillinyFiles = files;
};

// Extend Field type with file-specific properties
interface FileField extends Field {
  acceptTypes?: string;
  multiple?: boolean;
}

/**
 * File upload data structure
 */
interface FileUploadMetadata {
  acceptedTypes?: AcceptType[];
  isCustomUpload?: boolean;
  triggerElement?: HTMLElement;
  fileInput?: HTMLInputElement;
  maxFileSize?: number | null;
  allowedExtensions?: string[];
}

/**
 * Metadata for file upload fields passed to updateFileInput
 * Compatible with Field['metadata'] which may contain fileUploadData
 */
interface FileFieldMetadata {
  fileUploadData?: FileUploadMetadata;
  [key: string]: unknown;
}

/**
 * Download file from URL with enhanced validation and error handling
 */
const downloadFileFromUrl = async (url: string, filename?: string, acceptTypes?: AcceptType[]): Promise<File> => {
  try {
    // Validate URL format
    const urlObj = new URL(url);
    if (!['http:', 'https:'].includes(urlObj.protocol)) {
      throw new Error(`Unsupported protocol: ${urlObj.protocol}`);
    }

    console.log(`Downloading file from: ${url}`);

    // Add headers to mimic a real browser request
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
        Accept: '*/*',
        'Accept-Language': 'en-US,en;q=0.9',
        'Cache-Control': 'no-cache',
      },
      mode: 'cors',
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status} - ${response.statusText}`);
    }

    // Check content length for reasonable file size (max 100MB)
    const contentLength = response.headers.get('content-length');
    if (contentLength && parseInt(contentLength) > 100 * 1024 * 1024) {
      throw new Error(`File too large: ${contentLength} bytes (max 100MB)`);
    }

    const blob = await response.blob();
    let contentType = response.headers.get('content-type') || 'application/octet-stream';

    // Clean up content type (remove charset, etc.)
    contentType = contentType.split(';')[0].trim();

    // Extract filename from URL or Content-Disposition header if not provided
    if (!filename) {
      // Try Content-Disposition header first
      const contentDisposition = response.headers.get('content-disposition');
      if (contentDisposition) {
        const filenameMatch = contentDisposition.match(/filename[*]?=["']?([^;\r\n"']*)["']?/i);
        if (filenameMatch && filenameMatch[1]) {
          filename = decodeURIComponent(filenameMatch[1]);
        }
      }

      // Fallback to URL path
      if (!filename) {
        const urlPath = urlObj.pathname;
        filename = urlPath.split('/').pop() || 'downloaded_file';

        // If no extension, try to infer from content type
        if (!filename.includes('.') && contentType !== 'application/octet-stream') {
          const extension = getExtensionFromMimeType(contentType);
          if (extension) {
            filename += `.${extension}`;
          }
        }
      }
    }

    // Validate file type against accept types if provided
    if (acceptTypes && acceptTypes.length > 0) {
      const isValidType = acceptTypes.some(acceptType => {
        if (acceptType.type === 'mime') {
          return (
            contentType === acceptType.value ||
            (acceptType.value.endsWith('/*') && contentType.startsWith(acceptType.value.slice(0, -1)))
          );
        } else {
          return filename!.toLowerCase().endsWith(`.${acceptType.value.toLowerCase()}`);
        }
      });

      if (!isValidType) {
        throw new Error(
          `File type '${contentType}' not allowed. Expected: ${acceptTypes.map(t => t.value).join(', ')}`,
        );
      }
    }

    // Validate file content by checking file headers
    const isValidFile = await validateFileContent(blob, contentType, filename!);
    if (!isValidFile) {
      console.warn(`Downloaded file may be corrupted or invalid: ${filename}`);
    }

    console.log(`Successfully downloaded: ${filename} (${blob.size} bytes, ${contentType})`);

    return new File([blob], filename!, {
      type: contentType,
      lastModified: Date.now(),
    });
  } catch (error) {
    console.error(`Error downloading file from ${url}:`, error);
    throw error;
  }
};

/**
 * Get file extension from MIME type
 */
const getExtensionFromMimeType = (mimeType: string): string | null => {
  const mimeToExt: Record<string, string> = {
    'image/jpeg': 'jpg',
    'image/png': 'png',
    'image/gif': 'gif',
    'image/webp': 'webp',
    'image/svg+xml': 'svg',
    'application/pdf': 'pdf',
    'application/msword': 'doc',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'docx',
    'application/vnd.ms-excel': 'xls',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': 'xlsx',
    'application/zip': 'zip',
    'text/plain': 'txt',
    'text/csv': 'csv',
    'application/json': 'json',
    'video/mp4': 'mp4',
    'audio/mpeg': 'mp3',
  };

  return mimeToExt[mimeType] || null;
};

/**
 * Validate file content by checking file headers and basic structure
 */
const validateFileContent = async (blob: Blob, expectedMimeType: string, filename: string): Promise<boolean> => {
  try {
    // Read first few bytes to check file signature
    const arrayBuffer = await blob.slice(0, 12).arrayBuffer();
    const bytes = new Uint8Array(arrayBuffer);

    // Check common file signatures
    const signatures: Record<string, number[][]> = {
      'image/jpeg': [[0xff, 0xd8, 0xff]],
      'image/png': [[0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]],
      'image/gif': [
        [0x47, 0x49, 0x46, 0x38, 0x37, 0x61],
        [0x47, 0x49, 0x46, 0x38, 0x39, 0x61],
      ],
      'application/pdf': [[0x25, 0x50, 0x44, 0x46]], // %PDF
      'application/zip': [
        [0x50, 0x4b, 0x03, 0x04],
        [0x50, 0x4b, 0x05, 0x06],
        [0x50, 0x4b, 0x07, 0x08],
      ],
    };

    // Also check Office documents (which are ZIP-based)
    if (expectedMimeType.includes('officedocument') || filename.match(/\.(docx|xlsx|pptx)$/i)) {
      const zipSignatures = signatures['application/zip'];
      for (const sig of zipSignatures) {
        if (bytes.length >= sig.length && sig.every((byte, i) => bytes[i] === byte)) {
          return true;
        }
      }
    }

    const expectedSignatures = signatures[expectedMimeType];
    if (expectedSignatures) {
      for (const signature of expectedSignatures) {
        if (bytes.length >= signature.length) {
          const matches = signature.every((byte, index) => bytes[index] === byte);
          if (matches) {
            return true;
          }
        }
      }
      // If we have signatures for this type but none matched, it's likely invalid
      return false;
    }

    // For types we don't have signatures for, assume valid
    return true;
  } catch (error) {
    console.warn('Error validating file content:', error);
    return true; // Assume valid on error
  }
};

/**
 * Create realistic binary content for test files.
 * PDFs contain a valid minimal structure that PDF parsers accept.
 * Images are valid 1x1 pixel files that pass file-type detection.
 */
const createRealisticFileContent = (filename: string, mimeType: string): Uint8Array => {
  const name = filename.toLowerCase();

  // Valid minimal PDF (parseable by most PDF readers)
  if (mimeType === 'application/pdf' || name.endsWith('.pdf')) {
    const pdf = [
      '%PDF-1.4',
      '1 0 obj',
      '<< /Type /Catalog /Pages 2 0 R >>',
      'endobj',
      '2 0 obj',
      '<< /Type /Pages /Kids [3 0 R] /Count 1 >>',
      'endobj',
      '3 0 obj',
      '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R /Resources << >> >>',
      'endobj',
      '4 0 obj',
      '<< /Length 44 >>',
      'stream',
      'BT /F1 12 Tf 100 700 Td (Filliny Test) Tj ET',
      'endstream',
      'endobj',
      'xref',
      '0 5',
      '0000000000 65535 f ',
      '0000000009 00000 n ',
      '0000000058 00000 n ',
      '0000000115 00000 n ',
      '0000000236 00000 n ',
      'trailer',
      '<< /Size 5 /Root 1 0 R >>',
      'startxref',
      '330',
      '%%EOF',
    ].join('\n');
    return new TextEncoder().encode(pdf);
  }

  // Valid 1x1 white pixel JPEG (JFIF format)
  if (mimeType === 'image/jpeg' || name.endsWith('.jpg') || name.endsWith('.jpeg')) {
    // prettier-ignore
    return new Uint8Array([
      0xFF, 0xD8, 0xFF, 0xE0, 0x00, 0x10, 0x4A, 0x46, 0x49, 0x46, 0x00, 0x01,
      0x01, 0x00, 0x00, 0x01, 0x00, 0x01, 0x00, 0x00,
      0xFF, 0xDB, 0x00, 0x43, 0x00,
      0x08, 0x06, 0x06, 0x07, 0x06, 0x05, 0x08, 0x07,
      0x07, 0x07, 0x09, 0x09, 0x08, 0x0A, 0x0C, 0x14,
      0x0D, 0x0C, 0x0B, 0x0B, 0x0C, 0x19, 0x12, 0x13,
      0x0F, 0x14, 0x1D, 0x1A, 0x1F, 0x1E, 0x1D, 0x1A,
      0x1C, 0x1C, 0x20, 0x24, 0x2E, 0x27, 0x20, 0x22,
      0x2C, 0x23, 0x1C, 0x1C, 0x28, 0x37, 0x29, 0x2C,
      0x30, 0x31, 0x34, 0x34, 0x34, 0x1F, 0x27, 0x39,
      0x3D, 0x38, 0x32, 0x3C, 0x2E, 0x33, 0x34, 0x32,
      0xFF, 0xC0, 0x00, 0x0B, 0x08, 0x00, 0x01, 0x00, 0x01, 0x01, 0x01, 0x11, 0x00,
      0xFF, 0xC4, 0x00, 0x1F, 0x00, 0x00, 0x01, 0x05, 0x01, 0x01, 0x01, 0x01,
      0x01, 0x01, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
      0x00, 0x00, 0x01, 0x02, 0x03, 0x04, 0x05, 0x06,
      0x07, 0x08, 0x09, 0x0A, 0x0B,
      0xFF, 0xDA, 0x00, 0x08, 0x01, 0x01, 0x00, 0x00, 0x3F, 0x00, 0x7B, 0x40,
      0xFF, 0xD9,
    ]);
  }

  // Valid 1x1 white pixel PNG
  if (mimeType === 'image/png' || name.endsWith('.png')) {
    // prettier-ignore
    return new Uint8Array([
      0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A,
      0x00, 0x00, 0x00, 0x0D, 0x49, 0x48, 0x44, 0x52,
      0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01,
      0x08, 0x02, 0x00, 0x00, 0x00, 0x90, 0x77, 0x53, 0xDE,
      0x00, 0x00, 0x00, 0x0C, 0x49, 0x44, 0x41, 0x54,
      0x08, 0xD7, 0x63, 0xF8, 0xCF, 0xC0, 0x00, 0x00,
      0x01, 0x01, 0x01, 0x00, 0x18, 0xDD, 0x8D, 0xB4,
      0x00, 0x00, 0x00, 0x00, 0x49, 0x45, 0x4E, 0x44,
      0xAE, 0x42, 0x60, 0x82,
    ]);
  }

  // Valid 1x1 white pixel GIF89a
  if (mimeType === 'image/gif' || name.endsWith('.gif')) {
    // prettier-ignore
    return new Uint8Array([
      0x47, 0x49, 0x46, 0x38, 0x39, 0x61,
      0x01, 0x00, 0x01, 0x00,
      0x80, 0x00, 0x00,
      0xFF, 0xFF, 0xFF,
      0x00, 0x00, 0x00,
      0x2C, 0x00, 0x00, 0x00, 0x00, 0x01, 0x00, 0x01, 0x00, 0x00,
      0x02, 0x02, 0x44, 0x01, 0x00,
      0x3B,
    ]);
  }

  // ZIP file header (also covers .docx, .xlsx, .pptx as they are ZIP-based)
  if (
    mimeType === 'application/zip' ||
    name.endsWith('.zip') ||
    mimeType.includes('spreadsheet') ||
    name.endsWith('.xlsx') ||
    mimeType.includes('wordprocessingml') ||
    name.endsWith('.docx') ||
    mimeType.includes('presentation') ||
    name.endsWith('.pptx')
  ) {
    // prettier-ignore
    return new Uint8Array([
      0x50, 0x4B, 0x05, 0x06,
      0x00, 0x00, 0x00, 0x00,
      0x00, 0x00, 0x00, 0x00,
      0x00, 0x00, 0x00, 0x00,
      0x00, 0x00, 0x00, 0x00,
      0x00, 0x00,
    ]);
  }

  // Generic text content with realistic structure
  const textContent = `Test file: ${filename}\nCreated: ${new Date().toISOString()}\nContent-Type: ${mimeType}\n\nThis is realistic test content for ${filename}.\n`;
  return new TextEncoder().encode(textContent);
};

/**
 * Create a realistic file object for testing purposes
 */
const createRealisticFile = (filename: string, mimeType?: string): File => {
  const detectedMimeType = mimeType || getFileTypeFromExtension(filename);
  const content = createRealisticFileContent(filename, detectedMimeType);

  // Calculate realistic file size (between 1KB and 5MB based on file type)
  let targetSize = 1024; // Default 1KB

  if (detectedMimeType.startsWith('image/')) {
    targetSize = Math.random() * (500 * 1024 - 50 * 1024) + 50 * 1024; // 50KB - 500KB
  } else if (detectedMimeType === 'application/pdf') {
    targetSize = Math.random() * (2 * 1024 * 1024 - 100 * 1024) + 100 * 1024; // 100KB - 2MB
  } else if (detectedMimeType.includes('video/')) {
    targetSize = Math.random() * (10 * 1024 * 1024 - 1024 * 1024) + 1024 * 1024; // 1MB - 10MB
  }

  // Create content with target size
  let finalContent = content;
  if (content.length < targetSize) {
    const padding = new Uint8Array(Math.floor(targetSize - content.length));
    padding.fill(0x20); // Fill with spaces
    finalContent = new Uint8Array([...content, ...padding]);
  }

  // Create a clean ArrayBuffer copy for Blob compatibility
  const cleanBuffer = new ArrayBuffer(finalContent.length);
  const cleanView = new Uint8Array(cleanBuffer);
  cleanView.set(finalContent);
  const blob = new Blob([cleanBuffer], { type: detectedMimeType });
  return new File([blob], filename, {
    type: detectedMimeType,
    lastModified: Date.now() - Math.random() * 86400000, // Random time within last 24h
  });
};

/**
 * Simulate drag and drop file upload for custom upload components.
 * Dispatches a realistic event sequence that satisfies framework-level
 * listeners (React Dropzone, FilePond, Uppy, etc.):
 *   1. dragenter on document (some frameworks listen at document level)
 *   2. dragenter on the drop zone
 *   3. dragover on the drop zone (multiple, to satisfy debounce timers)
 *   4. drop on the drop zone
 *   5. dragleave on document (cleanup)
 *
 * Each event includes proper dataTransfer.types, effectAllowed, dropEffect,
 * and mouse coordinates centered on the drop zone.
 */
const simulateDragAndDrop = async (dropZone: HTMLElement, files: File[]): Promise<void> => {
  try {
    const dataTransfer = new DataTransfer();
    files.forEach(file => dataTransfer.items.add(file));

    // Calculate center coordinates of the drop zone
    const rect = dropZone.getBoundingClientRect();
    const clientX = rect.left + rect.width / 2;
    const clientY = rect.top + rect.height / 2;

    const baseDragInit: DragEventInit = {
      bubbles: true,
      cancelable: true,
      composed: true,
      dataTransfer,
      clientX,
      clientY,
      screenX: clientX,
      screenY: clientY,
    };

    // Step 1: Dispatch dragenter on document first (React Dropzone, etc.)
    document.dispatchEvent(new DragEvent('dragenter', { ...baseDragInit }));
    await new Promise(resolve => setTimeout(resolve, 10));

    // Step 2: Dispatch dragenter on the drop zone
    dropZone.dispatchEvent(new DragEvent('dragenter', { ...baseDragInit }));
    await new Promise(resolve => setTimeout(resolve, 10));

    // Step 3: Dispatch multiple dragover events (some frameworks need repeated dragover)
    for (let i = 0; i < 3; i++) {
      dropZone.dispatchEvent(new DragEvent('dragover', { ...baseDragInit }));
      await new Promise(resolve => setTimeout(resolve, 20));
    }

    // Step 4: Dispatch the drop event
    dropZone.dispatchEvent(new DragEvent('drop', { ...baseDragInit }));
    await new Promise(resolve => setTimeout(resolve, 10));

    // Step 5: Dispatch dragleave on document for cleanup
    document.dispatchEvent(new DragEvent('dragleave', { ...baseDragInit }));

    // Also try common custom events that upload libraries may listen for
    const customEvents = ['file-drop', 'files-added', 'upload-files', 'fileupload'];
    for (const eventName of customEvents) {
      try {
        const customEvent = new CustomEvent(eventName, {
          detail: { files, dataTransfer },
          bubbles: true,
        });
        dropZone.dispatchEvent(customEvent);
      } catch (error) {
        console.debug(`Could not dispatch custom event ${eventName}:`, error);
      }
    }

    console.log(`Simulated drag and drop of ${files.length} files to drop zone`);
  } catch (error) {
    console.warn('Error simulating drag and drop:', error);
  }
};

/**
 * Trigger custom upload component's file selection
 */
const triggerCustomUploadComponent = async (element: HTMLElement, files: File[]): Promise<void> => {
  try {
    // Check for cloud storage integration first
    const cloudStorageIntegration = detectCloudStorageIntegration(element);
    if (cloudStorageIntegration) {
      console.log(`Detected cloud storage integration: ${cloudStorageIntegration.provider}`);
      await handleCloudStorageUpload(element, files, cloudStorageIntegration);
      return;
    }

    // Try different approaches to trigger file selection
    const approaches = [
      // Approach 1: Click the element
      () => element.click(),

      // Approach 2: Trigger mouse events
      () => {
        element.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }));
        element.dispatchEvent(new MouseEvent('mouseup', { bubbles: true }));
        element.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      },

      // Approach 3: Focus and keyboard events
      () => {
        element.focus();
        element.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
        element.dispatchEvent(new KeyboardEvent('keyup', { key: 'Enter', bubbles: true }));
      },

      // Approach 4: Try to find and click child buttons
      () => {
        const buttons = element.querySelectorAll('button, [role="button"], input[type="button"]');
        buttons.forEach(button => {
          if (button instanceof HTMLElement) {
            button.click();
          }
        });
      },

      // Approach 5: Enhanced drag-and-drop zone detection
      () => {
        const isDragDropTarget = detectEnhancedDragDropZone(element);
        if (isDragDropTarget) {
          return simulateDragAndDrop(element, files);
        }
        return undefined;
      },
    ];

    // Try each approach
    for (const approach of approaches) {
      try {
        const result = approach();
        if (result !== undefined && result !== null && typeof result === 'object' && 'then' in result) {
          await result;
        }
        await new Promise(resolve => setTimeout(resolve, 100));
      } catch (error) {
        console.debug('Upload trigger approach failed:', error);
      }
    }

    // If the element supports drag and drop, simulate that too
    const isDragDropTarget =
      element.hasAttribute('droppable') ||
      element.classList.toString().match(/drop|drag/i) ||
      element.getAttribute('role') === 'region';

    if (isDragDropTarget) {
      await simulateDragAndDrop(element, files);
    }
  } catch (error) {
    console.warn('Error triggering custom upload component:', error);
  }
};

/**
 * Trigger browser's native file picker dialog
 */
const triggerNativeFilePicker = async (
  fileInput: HTMLInputElement,
  acceptTypes: AcceptType[],
  isMultiple: boolean,
): Promise<File[] | null> =>
  new Promise(resolve => {
    // Set up the file input for the expected file types
    if (acceptTypes.length > 0) {
      const acceptString = acceptTypes
        .map(type => (type.type === 'extension' ? `.${type.value}` : type.value))
        .join(',');
      fileInput.accept = acceptString;
    }

    fileInput.multiple = isMultiple;

    // Set up change listener
    const handleChange = (event: Event) => {
      const target = event.target;
      if (!(target instanceof HTMLInputElement)) return;
      const files = target.files ? Array.from(target.files) : [];

      // Clean up
      fileInput.removeEventListener('change', handleChange);
      fileInput.removeEventListener('cancel', handleCancel);

      resolve(files.length > 0 ? files : null);
    };

    const handleCancel = () => {
      // Clean up
      fileInput.removeEventListener('change', handleChange);
      fileInput.removeEventListener('cancel', handleCancel);

      resolve(null);
    };

    // Add event listeners
    fileInput.addEventListener('change', handleChange, { once: true });
    fileInput.addEventListener('cancel', handleCancel, { once: true });

    // Trigger the file picker
    try {
      fileInput.click();
    } catch (error) {
      console.warn('Failed to trigger file picker:', error);
      resolve(null);
    }
  });

/**
 * Programmatically set files on an HTMLInputElement via DataTransfer.
 * Returns true if the files property was successfully set and verified.
 */
const programmaticSetFiles = (fileInput: HTMLInputElement, files: File[]): boolean => {
  try {
    const dt = new DataTransfer();
    files.forEach(file => dt.items.add(file));
    fileInput.files = dt.files;

    // Dispatch change + input events
    fileInput.dispatchEvent(new Event('change', { bubbles: true, cancelable: true }));
    fileInput.dispatchEvent(new Event('input', { bubbles: true, cancelable: true }));

    // Verify
    if (fileInput.files && fileInput.files.length === files.length) {
      const namesMatch = files.every((f, i) => fileInput.files?.item(i)?.name === f.name);
      if (namesMatch) return true;
    }
    return false;
  } catch (error) {
    console.debug('programmaticSetFiles failed:', error);
    return false;
  }
};

/**
 * Verify that files were successfully set on a file input.
 * Checks file count and file name matching.
 */
const verifyFilesSet = (fileInput: HTMLInputElement, expectedFiles: File[]): boolean => {
  try {
    if (!fileInput.files || fileInput.files.length === 0) return false;
    if (fileInput.files.length !== expectedFiles.length) return false;
    return expectedFiles.every((f, i) => fileInput.files?.item(i)?.name === f.name);
  } catch {
    return false;
  }
};

/**
 * Use a MutationObserver to watch for dynamically created file inputs
 * after clicking an upload trigger button. Some sites create the input
 * only on demand.
 *
 * Clicks the trigger, observes the DOM for up to timeoutMs for a new
 * input type=file, programmatically sets files on it, and resolves
 * to true if successful.
 */
const watchForDynamicFileInput = (
  triggerElement: HTMLElement,
  files: File[],
  timeoutMs: number = 3000,
): Promise<boolean> =>
  new Promise(resolve => {
    let resolved = false;

    const finish = (success: boolean): void => {
      if (resolved) return;
      resolved = true;
      observer.disconnect();
      clearTimeout(timer);
      resolve(success);
    };

    const observer = new MutationObserver(mutations => {
      for (const mutation of mutations) {
        for (const node of Array.from(mutation.addedNodes)) {
          if (!(node instanceof HTMLElement)) continue;

          // Check if the added node itself is a file input
          if (node instanceof HTMLInputElement && node.type === FieldTypeEnum.FILE) {
            const success = programmaticSetFiles(node, files);
            finish(success);
            return;
          }

          // Check if it contains a file input
          const nestedInput = node.querySelector('input[type="file"]');
          if (nestedInput instanceof HTMLInputElement) {
            const success = programmaticSetFiles(nestedInput, files);
            finish(success);
            return;
          }
        }
      }
    });

    const timer = setTimeout(() => {
      finish(false);
    }, timeoutMs);

    // Start observing the entire body for added nodes
    observer.observe(document.body, {
      childList: true,
      subtree: true,
    });

    // Click the trigger to cause the file input to appear
    try {
      triggerElement.click();
    } catch (error) {
      console.debug('watchForDynamicFileInput: trigger click failed:', error);
      finish(false);
    }
  });

/**
 * Update a file input with actual file objects or simulate file selection
 * This function handles both test mode and AI mode file filling with enhanced capabilities
 */
const updateFileInput = async (
  fileInput: HTMLInputElement,
  value: string | string[],
  isTestMode: boolean = false,
  isAiMode: boolean = false,
  fieldMetadata?: FileFieldMetadata,
): Promise<void> => {
  const valueType = typeof value === 'string' ? 'single file' : 'multiple files';
  console.log(`Updating file input with ${valueType}, testMode: ${isTestMode}, aiMode: ${isAiMode}`);

  try {
    // For visual feedback
    fileInput.classList.add('filliny-file-selected');

    let files: File[] = [];
    const fileNames: string[] = Array.isArray(value) ? value : [value];
    const acceptTypes = fieldMetadata?.fileUploadData?.acceptedTypes || [];
    const isCustomUpload = fieldMetadata?.fileUploadData?.isCustomUpload || false;
    const triggerElement = fieldMetadata?.fileUploadData?.triggerElement || fileInput;

    if (isAiMode) {
      // AI mode - handle URLs or local filenames suggested by AI
      for (const fileValue of fileNames) {
        try {
          // Check if this is a URL
          if (fileValue.startsWith('http://') || fileValue.startsWith('https://')) {
            const file = await downloadFileFromUrl(fileValue, undefined, acceptTypes);
            files.push(file);
          } else {
            // This is a local filename suggested by AI (e.g., "Resume.pdf")
            console.log(`AI suggested local file: ${fileValue}`);
            const file = createRealisticFile(fileValue, getFileTypeFromExtension(fileValue));
            files.push(file);
          }
        } catch (error) {
          console.warn(`Failed to process file ${fileValue}, creating realistic file:`, error);
          // Extract filename from URL for fallback
          let fallbackName = fileValue;
          try {
            const urlObj = new URL(fileValue);
            const pathName = urlObj.pathname.split('/').pop();
            if (pathName && pathName !== '') {
              fallbackName = pathName;
            }
          } catch {
            // Keep original fileValue as fallback name
          }
          const file = createRealisticFile(fallbackName, getFileTypeFromExtension(fallbackName));
          files.push(file);
        }
      }
    } else if (isTestMode) {
      // Test mode - create realistic files with proper binary content
      files = fileNames.map(filename => {
        const fileType = getFileTypeFromExtension(filename);
        return createRealisticFile(filename, fileType);
      });
    } else {
      // Interactive mode - attempt to trigger native file picker
      if (!isCustomUpload) {
        try {
          const selectedFiles = await triggerNativeFilePicker(fileInput, acceptTypes, fileInput.multiple);
          if (selectedFiles && selectedFiles.length > 0) {
            files = selectedFiles;
          } else {
            // User cancelled or no files selected, create default files
            files = fileNames.map(filename => createRealisticFile(filename, getFileTypeFromExtension(filename)));
          }
        } catch (error) {
          console.warn('Failed to trigger native file picker, falling back to programmatic files:', error);
          files = fileNames.map(filename => createRealisticFile(filename, getFileTypeFromExtension(filename)));
        }
      } else {
        // For custom upload components, we'll simulate file selection
        files = fileNames.map(filename => createRealisticFile(filename, getFileTypeFromExtension(filename)));

        // Try to trigger the custom upload component's file selection
        if (triggerElement && triggerElement !== fileInput) {
          await triggerCustomUploadComponent(triggerElement, files);
        }
      }
    }

    // Try to set files with progressive fallback strategies and verification
    if (files.length > 0) {
      // Validate files against accept types if specified
      const validFiles = files.filter(file => {
        if (acceptTypes.length === 0) return true;

        return acceptTypes.some((acceptType: AcceptType) => {
          if (acceptType.type === 'mime') {
            return (
              file.type === acceptType.value ||
              (acceptType.value.endsWith('/*') && file.type.startsWith(acceptType.value.slice(0, -1)))
            );
          } else {
            return file.name.toLowerCase().endsWith(`.${acceptType.value.toLowerCase()}`);
          }
        });
      });

      if (files.length > validFiles.length) {
        console.warn(`${files.length - validFiles.length} files were filtered out due to accept type restrictions`);
      }

      // Strategy A: Programmatic set via DataTransfer + verification
      let filesSuccessfullySet = programmaticSetFiles(fileInput, validFiles);

      // Strategy B: If verification failed, try finding an associated hidden input
      if (!filesSuccessfullySet) {
        console.debug('Strategy A (programmatic set) failed, trying associated hidden file input');
        const hiddenInput = findAssociatedFileInput(fileInput);
        if (hiddenInput && hiddenInput !== fileInput) {
          filesSuccessfullySet = programmaticSetFiles(hiddenInput, validFiles);
        }
      }

      // Strategy C: Drag-and-drop simulation on the trigger element
      if (!filesSuccessfullySet && isCustomUpload && triggerElement) {
        console.debug('Strategy B failed, trying drag-and-drop simulation');
        await simulateDragAndDrop(triggerElement, validFiles);
        await new Promise(resolve => setTimeout(resolve, 200));
        filesSuccessfullySet = verifyFilesSet(fileInput, validFiles);
      }

      // Strategy D: MutationObserver - click trigger and watch for dynamic file inputs
      if (!filesSuccessfullySet && isCustomUpload && triggerElement && triggerElement !== fileInput) {
        console.debug('Strategy C failed, trying MutationObserver for dynamic file input');
        filesSuccessfullySet = await watchForDynamicFileInput(triggerElement, validFiles, 3000);
      }

      // Set enhanced data attributes for debugging and validation
      fileInput.setAttribute('data-filliny-files', validFiles.map(f => f.name).join(', '));
      fileInput.setAttribute('data-filliny-files-count', validFiles.length.toString());
      fileInput.setAttribute('data-filliny-files-size', validFiles.reduce((acc, f) => acc + f.size, 0).toString());
      fileInput.setAttribute('data-filliny-files-types', validFiles.map(f => f.type).join(', '));

      // Store file references for later access using a properly typed extension
      setFillinyFiles(fileInput, validFiles);

      if (filesSuccessfullySet) {
        console.log(
          `Successfully set ${validFiles.length} files on input:`,
          validFiles.map(f => `${f.name} (${f.size} bytes, ${f.type})`),
        );
      } else {
        console.warn(
          `Could not programmatically set files. Set data attributes as fallback for ${validFiles.length} files.`,
        );
      }
    }

    // Attempt to trigger change events with enhanced event simulation
    const changeEvent = new Event('change', { bubbles: true, cancelable: true });
    const inputEvent = new Event('input', { bubbles: true, cancelable: true });

    // For custom upload components, also trigger additional events and simulate drag/drop
    if (isCustomUpload && triggerElement && files.length > 0) {
      try {
        // Trigger standard events
        triggerElement.dispatchEvent(new Event('change', { bubbles: true }));
        triggerElement.dispatchEvent(new Event('drop', { bubbles: true }));
        triggerElement.dispatchEvent(new Event('file-selected', { bubbles: true }));

        // Simulate drag and drop if it looks like a drop zone
        await simulateDragAndDrop(triggerElement, files);
      } catch (error) {
        console.debug('Could not dispatch events to custom upload element:', error);
      }
    }

    fileInput.dispatchEvent(changeEvent);
    fileInput.dispatchEvent(inputEvent);

    // Trigger form validation if the input is part of a form
    const form = fileInput.closest('form');
    if (form) {
      try {
        fileInput.dispatchEvent(new Event('blur', { bubbles: true }));
      } catch (error) {
        console.debug('Could not trigger form validation:', error);
      }
    }

    // Add a visual indicator next to the input
    const parent = fileInput.parentElement;
    if (parent) {
      const indicator = document.createElement('span');
      indicator.className = 'filliny-file-indicator';
      indicator.style.marginLeft = '8px';
      indicator.style.color = '#525252';
      indicator.style.fontStyle = 'italic';
      indicator.style.fontSize = '12px';
      indicator.style.fontWeight = '500';

      // Show appropriate message based on mode and number of files
      let message: string;
      const fileCount = files.length;
      const totalSize = files.reduce((acc, f) => acc + f.size, 0);
      const sizeText =
        totalSize > 1024 * 1024
          ? `${(totalSize / (1024 * 1024)).toFixed(1)}MB`
          : totalSize > 1024
            ? `${(totalSize / 1024).toFixed(1)}KB`
            : `${totalSize}B`;

      if (isAiMode) {
        message =
          fileCount > 1
            ? `${fileCount} files downloaded and selected (${sizeText})`
            : `File downloaded: ${files[0]?.name || value} (${sizeText})`;
      } else if (isTestMode) {
        message =
          fileCount > 1
            ? `${fileCount} realistic test files generated (${sizeText})`
            : `Realistic test file: ${files[0]?.name || value} (${sizeText})`;
      } else {
        if (fileCount > 0) {
          message =
            fileCount > 1
              ? `${fileCount} files selected (${sizeText})`
              : `File selected: ${files[0].name} (${sizeText})`;
        } else {
          message = Array.isArray(value)
            ? `${value.length} files selected (simulated)`
            : `File selected: ${value} (simulated)`;
        }
      }

      indicator.textContent = message;

      // Remove any existing indicators
      const existingIndicator = parent.querySelector('.filliny-file-indicator');
      if (existingIndicator) {
        parent.removeChild(existingIndicator);
      }

      parent.appendChild(indicator);

      // Remove the indicator after appropriate time (longer for AI mode)
      setTimeout(
        () => {
          if (indicator.parentNode) {
            indicator.parentNode.removeChild(indicator);
          }
        },
        isAiMode ? 8000 : isTestMode ? 6000 : 4000,
      );
    }
  } catch (error) {
    console.error('Error updating file input:', error);
  }
};

/**
 * Get file MIME type from file extension
 */
const getFileTypeFromExtension = (filename: string): string => {
  const ext = filename.split('.').pop()?.toLowerCase();
  return MIME_TYPE_MAP[ext || ''] || 'application/octet-stream';
};

/**
 * Comprehensive MIME type mapping with enhanced file type support
 */
const MIME_TYPE_MAP: Record<string, string> = {
  // Images
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  png: 'image/png',
  gif: 'image/gif',
  bmp: 'image/bmp',
  webp: 'image/webp',
  svg: 'image/svg+xml',
  ico: 'image/x-icon',
  tiff: 'image/tiff',
  tif: 'image/tiff',
  heic: 'image/heic',
  heif: 'image/heif',

  // Documents
  pdf: 'application/pdf',
  doc: 'application/msword',
  docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  xls: 'application/vnd.ms-excel',
  xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  ppt: 'application/vnd.ms-powerpoint',
  pptx: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  odt: 'application/vnd.oasis.opendocument.text',
  ods: 'application/vnd.oasis.opendocument.spreadsheet',
  odp: 'application/vnd.oasis.opendocument.presentation',
  rtf: 'application/rtf',

  // Text
  txt: 'text/plain',
  csv: 'text/csv',
  json: 'application/json',
  xml: 'application/xml',
  html: 'text/html',
  htm: 'text/html',
  css: 'text/css',
  js: 'application/javascript',
  ts: 'application/typescript',
  md: 'text/markdown',
  yaml: 'text/yaml',
  yml: 'text/yaml',

  // Archives
  zip: 'application/zip',
  rar: 'application/x-rar-compressed',
  tar: 'application/x-tar',
  gz: 'application/gzip',
  '7z': 'application/x-7z-compressed',
  bz2: 'application/x-bzip2',

  // Audio
  mp3: 'audio/mpeg',
  wav: 'audio/wav',
  ogg: 'audio/ogg',
  flac: 'audio/flac',
  aac: 'audio/aac',
  wma: 'audio/x-ms-wma',
  m4a: 'audio/mp4',

  // Video
  mp4: 'video/mp4',
  avi: 'video/x-msvideo',
  mov: 'video/quicktime',
  wmv: 'video/x-ms-wmv',
  flv: 'video/x-flv',
  webm: 'video/webm',
  mkv: 'video/x-matroska',
  m4v: 'video/mp4',

  // Fonts
  ttf: 'font/ttf',
  otf: 'font/otf',
  woff: 'font/woff',
  woff2: 'font/woff2',
  eot: 'application/vnd.ms-fontobject',

  // Other
  exe: 'application/octet-stream',
  dmg: 'application/octet-stream',
  iso: 'application/octet-stream',
};

/**
 * Parse accept attribute value into structured format
 */
interface AcceptType {
  type: 'mime' | 'extension';
  value: string;
  category: 'image' | 'document' | 'audio' | 'video' | 'archive' | 'text' | 'other';
}

const parseAcceptTypes = (accept: string): AcceptType[] => {
  if (!accept) return [];

  return accept.split(',').map(type => {
    const trimmed = type.trim();

    if (trimmed.startsWith('.')) {
      // File extension
      const ext = trimmed.substring(1).toLowerCase();
      return {
        type: 'extension',
        value: ext,
        category: categorizeFileType(ext),
      };
    } else {
      // MIME type
      const mimeType = trimmed.toLowerCase();
      return {
        type: 'mime',
        value: mimeType,
        category: categorizeMimeType(mimeType),
      };
    }
  });
};

const categorizeFileType = (extension: string): AcceptType['category'] => {
  const imageExts = ['jpg', 'jpeg', 'png', 'gif', 'bmp', 'webp', 'svg', 'ico', 'tiff', 'tif', 'heic', 'heif'];
  const documentExts = ['pdf', 'doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx', 'odt', 'ods', 'odp', 'rtf'];
  const audioExts = ['mp3', 'wav', 'ogg', 'flac', 'aac', 'wma', 'm4a'];
  const videoExts = ['mp4', 'avi', 'mov', 'wmv', 'flv', 'webm', 'mkv', 'm4v'];
  const archiveExts = ['zip', 'rar', 'tar', 'gz', '7z', 'bz2'];
  const textExts = ['txt', 'csv', 'json', 'xml', 'html', 'htm', 'css', 'js', 'ts', 'md', 'yaml', 'yml'];

  if (imageExts.includes(extension)) return 'image';
  if (documentExts.includes(extension)) return 'document';
  if (audioExts.includes(extension)) return 'audio';
  if (videoExts.includes(extension)) return 'video';
  if (archiveExts.includes(extension)) return 'archive';
  if (textExts.includes(extension)) return 'text';
  return 'other';
};

const categorizeMimeType = (mimeType: string): AcceptType['category'] => {
  if (mimeType.startsWith('image/')) return 'image';
  if (mimeType.startsWith('audio/')) return 'audio';
  if (mimeType.startsWith('video/')) return 'video';
  if (mimeType.startsWith('text/')) return 'text';
  if (
    mimeType.includes('pdf') ||
    mimeType.includes('document') ||
    mimeType.includes('spreadsheet') ||
    mimeType.includes('presentation')
  )
    return 'document';
  if (mimeType.includes('zip') || mimeType.includes('compressed')) return 'archive';
  return 'other';
};

/**
 * Extract maximum file size from element attributes or surrounding context
 */
const extractMaxFileSize = (element: HTMLElement): number | null => {
  // Check for common data attributes
  const maxSizeAttrs = ['data-max-size', 'data-maxsize', 'data-max-file-size', 'data-size-limit'];

  for (const attr of maxSizeAttrs) {
    const value = element.getAttribute(attr);
    if (value) {
      const size = parseFileSize(value);
      if (size) return size;
    }
  }

  // Check surrounding text for size hints
  const parentText = element.parentElement?.textContent || '';
  const sizeMatch = parentText.match(/max(?:imum)?\s*(?:file\s*)?size[:\s]*([0-9.]+)\s*(kb|mb|gb)/i);
  if (sizeMatch) {
    return parseFileSize(sizeMatch[1] + sizeMatch[2]);
  }

  return null;
};

/**
 * Extract allowed file extensions from element context
 */
const extractAllowedExtensions = (element: HTMLElement): string[] => {
  const extensions: string[] = [];

  // Check for data attributes
  const extAttrs = ['data-extensions', 'data-allowed-extensions', 'data-file-types'];
  for (const attr of extAttrs) {
    const value = element.getAttribute(attr);
    if (value) {
      extensions.push(...value.split(',').map(ext => ext.trim().toLowerCase()));
    }
  }

  // Check surrounding text for extension hints
  const parentText = element.parentElement?.textContent || '';
  const extMatch = parentText.match(/\.(jpg|jpeg|png|gif|pdf|doc|docx|xls|xlsx|ppt|pptx|txt|csv|zip|rar)\b/gi);
  if (extMatch) {
    extensions.push(...extMatch.map(ext => ext.substring(1).toLowerCase()));
  }

  return [...new Set(extensions)];
};

/**
 * Parse file size string to bytes
 */
const parseFileSize = (sizeStr: string): number | null => {
  const match = sizeStr.match(/^([0-9.]+)\s*(b|kb|mb|gb)$/i);
  if (!match) return null;

  const size = parseFloat(match[1]);
  const unit = match[2].toLowerCase();

  switch (unit) {
    case 'b':
      return size;
    case 'kb':
      return size * 1024;
    case 'mb':
      return size * 1024 * 1024;
    case 'gb':
      return size * 1024 * 1024 * 1024;
    default:
      return null;
  }
};

/**
 * Generate test file names based on accepted file types
 */
const generateTestFilesForAcceptTypes = (acceptTypes: AcceptType[], isMultiple: boolean): string[] => {
  const testFiles: string[] = [];
  const categorySamples: Record<AcceptType['category'], string[]> = {
    image: ['test-image.jpg', 'test-screenshot.png', 'test-photo.gif'],
    document: ['test-document.pdf', 'test-resume.docx', 'test-spreadsheet.xlsx', 'test-presentation.pptx'],
    audio: ['test-audio.mp3', 'test-recording.wav', 'test-music.ogg'],
    video: ['test-video.mp4', 'test-clip.avi', 'test-recording.mov'],
    archive: ['test-archive.zip', 'test-backup.rar', 'test-files.tar.gz'],
    text: ['test-notes.txt', 'test-data.csv', 'test-config.json'],
    other: ['test-file.bin', 'test-data.dat'],
  };

  // Group accept types by category
  const categories: Partial<Record<AcceptType['category'], AcceptType[]>> = {};
  for (const type of acceptTypes) {
    const group = categories[type.category];
    if (group) {
      group.push(type);
    } else {
      categories[type.category] = [type];
    }
  }

  // Generate test files for each category
  for (const [category, types] of Object.entries(categories) as [AcceptType['category'], AcceptType[]][]) {
    const samples = categorySamples[category] || ['test-file.txt'];

    // If specific extensions are specified, use them
    const extensionTypes = types.filter(t => t.type === 'extension');
    if (extensionTypes.length > 0) {
      for (const extType of extensionTypes) {
        testFiles.push(`test-${category}.${extType.value}`);
        if (isMultiple && testFiles.length < 3) {
          testFiles.push(`test-${category}-2.${extType.value}`);
        }
      }
    } else {
      // Use default samples for the category
      testFiles.push(...samples.slice(0, isMultiple ? 2 : 1));
    }
  }

  // Add default files if nothing matched
  if (testFiles.length === 0) {
    testFiles.push('test-document.pdf');
    if (isMultiple) {
      testFiles.push('test-image.jpg', 'test-data.xlsx');
    }
  }

  // Remove duplicates and limit to reasonable number
  const uniqueFiles = [...new Set(testFiles)];
  return isMultiple ? uniqueFiles.slice(0, 3) : [uniqueFiles[0]];
};

/**
 * Enhanced file upload component detection patterns
 */
const FILE_UPLOAD_PATTERNS = {
  // Class name patterns for modern upload components
  classNames: [
    /\b(file-upload|upload|dropzone|file-drop|file-input)\b/i,
    /\b(drag-drop|drop-zone|drop-area|file-picker)\b/i,
    /\b(upload-area|upload-zone|upload-container)\b/i,
    /\b(file-browser|file-chooser|file-selector)\b/i,
    /\b(attachment|attach-file|document-upload)\b/i,
    // Framework-specific patterns
    /\b(react-dropzone|vue-upload|ng-upload|ant-upload)\b/i,
    /\b(el-upload|v-upload|mat-file-upload|md-file-upload)\b/i,
    /\b(filepond|dropzone-js|fine-uploader|plupload)\b/i,
    // Cloud storage patterns
    /\b(dropbox|google-drive|onedrive|box|drive)\b/i,
    /\b(cloud-upload|cloud-storage|remote-upload)\b/i,
    /\b(gdrive|gdocs|gcloud|aws-s3|azure-blob)\b/i,
    /\b(sharepoint|teams-file|slack-file|notion-file)\b/i,
    // Job application specific patterns
    /\b(resume|cv|portfolio|document|certificate)\b/i,
    /\b(application-upload|candidate-upload|job-upload)\b/i,
    /\b(recruiter-upload|hiring-upload|talent-upload)\b/i,
    // Drag and drop specific patterns
    /\b(droppable|draggable|drop-target|drag-target)\b/i,
    /\b(dnd|drag-n-drop|drag-and-drop)\b/i,
    /\b(file-zone|upload-zone|target-zone)\b/i,
  ],

  // Data attributes that indicate file upload functionality
  dataAttributes: [
    'data-file-upload',
    'data-upload',
    'data-file-input',
    'data-file-drop',
    'data-dropzone',
    'data-file-picker',
    'data-upload-area',
    'data-attach',
    'data-testid',
    'data-cy',
    'data-qa',
    'data-selenium-id',
  ],

  // ARIA roles and attributes
  ariaPatterns: [
    { role: 'button', textPattern: /\b(upload|file|attach|browse|choose|select)\b/i },
    { role: 'region', labelPattern: /\b(upload|file|drop|drag)\b/i },
    { attribute: 'aria-label', pattern: /\b(upload|file|attach|browse|choose|select)\b/i },
  ],

  // Text content patterns that suggest file upload
  textPatterns: [
    /\b(upload|attach|browse|choose|select)\s+(file|document|image|photo|video)s?\b/i,
    /\b(drag\s+(&|and|\+)\s+drop|drop\s+file|drop\s+here)\b/i,
    /\b(click\s+to\s+upload|tap\s+to\s+upload|browse\s+file)\b/i,
    /\b(add\s+file|select\s+file|choose\s+file)\b/i,
  ],

  // CSS selectors for hidden file inputs (common pattern)
  hiddenFileInputs: [
    'input[type="file"][style*="display: none"]',
    'input[type="file"][style*="visibility: hidden"]',
    'input[type="file"][hidden]',
    'input[type="file"].hidden',
    'input[type="file"].sr-only',
    'input[type="file"].visually-hidden',
  ],
};

/**
 * Check if an element matches file upload patterns
 */
const isFileUploadElement = (element: HTMLElement): boolean => {
  // Standard file input
  if (element instanceof HTMLInputElement && element.type === FieldTypeEnum.FILE) {
    return true;
  }

  // Check class name patterns
  const className = element.className || '';
  if (FILE_UPLOAD_PATTERNS.classNames.some(pattern => pattern.test(className))) {
    return true;
  }

  // Check data attributes
  const hasFileUploadAttrs = FILE_UPLOAD_PATTERNS.dataAttributes.some(attr => {
    const attrValue = element.getAttribute(attr);
    return attrValue && (/\b(upload|file|attach|browse|drop|drag)\b/i.test(attrValue) || element.hasAttribute(attr));
  });

  if (hasFileUploadAttrs || element.hasAttribute('accept')) {
    return true;
  }

  // Check ARIA patterns
  const role = element.getAttribute('role');
  const ariaLabel = element.getAttribute('aria-label') || '';
  const textContent = element.textContent || '';

  for (const pattern of FILE_UPLOAD_PATTERNS.ariaPatterns) {
    if (pattern.role && role === pattern.role) {
      if (pattern.textPattern && pattern.textPattern.test(textContent)) {
        return true;
      }
      if (pattern.labelPattern && pattern.labelPattern.test(ariaLabel)) {
        return true;
      }
    }
    if (pattern.attribute && pattern.pattern && pattern.pattern.test(ariaLabel)) {
      return true;
    }
  }

  // Check text content patterns
  const combinedText = `${textContent} ${ariaLabel}`.toLowerCase();
  if (FILE_UPLOAD_PATTERNS.textPatterns.some(pattern => pattern.test(combinedText))) {
    return true;
  }

  return false;
};

/**
 * Calculate DOM distance between two elements by walking up to
 * their common ancestor, counting edges.
 */
const getDomDistance = (a: HTMLElement, b: HTMLElement): number => {
  const pathA: HTMLElement[] = [];
  const pathB: HTMLElement[] = [];
  let current: HTMLElement | null = a;
  while (current) {
    pathA.push(current);
    current = current.parentElement;
  }
  current = b;
  while (current) {
    pathB.push(current);
    current = current.parentElement;
  }
  const setA = new Set(pathA);
  let distB = 0;
  for (const node of pathB) {
    if (setA.has(node)) {
      const distA = pathA.indexOf(node);
      return distA + distB;
    }
    distB++;
  }
  return Infinity;
};

/**
 * Find associated hidden file input for custom upload components.
 * Uses a progressive multi-strategy search: child, parent traversal (5 levels),
 * sibling inspection, label associations, form scope, shadow DOM, and finally
 * a global nearest-by-DOM-distance fallback.
 */
const findAssociatedFileInput = (element: HTMLElement): HTMLInputElement | null => {
  // Strategy 1: Look for hidden file input as child
  let fileInput = queryInputElement(element, 'input[type="file"]');
  if (fileInput) return fileInput;

  // Strategy 2: Walk up to 5 levels of parent elements, checking each for file inputs
  let ancestor: HTMLElement | null = element.parentElement;
  for (let level = 0; level < 5 && ancestor; level++) {
    fileInput = queryInputElement(ancestor, 'input[type="file"]');
    if (fileInput) return fileInput;

    // Also check siblings of each ancestor
    const siblings = Array.from(ancestor.parentElement?.children ?? []);
    for (const sibling of siblings) {
      if (sibling === ancestor || !(sibling instanceof HTMLElement)) continue;
      fileInput = queryInputElement(sibling, 'input[type="file"]');
      if (fileInput) return fileInput;
      if (sibling instanceof HTMLInputElement && sibling.type === FieldTypeEnum.FILE) return sibling;
    }

    ancestor = ancestor.parentElement;
  }

  // Strategy 3: Look for file input by ID reference (label for="id")
  const forAttr = element.getAttribute('for');
  if (forAttr) {
    const referenced = document.getElementById(forAttr);
    if (referenced instanceof HTMLInputElement && referenced.type === FieldTypeEnum.FILE) return referenced;
  }

  // Strategy 4: Look for file input by aria-controls
  const ariaControls = element.getAttribute('aria-controls');
  if (ariaControls) {
    const referenced = document.getElementById(ariaControls);
    if (referenced instanceof HTMLInputElement && referenced.type === FieldTypeEnum.FILE) return referenced;
  }

  // Strategy 5: Check if a <label> element wraps or references a file input
  const labelElement = element.closest('label') ?? (element.tagName === 'LABEL' ? element : null);
  if (labelElement) {
    fileInput = queryInputElement(labelElement, 'input[type="file"]');
    if (fileInput) return fileInput;
    const labelFor = labelElement instanceof HTMLLabelElement ? labelElement.htmlFor : null;
    if (labelFor) {
      const referenced = document.getElementById(labelFor);
      if (referenced instanceof HTMLInputElement && referenced.type === FieldTypeEnum.FILE) return referenced;
    }
  }

  // Strategy 6: Look for file inputs with matching name within the same form
  const form = element.closest('form');
  if (form) {
    const nameAttr = element.getAttribute('name') || element.getAttribute('data-name');
    if (nameAttr) {
      fileInput = queryInputElement(form, `input[type="file"][name="${CSS.escape(nameAttr)}"]`);
      if (fileInput) return fileInput;
    }
    fileInput = queryInputElement(form, 'input[type="file"]');
    if (fileInput) return fileInput;
  }

  // Strategy 7: Look for hidden file inputs using common selectors with context check
  for (const selector of FILE_UPLOAD_PATTERNS.hiddenFileInputs) {
    const candidates = document.querySelectorAll<HTMLInputElement>(selector);
    for (const candidate of Array.from(candidates)) {
      const inputParent = candidate.closest('[class*="upload"], [class*="file"], [class*="drop"]');
      if (inputParent && (inputParent.contains(element) || element.contains(inputParent))) {
        return candidate;
      }
    }
  }

  // Strategy 8: Check shadow DOM roots of ancestors and nearby elements
  ancestor = element.parentElement;
  for (let level = 0; level < 5 && ancestor; level++) {
    if (ancestor.shadowRoot) {
      fileInput = queryInputElement(ancestor.shadowRoot, 'input[type="file"]');
      if (fileInput) return fileInput;
    }
    ancestor = ancestor.parentElement;
  }
  if (element.shadowRoot) {
    fileInput = queryInputElement(element.shadowRoot, 'input[type="file"]');
    if (fileInput) return fileInput;
  }

  // Strategy 9: Global fallback - find the closest file input by DOM distance
  const allFileInputs = document.querySelectorAll<HTMLInputElement>('input[type="file"]');
  if (allFileInputs.length > 0) {
    let closest: HTMLInputElement | null = null;
    let minDistance = Infinity;
    for (const candidate of Array.from(allFileInputs)) {
      const distance = getDomDistance(element, candidate);
      if (distance < minDistance) {
        minDistance = distance;
        closest = candidate;
      }
    }
    if (closest && minDistance <= 15) {
      return closest;
    }
  }

  return null;
};

/**
 * Detect enhanced drag-and-drop zones with modern patterns.
 * Covers generic patterns plus React Dropzone, FilePond, Uppy,
 * vue-upload-component, Angular Material, Ant Design Upload,
 * and Chakra UI file upload.
 */
const detectEnhancedDragDropZone = (element: HTMLElement): boolean => {
  const className = element.className || '';
  const dataAttrs = Array.from(element.attributes)
    .map(a => `${a.name}=${a.value}`)
    .join(' ');

  // Generic drag-and-drop class patterns
  const genericPatterns = [
    /\b(drop-zone|dropzone|drop-area|drag-area)\b/i,
    /\b(file-drop|file-drag|upload-drop)\b/i,
    /\b(droppable|draggable|sortable)\b/i,
  ];

  // Framework-specific class and attribute patterns
  const frameworkPatterns = [
    /\breact-dropzone\b/i,
    /\bgetRootProps\b/i,
    /\bgetInputProps\b/i,
    /\bfilepond--root\b/i,
    /\bfilepond\b/i,
    /\buppy-Dashboard\b/i,
    /\buppy-DragDrop\b/i,
    /\buppy-StatusBar\b/i,
    /\bfile-uploads?\b/i,
    /\bvue-upload\b/i,
    /\bmat-file-upload\b/i,
    /\bngx-file-drop\b/i,
    /\bngx-dropzone\b/i,
    /\bant-upload\b/i,
    /\bant-upload-drag\b/i,
    /\bchakra-file-upload\b/i,
    /\bchakra-dropzone\b/i,
  ];

  const combinedText = `${className} ${dataAttrs}`;
  const hasDropClass =
    genericPatterns.some(pattern => pattern.test(combinedText)) ||
    frameworkPatterns.some(pattern => pattern.test(combinedText));

  // Check for HTML5 drag-and-drop attributes
  const hasDropAttributes =
    element.hasAttribute('droppable') ||
    element.hasAttribute('ondrop') ||
    element.hasAttribute('ondragover') ||
    element.hasAttribute('ondragenter');

  // Check for data attributes that React Dropzone and similar libraries set
  const hasDropDataAttrs =
    element.hasAttribute('data-rbd-droppable-id') ||
    element.hasAttribute('data-dropzone') ||
    element.getAttribute('role') === 'presentation';

  // Check for ARIA indicators
  const ariaLabel = element.getAttribute('aria-label') || '';
  const hasDropAria = /\b(drop|drag|upload)\b/i.test(ariaLabel);

  // Check for text content indicating drop zone
  const textContent = element.textContent || '';
  const hasDropText = /\b(drop\s+file|drag\s+file|drop\s+here|drag\s+(&|and)\s+drop)\b/i.test(textContent);

  // Check for FilePond-specific element structure
  const isFilePond = element.closest('.filepond--root') !== null || element.querySelector('.filepond--root') !== null;

  // Check for Uppy-specific element structure
  const isUppy = element.closest('[class*="uppy"]') !== null || element.querySelector('[class*="uppy"]') !== null;

  // Check for Ant Design Upload
  const isAntUpload = element.closest('.ant-upload') !== null || element.querySelector('.ant-upload') !== null;

  return (
    hasDropClass ||
    hasDropAttributes ||
    hasDropDataAttrs ||
    hasDropAria ||
    hasDropText ||
    isFilePond ||
    isUppy ||
    isAntUpload
  );
};

/**
 * Cloud storage integration detection
 */
interface CloudStorageIntegration {
  provider: 'dropbox' | 'google-drive' | 'onedrive' | 'box' | 'aws-s3' | 'unknown';
  button?: HTMLElement;
  container?: HTMLElement;
  apiEndpoint?: string;
}

/**
 * Detect cloud storage integration patterns
 */
const detectCloudStorageIntegration = (element: HTMLElement): CloudStorageIntegration | null => {
  const className = element.className.toLowerCase();
  const textContent = element.textContent?.toLowerCase() || '';
  const ariaLabel = element.getAttribute('aria-label')?.toLowerCase() || '';
  const combinedText = `${className} ${textContent} ${ariaLabel}`;

  // Dropbox integration
  if (/\b(dropbox|dbx)\b/i.test(combinedText)) {
    return {
      provider: 'dropbox',
      button: element.querySelector<HTMLElement>('[class*="dropbox"], [data-service="dropbox"]') ?? undefined,
      container: element.closest<HTMLElement>('[class*="dropbox"]') ?? undefined,
    };
  }

  // Google Drive integration
  if (/\b(google[\s-]?drive|gdrive|gcloud)\b/i.test(combinedText)) {
    return {
      provider: 'google-drive',
      button: element.querySelector<HTMLElement>('[class*="google"], [data-service="google"]') ?? undefined,
      container: element.closest<HTMLElement>('[class*="google"]') ?? undefined,
    };
  }

  // OneDrive integration
  if (/\b(onedrive|microsoft[\s-]?drive)\b/i.test(combinedText)) {
    return {
      provider: 'onedrive',
      button: element.querySelector<HTMLElement>('[class*="onedrive"], [data-service="onedrive"]') ?? undefined,
      container: element.closest<HTMLElement>('[class*="onedrive"]') ?? undefined,
    };
  }

  // Box integration
  if (/\bbox\b/i.test(combinedText) && /\b(cloud|storage|file)\b/i.test(combinedText)) {
    return {
      provider: 'box',
      button: element.querySelector<HTMLElement>('[class*="box"], [data-service="box"]') ?? undefined,
      container: element.closest<HTMLElement>('[class*="box"]') ?? undefined,
    };
  }

  return null;
};

/**
 * Handle cloud storage upload interactions
 */
const handleCloudStorageUpload = async (
  element: HTMLElement,
  files: File[],
  integration: CloudStorageIntegration,
): Promise<void> => {
  try {
    console.log(`Handling ${integration.provider} upload with ${files.length} files`);

    // Find the appropriate button to click
    const targetButton = integration.button ?? element.querySelector<HTMLElement>('button, [role="button"]') ?? element;

    if (targetButton) {
      // Click the cloud storage button
      targetButton.click();

      // Wait for cloud storage interface to load
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Try to simulate file selection in the cloud storage interface
      await simulateCloudStorageSelection(integration.provider, files);
    }

    // Also try drag-and-drop as fallback
    if (integration.container) {
      await simulateDragAndDrop(integration.container, files);
    }
  } catch (error) {
    console.warn(`Error handling ${integration.provider} upload:`, error);
  }
};

/**
 * Simulate file selection in cloud storage interfaces
 */
const simulateCloudStorageSelection = async (provider: string, files: File[]): Promise<void> => {
  try {
    // Wait for potential modal/popup to appear
    await new Promise(resolve => setTimeout(resolve, 500));

    // Look for common cloud storage interface elements
    const cloudSelectors = [
      // Generic cloud storage selectors
      '[class*="file-picker"]',
      '[class*="cloud-picker"]',
      '[role="dialog"] [class*="file"]',
      '[role="dialog"] [class*="select"]',
      // Provider-specific selectors
      `[class*="${provider}"] [class*="file"]`,
      `[class*="${provider}"] [class*="select"]`,
      // Common button patterns
      'button[class*="select"]',
      'button[class*="choose"]',
      'button[class*="confirm"]',
    ];

    // Try to find and interact with cloud storage interface
    for (const selector of cloudSelectors) {
      const elements = document.querySelectorAll(selector);
      if (elements.length > 0) {
        console.log(`Found cloud storage interface elements: ${selector}`);

        // Click the first available element
        const firstElement = elements[0];
        if (firstElement instanceof HTMLElement) {
          firstElement.click();
          await new Promise(resolve => setTimeout(resolve, 200));
        }
        break;
      }
    }

    // Dispatch custom events that cloud storage APIs might listen for
    const customEvents = ['cloud-file-selected', 'files-chosen', `${provider}-file-selected`, 'picker-file-selected'];

    customEvents.forEach(eventName => {
      try {
        const event = new CustomEvent(eventName, {
          detail: { files, provider },
          bubbles: true,
        });
        document.dispatchEvent(event);
      } catch (error) {
        console.debug(`Could not dispatch ${eventName}:`, error);
      }
    });
  } catch (error) {
    console.warn(`Error simulating ${provider} selection:`, error);
  }
};

/**
 * Detect file input fields from a set of elements
 */
const detectFileFields = async (
  elements: HTMLElement[],
  baseIndex: number,
  testMode: boolean = false,
): Promise<Field[]> => {
  const fields: Field[] = [];

  // Enhanced file upload element detection
  const fileElements = elements.filter(element => isFileUploadElement(element));

  for (let i = 0; i < fileElements.length; i++) {
    const element = fileElements[i];
    let fileInput: HTMLInputElement | null = null;
    let isCustomUpload = false;

    // Determine if this is a standard file input or custom upload component
    if (element instanceof HTMLInputElement && element.type === FieldTypeEnum.FILE) {
      fileInput = element;
    } else {
      // This is a custom upload component, find the associated file input
      fileInput = findAssociatedFileInput(element);
      isCustomUpload = true;
    }

    // Skip if we couldn't find a file input
    if (!fileInput) {
      console.warn(`Could not find file input for upload element:`, element);
      continue;
    }

    // Skip disabled/hidden elements (but allow custom upload components)
    if (
      fileInput.disabled ||
      fileInput.readOnly ||
      (!isCustomUpload && fileInput.getAttribute('aria-hidden') === 'true') ||
      (!isCustomUpload &&
        window.getComputedStyle(fileInput).display === 'none' &&
        window.getComputedStyle(fileInput).visibility === 'hidden')
    ) {
      continue;
    }

    // Create field based on the actual file input or custom component
    const targetElement = isCustomUpload ? element : fileInput;
    const baseField = await createBaseField(targetElement, baseIndex + i, 'file', testMode);
    const field: FileField = { ...baseField };

    // Add file-specific metadata from the actual file input
    const acceptTypes = parseAcceptTypes(fileInput.accept || '');
    field.acceptTypes = fileInput.accept || undefined;
    field.multiple = fileInput.multiple;
    field.required = fileInput.required;
    field.name = fileInput.name || targetElement.getAttribute('name') || '';

    // Store references to both elements for later use
    // We'll store file upload specific data in a way that doesn't conflict with the base metadata structure
    if (!field.metadata) {
      field.metadata = {
        framework: Framework.VANILLA,
        visibility: { isVisible: true },
      };
    }

    // Store file upload specific metadata in the metadata record
    field.metadata.fileUploadData = {
      fileInput: fileInput,
      isCustomUpload: isCustomUpload,
      triggerElement: isCustomUpload ? element : fileInput,
      acceptedTypes: acceptTypes,
      maxFileSize: extractMaxFileSize(targetElement),
      allowedExtensions: extractAllowedExtensions(targetElement),
    };

    // Handle test values with enhanced logic
    if (testMode) {
      if (acceptTypes.length > 0) {
        // Generate test files based on accepted types
        const testFiles = generateTestFilesForAcceptTypes(acceptTypes, fileInput.multiple);
        field.testValue = fileInput.multiple ? testFiles : testFiles[0];
      } else {
        // Default test files when no accept types specified
        if (fileInput.multiple) {
          field.testValue = ['test-document.pdf', 'test-image.jpg', 'test-spreadsheet.xlsx'];
        } else {
          field.testValue = 'test-document.pdf';
        }
      }
    }

    fields.push(field);
  }

  return fields;
};

// ============================================================================
// Exports (at end of file per ESLint import-x/exports-last rule)
// ============================================================================

export {
  updateFileInput,
  detectFileFields,
  getFileTypeFromExtension,
  getExtensionFromMimeType,
  createRealisticFile,
  createRealisticFileContent,
  validateFileContent,
  parseAcceptTypes,
  categorizeFileType,
  categorizeMimeType,
  parseFileSize,
  generateTestFilesForAcceptTypes,
  programmaticSetFiles,
  verifyFilesSet,
  watchForDynamicFileInput,
  findAssociatedFileInput,
  detectEnhancedDragDropZone,
  simulateDragAndDrop,
  MIME_TYPE_MAP,
};

export type { AcceptType };
