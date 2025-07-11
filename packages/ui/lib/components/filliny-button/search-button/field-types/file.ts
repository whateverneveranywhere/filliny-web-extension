import { createBaseField } from "./utils";
import type { Field } from "@extension/shared";

// Extend Field type with file-specific properties
interface FileField extends Field {
  acceptTypes?: string;
  multiple?: boolean;
}

/**
 * Download file from URL with enhanced validation and error handling
 */
const downloadFileFromUrl = async (url: string, filename?: string, acceptTypes?: AcceptType[]): Promise<File> => {
  try {
    // Validate URL format
    const urlObj = new URL(url);
    if (!["http:", "https:"].includes(urlObj.protocol)) {
      throw new Error(`Unsupported protocol: ${urlObj.protocol}`);
    }

    console.log(`Downloading file from: ${url}`);

    // Add headers to mimic a real browser request
    const response = await fetch(url, {
      method: "GET",
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36",
        Accept: "*/*",
        "Accept-Language": "en-US,en;q=0.9",
        "Cache-Control": "no-cache",
      },
      mode: "cors",
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status} - ${response.statusText}`);
    }

    // Check content length for reasonable file size (max 100MB)
    const contentLength = response.headers.get("content-length");
    if (contentLength && parseInt(contentLength) > 100 * 1024 * 1024) {
      throw new Error(`File too large: ${contentLength} bytes (max 100MB)`);
    }

    const blob = await response.blob();
    let contentType = response.headers.get("content-type") || "application/octet-stream";

    // Clean up content type (remove charset, etc.)
    contentType = contentType.split(";")[0].trim();

    // Extract filename from URL or Content-Disposition header if not provided
    if (!filename) {
      // Try Content-Disposition header first
      const contentDisposition = response.headers.get("content-disposition");
      if (contentDisposition) {
        const filenameMatch = contentDisposition.match(/filename[*]?=["']?([^;\r\n"']*)["']?/i);
        if (filenameMatch && filenameMatch[1]) {
          filename = decodeURIComponent(filenameMatch[1]);
        }
      }

      // Fallback to URL path
      if (!filename) {
        const urlPath = urlObj.pathname;
        filename = urlPath.split("/").pop() || "downloaded_file";

        // If no extension, try to infer from content type
        if (!filename.includes(".") && contentType !== "application/octet-stream") {
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
        if (acceptType.type === "mime") {
          return (
            contentType === acceptType.value ||
            (acceptType.value.endsWith("/*") && contentType.startsWith(acceptType.value.slice(0, -1)))
          );
        } else {
          return filename!.toLowerCase().endsWith(`.${acceptType.value.toLowerCase()}`);
        }
      });

      if (!isValidType) {
        throw new Error(
          `File type '${contentType}' not allowed. Expected: ${acceptTypes.map(t => t.value).join(", ")}`,
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
    "image/jpeg": "jpg",
    "image/png": "png",
    "image/gif": "gif",
    "image/webp": "webp",
    "image/svg+xml": "svg",
    "application/pdf": "pdf",
    "application/msword": "doc",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document": "docx",
    "application/vnd.ms-excel": "xls",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": "xlsx",
    "application/zip": "zip",
    "text/plain": "txt",
    "text/csv": "csv",
    "application/json": "json",
    "video/mp4": "mp4",
    "audio/mpeg": "mp3",
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
      "image/jpeg": [[0xff, 0xd8, 0xff]],
      "image/png": [[0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]],
      "image/gif": [
        [0x47, 0x49, 0x46, 0x38, 0x37, 0x61],
        [0x47, 0x49, 0x46, 0x38, 0x39, 0x61],
      ],
      "application/pdf": [[0x25, 0x50, 0x44, 0x46]], // %PDF
      "application/zip": [
        [0x50, 0x4b, 0x03, 0x04],
        [0x50, 0x4b, 0x05, 0x06],
        [0x50, 0x4b, 0x07, 0x08],
      ],
    };

    // Also check Office documents (which are ZIP-based)
    if (expectedMimeType.includes("officedocument") || filename.match(/\.(docx|xlsx|pptx)$/i)) {
      const zipSignatures = signatures["application/zip"];
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
    console.warn("Error validating file content:", error);
    return true; // Assume valid on error
  }
};

/**
 * Create realistic binary content for test files
 */
const createRealisticFileContent = (filename: string, mimeType: string): Uint8Array => {
  const name = filename.toLowerCase();

  // PDF file header
  if (mimeType === "application/pdf" || name.endsWith(".pdf")) {
    const pdfHeader = "%PDF-1.4\n1 0 obj\n<<\n/Type /Catalog\n/Pages 2 0 R\n>>\nendobj\n";
    return new TextEncoder().encode(pdfHeader + "\n% Simple PDF content for testing\n");
  }

  // JPEG file header
  if (mimeType === "image/jpeg" || name.endsWith(".jpg") || name.endsWith(".jpeg")) {
    return new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46, 0x00, 0x01]);
  }

  // PNG file header
  if (mimeType === "image/png" || name.endsWith(".png")) {
    return new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  }

  // ZIP file header
  if (mimeType === "application/zip" || name.endsWith(".zip")) {
    return new Uint8Array([0x50, 0x4b, 0x03, 0x04]);
  }

  // Excel file header (Office Open XML)
  if (mimeType.includes("spreadsheet") || name.endsWith(".xlsx")) {
    return new Uint8Array([0x50, 0x4b, 0x03, 0x04, 0x14, 0x00, 0x06, 0x00]);
  }

  // Word document header (Office Open XML)
  if (mimeType.includes("wordprocessingml") || name.endsWith(".docx")) {
    return new Uint8Array([0x50, 0x4b, 0x03, 0x04, 0x14, 0x00, 0x06, 0x00]);
  }

  // Generic text content with some realistic structure
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

  if (detectedMimeType.startsWith("image/")) {
    targetSize = Math.random() * (500 * 1024 - 50 * 1024) + 50 * 1024; // 50KB - 500KB
  } else if (detectedMimeType === "application/pdf") {
    targetSize = Math.random() * (2 * 1024 * 1024 - 100 * 1024) + 100 * 1024; // 100KB - 2MB
  } else if (detectedMimeType.includes("video/")) {
    targetSize = Math.random() * (10 * 1024 * 1024 - 1024 * 1024) + 1024 * 1024; // 1MB - 10MB
  }

  // Create content with target size
  let finalContent = content;
  if (content.length < targetSize) {
    const padding = new Uint8Array(Math.floor(targetSize - content.length));
    padding.fill(0x20); // Fill with spaces
    finalContent = new Uint8Array([...content, ...padding]);
  }

  const blob = new Blob([finalContent], { type: detectedMimeType });
  return new File([blob], filename, {
    type: detectedMimeType,
    lastModified: Date.now() - Math.random() * 86400000, // Random time within last 24h
  });
};

/**
 * Simulate drag and drop file upload for custom upload components
 */
const simulateDragAndDrop = async (dropZone: HTMLElement, files: File[]): Promise<void> => {
  try {
    // Create drag and drop events
    const dataTransfer = new DataTransfer();
    files.forEach(file => dataTransfer.items.add(file));

    // Simulate the drag and drop sequence
    const dragEnterEvent = new DragEvent("dragenter", {
      bubbles: true,
      cancelable: true,
      dataTransfer,
    });

    const dragOverEvent = new DragEvent("dragover", {
      bubbles: true,
      cancelable: true,
      dataTransfer,
    });

    const dropEvent = new DragEvent("drop", {
      bubbles: true,
      cancelable: true,
      dataTransfer,
    });

    // Dispatch events in sequence
    dropZone.dispatchEvent(dragEnterEvent);
    await new Promise(resolve => setTimeout(resolve, 10));

    dropZone.dispatchEvent(dragOverEvent);
    await new Promise(resolve => setTimeout(resolve, 10));

    dropZone.dispatchEvent(dropEvent);

    // Also try common custom events
    const customEvents = ["file-drop", "files-added", "upload-files", "fileupload"];
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
    console.warn("Error simulating drag and drop:", error);
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
        element.dispatchEvent(new MouseEvent("mousedown", { bubbles: true }));
        element.dispatchEvent(new MouseEvent("mouseup", { bubbles: true }));
        element.dispatchEvent(new MouseEvent("click", { bubbles: true }));
      },

      // Approach 3: Focus and keyboard events
      () => {
        element.focus();
        element.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter", bubbles: true }));
        element.dispatchEvent(new KeyboardEvent("keyup", { key: "Enter", bubbles: true }));
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
        if (result !== undefined && result !== null && typeof result === "object" && "then" in result) {
          await result;
        }
        await new Promise(resolve => setTimeout(resolve, 100));
      } catch (error) {
        console.debug("Upload trigger approach failed:", error);
      }
    }

    // If the element supports drag and drop, simulate that too
    const isDragDropTarget =
      element.hasAttribute("droppable") ||
      element.classList.toString().match(/drop|drag/i) ||
      element.getAttribute("role") === "region";

    if (isDragDropTarget) {
      await simulateDragAndDrop(element, files);
    }
  } catch (error) {
    console.warn("Error triggering custom upload component:", error);
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
        .map(type => (type.type === "extension" ? `.${type.value}` : type.value))
        .join(",");
      fileInput.accept = acceptString;
    }

    fileInput.multiple = isMultiple;

    // Set up change listener
    const handleChange = (event: Event) => {
      const target = event.target as HTMLInputElement;
      const files = target.files ? Array.from(target.files) : [];

      // Clean up
      fileInput.removeEventListener("change", handleChange);
      fileInput.removeEventListener("cancel", handleCancel);

      resolve(files.length > 0 ? files : null);
    };

    const handleCancel = () => {
      // Clean up
      fileInput.removeEventListener("change", handleChange);
      fileInput.removeEventListener("cancel", handleCancel);

      resolve(null);
    };

    // Add event listeners
    fileInput.addEventListener("change", handleChange, { once: true });
    fileInput.addEventListener("cancel", handleCancel, { once: true });

    // Trigger the file picker
    try {
      fileInput.click();
    } catch (error) {
      console.warn("Failed to trigger file picker:", error);
      resolve(null);
    }
  });

/**
 * Update a file input with actual file objects or simulate file selection
 * This function handles both test mode and AI mode file filling with enhanced capabilities
 */
export const updateFileInput = async (
  fileInput: HTMLInputElement,
  value: string | string[],
  isTestMode: boolean = false,
  isAiMode: boolean = false,
  fieldMetadata?: any, // eslint-disable-line @typescript-eslint/no-explicit-any
): Promise<void> => {
  const valueType = typeof value === "string" ? "single file" : "multiple files";
  console.log(`Updating file input with ${valueType}, testMode: ${isTestMode}, aiMode: ${isAiMode}`);

  try {
    // For visual feedback
    fileInput.classList.add("filliny-file-selected");

    let files: File[] = [];
    const fileNames: string[] = Array.isArray(value) ? value : [value];
    const acceptTypes = fieldMetadata?.fileUploadData?.acceptedTypes || [];
    const isCustomUpload = fieldMetadata?.fileUploadData?.isCustomUpload || false;
    const triggerElement = fieldMetadata?.fileUploadData?.triggerElement || fileInput;

    if (isAiMode) {
      // AI mode - download files from URLs or create realistic files
      for (const fileUrl of fileNames) {
        try {
          if (fileUrl.startsWith("http://") || fileUrl.startsWith("https://")) {
            const file = await downloadFileFromUrl(fileUrl, undefined, acceptTypes);
            files.push(file);
          } else {
            // If not a URL, treat as filename and create a realistic file
            const file = createRealisticFile(fileUrl, getFileTypeFromExtension(fileUrl));
            files.push(file);
          }
        } catch (error) {
          console.warn(`Failed to download file from ${fileUrl}, creating realistic file:`, error);
          // Extract filename from URL for fallback
          let fallbackName = fileUrl;
          try {
            const urlObj = new URL(fileUrl);
            const pathName = urlObj.pathname.split("/").pop();
            if (pathName && pathName !== "") {
              fallbackName = pathName;
            }
          } catch {
            // Keep original fileUrl as fallback name
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
          console.warn("Failed to trigger native file picker, falling back to programmatic files:", error);
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

    // Try to actually set the files property if we have real file objects
    if (files.length > 0) {
      try {
        // Create a new FileList object with enhanced validation
        const dataTransfer = new DataTransfer();

        // Validate files against accept types if specified
        const validFiles = files.filter(file => {
          if (acceptTypes.length === 0) return true;

          return acceptTypes.some((acceptType: AcceptType) => {
            if (acceptType.type === "mime") {
              return (
                file.type === acceptType.value ||
                (acceptType.value.endsWith("/*") && file.type.startsWith(acceptType.value.slice(0, -1)))
              );
            } else {
              return file.name.toLowerCase().endsWith(`.${acceptType.value.toLowerCase()}`);
            }
          });
        });

        // Add validated files to data transfer
        validFiles.forEach(file => dataTransfer.items.add(file));

        // Set the files property
        fileInput.files = dataTransfer.files;

        // Set enhanced data attributes for debugging and validation
        fileInput.setAttribute("data-filliny-files", validFiles.map(f => f.name).join(", "));
        fileInput.setAttribute("data-filliny-files-count", validFiles.length.toString());
        fileInput.setAttribute("data-filliny-files-size", validFiles.reduce((acc, f) => acc + f.size, 0).toString());
        fileInput.setAttribute("data-filliny-files-types", validFiles.map(f => f.type).join(", "));

        // Store file references for later access
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (fileInput as any).__fillinyFiles = validFiles;

        console.log(
          `Successfully set ${validFiles.length} files on input:`,
          validFiles.map(f => `${f.name} (${f.size} bytes, ${f.type})`),
        );

        // If any files were filtered out, warn about it
        if (files.length > validFiles.length) {
          console.warn(`${files.length - validFiles.length} files were filtered out due to accept type restrictions`);
        }
      } catch (error) {
        console.warn("Could not set files property directly, falling back to attributes:", error);
        // Fallback to setting attributes
        fileInput.setAttribute("data-filliny-files", files.map(f => f.name).join(", "));
        fileInput.setAttribute("data-filliny-files-count", files.length.toString());
      }
    }

    // Attempt to trigger change events with enhanced event simulation
    const changeEvent = new Event("change", { bubbles: true, cancelable: true });
    const inputEvent = new Event("input", { bubbles: true, cancelable: true });

    // For custom upload components, also trigger additional events and simulate drag/drop
    if (isCustomUpload && triggerElement && files.length > 0) {
      try {
        // Trigger standard events
        triggerElement.dispatchEvent(new Event("change", { bubbles: true }));
        triggerElement.dispatchEvent(new Event("drop", { bubbles: true }));
        triggerElement.dispatchEvent(new Event("file-selected", { bubbles: true }));

        // Simulate drag and drop if it looks like a drop zone
        await simulateDragAndDrop(triggerElement, files);
      } catch (error) {
        console.debug("Could not dispatch events to custom upload element:", error);
      }
    }

    fileInput.dispatchEvent(changeEvent);
    fileInput.dispatchEvent(inputEvent);

    // Trigger form validation if the input is part of a form
    const form = fileInput.closest("form");
    if (form) {
      try {
        fileInput.dispatchEvent(new Event("blur", { bubbles: true }));
      } catch (error) {
        console.debug("Could not trigger form validation:", error);
      }
    }

    // Add a visual indicator next to the input
    const parent = fileInput.parentElement;
    if (parent) {
      const indicator = document.createElement("span");
      indicator.className = "filliny-file-indicator";
      indicator.style.marginLeft = "8px";
      indicator.style.color = "#0284c7";
      indicator.style.fontStyle = "italic";
      indicator.style.fontSize = "12px";
      indicator.style.fontWeight = "500";

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
      const existingIndicator = parent.querySelector(".filliny-file-indicator");
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
    console.error("Error updating file input:", error);
  }
};

/**
 * Get file MIME type from file extension
 */
const getFileTypeFromExtension = (filename: string): string => {
  const ext = filename.split(".").pop()?.toLowerCase();
  return MIME_TYPE_MAP[ext || ""] || "application/octet-stream";
};

/**
 * Comprehensive MIME type mapping with enhanced file type support
 */
const MIME_TYPE_MAP: Record<string, string> = {
  // Images
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  gif: "image/gif",
  bmp: "image/bmp",
  webp: "image/webp",
  svg: "image/svg+xml",
  ico: "image/x-icon",
  tiff: "image/tiff",
  tif: "image/tiff",
  heic: "image/heic",
  heif: "image/heif",

  // Documents
  pdf: "application/pdf",
  doc: "application/msword",
  docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  xls: "application/vnd.ms-excel",
  xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  ppt: "application/vnd.ms-powerpoint",
  pptx: "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  odt: "application/vnd.oasis.opendocument.text",
  ods: "application/vnd.oasis.opendocument.spreadsheet",
  odp: "application/vnd.oasis.opendocument.presentation",
  rtf: "application/rtf",

  // Text
  txt: "text/plain",
  csv: "text/csv",
  json: "application/json",
  xml: "application/xml",
  html: "text/html",
  htm: "text/html",
  css: "text/css",
  js: "application/javascript",
  ts: "application/typescript",
  md: "text/markdown",
  yaml: "text/yaml",
  yml: "text/yaml",

  // Archives
  zip: "application/zip",
  rar: "application/x-rar-compressed",
  tar: "application/x-tar",
  gz: "application/gzip",
  "7z": "application/x-7z-compressed",
  bz2: "application/x-bzip2",

  // Audio
  mp3: "audio/mpeg",
  wav: "audio/wav",
  ogg: "audio/ogg",
  flac: "audio/flac",
  aac: "audio/aac",
  wma: "audio/x-ms-wma",
  m4a: "audio/mp4",

  // Video
  mp4: "video/mp4",
  avi: "video/x-msvideo",
  mov: "video/quicktime",
  wmv: "video/x-ms-wmv",
  flv: "video/x-flv",
  webm: "video/webm",
  mkv: "video/x-matroska",
  m4v: "video/mp4",

  // Fonts
  ttf: "font/ttf",
  otf: "font/otf",
  woff: "font/woff",
  woff2: "font/woff2",
  eot: "application/vnd.ms-fontobject",

  // Other
  exe: "application/octet-stream",
  dmg: "application/octet-stream",
  iso: "application/octet-stream",
};

/**
 * Parse accept attribute value into structured format
 */
interface AcceptType {
  type: "mime" | "extension";
  value: string;
  category: "image" | "document" | "audio" | "video" | "archive" | "text" | "other";
}

const parseAcceptTypes = (accept: string): AcceptType[] => {
  if (!accept) return [];

  return accept.split(",").map(type => {
    const trimmed = type.trim();

    if (trimmed.startsWith(".")) {
      // File extension
      const ext = trimmed.substring(1).toLowerCase();
      return {
        type: "extension",
        value: ext,
        category: categorizeFileType(ext),
      };
    } else {
      // MIME type
      const mimeType = trimmed.toLowerCase();
      return {
        type: "mime",
        value: mimeType,
        category: categorizeMimeType(mimeType),
      };
    }
  });
};

const categorizeFileType = (extension: string): AcceptType["category"] => {
  const imageExts = ["jpg", "jpeg", "png", "gif", "bmp", "webp", "svg", "ico", "tiff", "tif", "heic", "heif"];
  const documentExts = ["pdf", "doc", "docx", "xls", "xlsx", "ppt", "pptx", "odt", "ods", "odp", "rtf"];
  const audioExts = ["mp3", "wav", "ogg", "flac", "aac", "wma", "m4a"];
  const videoExts = ["mp4", "avi", "mov", "wmv", "flv", "webm", "mkv", "m4v"];
  const archiveExts = ["zip", "rar", "tar", "gz", "7z", "bz2"];
  const textExts = ["txt", "csv", "json", "xml", "html", "htm", "css", "js", "ts", "md", "yaml", "yml"];

  if (imageExts.includes(extension)) return "image";
  if (documentExts.includes(extension)) return "document";
  if (audioExts.includes(extension)) return "audio";
  if (videoExts.includes(extension)) return "video";
  if (archiveExts.includes(extension)) return "archive";
  if (textExts.includes(extension)) return "text";
  return "other";
};

const categorizeMimeType = (mimeType: string): AcceptType["category"] => {
  if (mimeType.startsWith("image/")) return "image";
  if (mimeType.startsWith("audio/")) return "audio";
  if (mimeType.startsWith("video/")) return "video";
  if (mimeType.startsWith("text/")) return "text";
  if (
    mimeType.includes("pdf") ||
    mimeType.includes("document") ||
    mimeType.includes("spreadsheet") ||
    mimeType.includes("presentation")
  )
    return "document";
  if (mimeType.includes("zip") || mimeType.includes("compressed")) return "archive";
  return "other";
};

/**
 * Extract maximum file size from element attributes or surrounding context
 */
const extractMaxFileSize = (element: HTMLElement): number | null => {
  // Check for common data attributes
  const maxSizeAttrs = ["data-max-size", "data-maxsize", "data-max-file-size", "data-size-limit"];

  for (const attr of maxSizeAttrs) {
    const value = element.getAttribute(attr);
    if (value) {
      const size = parseFileSize(value);
      if (size) return size;
    }
  }

  // Check surrounding text for size hints
  const parentText = element.parentElement?.textContent || "";
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
  const extAttrs = ["data-extensions", "data-allowed-extensions", "data-file-types"];
  for (const attr of extAttrs) {
    const value = element.getAttribute(attr);
    if (value) {
      extensions.push(...value.split(",").map(ext => ext.trim().toLowerCase()));
    }
  }

  // Check surrounding text for extension hints
  const parentText = element.parentElement?.textContent || "";
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
    case "b":
      return size;
    case "kb":
      return size * 1024;
    case "mb":
      return size * 1024 * 1024;
    case "gb":
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
  const categorySamples: Record<AcceptType["category"], string[]> = {
    image: ["test-image.jpg", "test-screenshot.png", "test-photo.gif"],
    document: ["test-document.pdf", "test-resume.docx", "test-spreadsheet.xlsx", "test-presentation.pptx"],
    audio: ["test-audio.mp3", "test-recording.wav", "test-music.ogg"],
    video: ["test-video.mp4", "test-clip.avi", "test-recording.mov"],
    archive: ["test-archive.zip", "test-backup.rar", "test-files.tar.gz"],
    text: ["test-notes.txt", "test-data.csv", "test-config.json"],
    other: ["test-file.bin", "test-data.dat"],
  };

  // Group accept types by category
  const categories = acceptTypes.reduce(
    (acc, type) => {
      if (!acc[type.category]) {
        acc[type.category] = [];
      }
      acc[type.category].push(type);
      return acc;
    },
    {} as Record<AcceptType["category"], AcceptType[]>,
  );

  // Generate test files for each category
  for (const [category, types] of Object.entries(categories)) {
    const samples = categorySamples[category as AcceptType["category"]] || ["test-file.txt"];

    // If specific extensions are specified, use them
    const extensionTypes = types.filter(t => t.type === "extension");
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
    testFiles.push("test-document.pdf");
    if (isMultiple) {
      testFiles.push("test-image.jpg", "test-data.xlsx");
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
    "data-file-upload",
    "data-upload",
    "data-file-input",
    "data-file-drop",
    "data-dropzone",
    "data-file-picker",
    "data-upload-area",
    "data-attach",
    "data-testid",
    "data-cy",
    "data-qa",
    "data-selenium-id",
  ],

  // ARIA roles and attributes
  ariaPatterns: [
    { role: "button", textPattern: /\b(upload|file|attach|browse|choose|select)\b/i },
    { role: "region", labelPattern: /\b(upload|file|drop|drag)\b/i },
    { attribute: "aria-label", pattern: /\b(upload|file|attach|browse|choose|select)\b/i },
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
  if (element instanceof HTMLInputElement && element.type === "file") {
    return true;
  }

  // Check class name patterns
  const className = element.className || "";
  if (FILE_UPLOAD_PATTERNS.classNames.some(pattern => pattern.test(className))) {
    return true;
  }

  // Check data attributes
  const hasFileUploadAttrs = FILE_UPLOAD_PATTERNS.dataAttributes.some(attr => {
    const attrValue = element.getAttribute(attr);
    return attrValue && (/\b(upload|file|attach|browse|drop|drag)\b/i.test(attrValue) || element.hasAttribute(attr));
  });

  if (hasFileUploadAttrs || element.hasAttribute("accept")) {
    return true;
  }

  // Check ARIA patterns
  const role = element.getAttribute("role");
  const ariaLabel = element.getAttribute("aria-label") || "";
  const textContent = element.textContent || "";

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
 * Find associated hidden file input for custom upload components
 */
const findAssociatedFileInput = (element: HTMLElement): HTMLInputElement | null => {
  // Strategy 1: Look for hidden file input as child
  let fileInput = element.querySelector('input[type="file"]') as HTMLInputElement;
  if (fileInput) return fileInput;

  // Strategy 2: Look for hidden file input as sibling
  const parent = element.parentElement;
  if (parent) {
    fileInput = parent.querySelector('input[type="file"]') as HTMLInputElement;
    if (fileInput) return fileInput;
  }

  // Strategy 3: Look for file input by ID reference
  const forAttr = element.getAttribute("for");
  if (forAttr) {
    fileInput = document.getElementById(forAttr) as HTMLInputElement;
    if (fileInput && fileInput.type === "file") return fileInput;
  }

  // Strategy 4: Look for file input by aria-controls
  const ariaControls = element.getAttribute("aria-controls");
  if (ariaControls) {
    fileInput = document.getElementById(ariaControls) as HTMLInputElement;
    if (fileInput && fileInput.type === "file") return fileInput;
  }

  // Strategy 5: Look for hidden file inputs using common selectors
  for (const selector of FILE_UPLOAD_PATTERNS.hiddenFileInputs) {
    fileInput = document.querySelector(selector) as HTMLInputElement;
    if (fileInput) {
      // Check if this input is related to our element
      const inputParent = fileInput.closest('[class*="upload"], [class*="file"], [class*="drop"]');
      if (inputParent && (inputParent.contains(element) || element.contains(inputParent))) {
        return fileInput;
      }
    }
  }

  return null;
};

/**
 * Detect enhanced drag-and-drop zones with modern patterns
 */
function detectEnhancedDragDropZone(element: HTMLElement): boolean {
  // Check for modern drag-and-drop patterns
  const dragDropPatterns = [
    /\b(drop-zone|dropzone|drop-area|drag-area)\b/i,
    /\b(file-drop|file-drag|upload-drop)\b/i,
    /\b(droppable|draggable|sortable)\b/i,
  ];

  const className = element.className || "";
  const hasDropClass = dragDropPatterns.some(pattern => pattern.test(className));

  // Check for HTML5 drag-and-drop attributes
  const hasDropAttributes =
    element.hasAttribute("droppable") ||
    element.hasAttribute("ondrop") ||
    element.hasAttribute("ondragover") ||
    element.hasAttribute("ondragenter");

  // Check for ARIA indicators
  const ariaLabel = element.getAttribute("aria-label") || "";
  const hasDropAria = /\b(drop|drag|upload)\b/i.test(ariaLabel);

  // Check for text content indicating drop zone
  const textContent = element.textContent || "";
  const hasDropText = /\b(drop\s+file|drag\s+file|drop\s+here)\b/i.test(textContent);

  return hasDropClass || hasDropAttributes || hasDropAria || hasDropText;
}

/**
 * Cloud storage integration detection
 */
interface CloudStorageIntegration {
  provider: "dropbox" | "google-drive" | "onedrive" | "box" | "aws-s3" | "unknown";
  button?: HTMLElement;
  container?: HTMLElement;
  apiEndpoint?: string;
}

/**
 * Detect cloud storage integration patterns
 */
function detectCloudStorageIntegration(element: HTMLElement): CloudStorageIntegration | null {
  const className = element.className.toLowerCase();
  const textContent = element.textContent?.toLowerCase() || "";
  const ariaLabel = element.getAttribute("aria-label")?.toLowerCase() || "";
  const combinedText = `${className} ${textContent} ${ariaLabel}`;

  // Dropbox integration
  if (/\b(dropbox|dbx)\b/i.test(combinedText)) {
    return {
      provider: "dropbox",
      button: element.querySelector('[class*="dropbox"], [data-service="dropbox"]') as HTMLElement,
      container: element.closest('[class*="dropbox"]') as HTMLElement,
    };
  }

  // Google Drive integration
  if (/\b(google[\s-]?drive|gdrive|gcloud)\b/i.test(combinedText)) {
    return {
      provider: "google-drive",
      button: element.querySelector('[class*="google"], [data-service="google"]') as HTMLElement,
      container: element.closest('[class*="google"]') as HTMLElement,
    };
  }

  // OneDrive integration
  if (/\b(onedrive|microsoft[\s-]?drive)\b/i.test(combinedText)) {
    return {
      provider: "onedrive",
      button: element.querySelector('[class*="onedrive"], [data-service="onedrive"]') as HTMLElement,
      container: element.closest('[class*="onedrive"]') as HTMLElement,
    };
  }

  // Box integration
  if (/\bbox\b/i.test(combinedText) && /\b(cloud|storage|file)\b/i.test(combinedText)) {
    return {
      provider: "box",
      button: element.querySelector('[class*="box"], [data-service="box"]') as HTMLElement,
      container: element.closest('[class*="box"]') as HTMLElement,
    };
  }

  return null;
}

/**
 * Handle cloud storage upload interactions
 */
async function handleCloudStorageUpload(
  element: HTMLElement,
  files: File[],
  integration: CloudStorageIntegration,
): Promise<void> {
  try {
    console.log(`Handling ${integration.provider} upload with ${files.length} files`);

    // Find the appropriate button to click
    const targetButton =
      integration.button || (element.querySelector('button, [role="button"]') as HTMLElement) || element;

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
}

/**
 * Simulate file selection in cloud storage interfaces
 */
async function simulateCloudStorageSelection(provider: string, files: File[]): Promise<void> {
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
        const firstElement = elements[0] as HTMLElement;
        if (firstElement) {
          firstElement.click();
          await new Promise(resolve => setTimeout(resolve, 200));
        }
        break;
      }
    }

    // Dispatch custom events that cloud storage APIs might listen for
    const customEvents = ["cloud-file-selected", "files-chosen", `${provider}-file-selected`, "picker-file-selected"];

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
}

/**
 * Detect file input fields from a set of elements
 */
export const detectFileFields = async (
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
    if (element instanceof HTMLInputElement && element.type === "file") {
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
      (!isCustomUpload && fileInput.getAttribute("aria-hidden") === "true") ||
      (!isCustomUpload &&
        window.getComputedStyle(fileInput).display === "none" &&
        window.getComputedStyle(fileInput).visibility === "hidden")
    ) {
      continue;
    }

    // Create field based on the actual file input or custom component
    const targetElement = isCustomUpload ? element : fileInput;
    const field = (await createBaseField(targetElement, baseIndex + i, "file", testMode)) as FileField;

    // Add file-specific metadata from the actual file input
    const acceptTypes = parseAcceptTypes(fileInput.accept || "");
    field.acceptTypes = fileInput.accept || undefined;
    field.multiple = fileInput.multiple;
    field.required = fileInput.required;
    field.name = fileInput.name || targetElement.getAttribute("name") || "";

    // Store references to both elements for later use
    // We'll store file upload specific data in a way that doesn't conflict with the base metadata structure
    if (!field.metadata) {
      field.metadata = {
        framework: "vanilla",
        visibility: { isVisible: true },
      };
    }

    // Store file upload specific metadata in a custom property (accessible but not part of the base interface)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (field.metadata as any).fileUploadData = {
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
          field.testValue = ["test-document.pdf", "test-image.jpg", "test-spreadsheet.xlsx"];
        } else {
          field.testValue = "test-document.pdf";
        }
      }
    }

    fields.push(field);
  }

  return fields;
};
