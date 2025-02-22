import type { Worker, WorkerParams } from 'tesseract.js';

// Global singleton worker for better resource management
let globalWorker: Worker | null = null;
const ocrCache = new Map<string, string>();

// Add global CSP state
let isCSPRestricted: boolean | null = null;

// Optimized image preprocessing settings
const OPTIMAL_WIDTH = 400; // Narrower width for faster processing
const CONTRAST_THRESHOLD = 128;
const QUALITY = 0.6; // Reduced quality for faster processing

interface PreprocessedImage {
  dataUrl: string;
  bounds: DOMRect;
}

// Enhanced CSP detection with detailed checks
export const checkCSPRestrictions = async (): Promise<boolean> => {
  // Return cached result if available
  if (isCSPRestricted !== null) {
    return isCSPRestricted;
  }

  try {
    // Check meta tag CSP
    const metaCSP = document.querySelector('meta[http-equiv="Content-Security-Policy"]');
    if (metaCSP) {
      const cspContent = metaCSP.getAttribute('content') || '';
      if (
        cspContent.includes("'strict-dynamic'") ||
        cspContent.includes("script-src 'self'") ||
        cspContent.includes("connect-src 'self'") ||
        !cspContent.includes("'unsafe-eval'")
      ) {
        console.warn('CSP restrictions detected in meta tag:', cspContent);
        isCSPRestricted = true;
        return true;
      }
    }

    // Check for WebAssembly support and restrictions
    try {
      const wasmTest = new WebAssembly.Module(new Uint8Array([0x0, 0x61, 0x73, 0x6d, 0x01, 0x00, 0x00, 0x00]));
      if (!wasmTest) {
        throw new Error('WebAssembly module creation failed');
      }
    } catch (e) {
      console.warn('WebAssembly blocked by CSP:', e);
      isCSPRestricted = true;
      return true;
    }

    // Test data URL support
    try {
      const dataUrlTest = await fetch('data:text/plain;base64,SGVsbG8=');
      if (!dataUrlTest.ok) {
        throw new Error('Data URL fetch failed');
      }
    } catch (e) {
      console.warn('Data URL loading blocked by CSP:', e);
      isCSPRestricted = true;
      return true;
    }

    // Additional security policy checks
    const policies = await (async () => {
      try {
        const report = await new Promise(resolve => {
          document.addEventListener(
            'securitypolicyviolation',
            e => {
              resolve(e);
            },
            { once: true },
          );

          // Trigger a test violation
          const script = document.createElement('script');
          script.innerHTML = 'console.log("CSP test")';
          document.head.appendChild(script);
          document.head.removeChild(script);
        });

        if (report) {
          console.warn('CSP violation detected:', report);
          return true;
        }
      } catch (e) {
        // Ignore errors in the test
      }
      return false;
    })();

    if (policies) {
      isCSPRestricted = true;
      return true;
    }

    // All checks passed
    isCSPRestricted = false;
    return false;
  } catch (error) {
    console.warn('Error checking CSP, assuming restricted:', error);
    isCSPRestricted = true;
    return true;
  }
};

// Initialize single worker with optimized settings
const initializeWorker = async (): Promise<Worker | null> => {
  // Check CSP restrictions before initializing
  const restricted = await checkCSPRestrictions();
  if (restricted) {
    console.warn('Cannot initialize OCR worker due to CSP restrictions');
    return null;
  }

  if (globalWorker) return globalWorker;

  try {
    const { createWorker } = await import('tesseract.js');
    globalWorker = await createWorker();

    // Configure worker with optimized settings
    const worker = globalWorker as Worker & {
      loadLanguage: (lang: string) => Promise<void>;
      initialize: (lang: string) => Promise<void>;
    };
    await worker.loadLanguage('eng');
    await worker.initialize('eng');
    await worker.setParameters({
      tessedit_char_whitelist: 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789 :-_/\\.,',
      tessedit_pageseg_mode: '1' as WorkerParams['tessedit_pageseg_mode'],
      pdf_enabled: false,
      hocr_enabled: false,
    });

    return globalWorker;
  } catch (error) {
    console.error('Failed to initialize OCR worker:', error);
    isCSPRestricted = true; // Mark as restricted on failure
    return null;
  }
};

// Optimized image capture and preprocessing
const captureAndPreprocess = async (element: HTMLElement): Promise<PreprocessedImage> => {
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d', { alpha: false })!;

  // Get element bounds
  const bounds = element.getBoundingClientRect();

  // Calculate optimal scale
  const scale = Math.min(OPTIMAL_WIDTH / bounds.width, 1);
  const finalWidth = Math.round(bounds.width * scale);
  const finalHeight = Math.round(bounds.height * scale);

  // Set canvas size
  canvas.width = finalWidth;
  canvas.height = finalHeight;

  // Draw with background for better contrast
  ctx.fillStyle = '#FFFFFF';
  ctx.fillRect(0, 0, finalWidth, finalHeight);

  // Use html2canvas for element capture
  const { default: html2canvas } = await import('html2canvas');
  const elementCanvas = await html2canvas(element, {
    backgroundColor: '#FFFFFF',
    logging: false,
    removeContainer: true,
    scale: 1,
  });

  // Scale down
  ctx.drawImage(elementCanvas, 0, 0, finalWidth, finalHeight);

  // Apply contrast enhancement
  const imageData = ctx.getImageData(0, 0, finalWidth, finalHeight);
  const data = imageData.data;

  // Optimize with Uint8ClampedArray for better performance
  const pixels = new Uint8ClampedArray(data.length);

  // Process in chunks for better performance
  const chunkSize = 16384;
  for (let i = 0; i < data.length; i += chunkSize) {
    const end = Math.min(i + chunkSize, data.length);
    for (let j = i; j < end; j += 4) {
      // Fast grayscale conversion
      const gray = (data[j] * 0.299 + data[j + 1] * 0.587 + data[j + 2] * 0.114) | 0;
      // Threshold to pure black/white
      const value = gray > CONTRAST_THRESHOLD ? 255 : 0;
      pixels[j] = pixels[j + 1] = pixels[j + 2] = value;
      pixels[j + 3] = 255;
    }
  }

  imageData.data.set(pixels);
  ctx.putImageData(imageData, 0, 0);

  return {
    dataUrl: canvas.toDataURL('image/jpeg', QUALITY),
    bounds,
  };
};

// Helper to find the optimal parent container for OCR
export const findOptimalLabelContainer = (
  element: HTMLElement,
): {
  container: HTMLElement;
  reason: string;
} => {
  // Quick check for explicit label
  const id = element.id;
  if (id) {
    const label = document.querySelector(`label[for="${id}"]`);
    if (label) return { container: label as HTMLElement, reason: 'explicit-label' };
  }

  // Check for wrapping label
  const labelParent = element.closest('label');
  if (labelParent) return { container: labelParent, reason: 'wrapping-label' };

  // Find closest text-containing element
  let bestElement = element;
  let current = element;
  let maxTextLength = 0;

  for (let i = 0; i < 3 && current.parentElement; i++) {
    current = current.parentElement;
    const textLength = (current.textContent || '').trim().length;
    if (textLength > maxTextLength && textLength < 100) {
      maxTextLength = textLength;
      bestElement = current;
    }
  }

  return {
    container: bestElement,
    reason: bestElement === element ? 'self' : 'text-density',
  };
};

// Update batch processing to handle CSP restrictions
export const getFieldLabelsFromOCR = async (
  elements: Array<{ element: HTMLElement; fieldId: string }>,
): Promise<Map<string, string>> => {
  const results = new Map<string, string>();

  // Early return if CSP restricted
  if (await checkCSPRestrictions()) {
    console.warn('OCR processing blocked by CSP restrictions');
    return results;
  }

  const worker = await initializeWorker();
  if (!worker) {
    console.warn('Could not initialize OCR worker');
    return results;
  }

  // Process in smaller batches for better memory management
  const BATCH_SIZE = 4;
  for (let i = 0; i < elements.length; i += BATCH_SIZE) {
    const batch = elements.slice(i, i + BATCH_SIZE);
    const batchPromises = batch.map(async ({ element, fieldId }) => {
      try {
        const cacheKey = element.getAttribute('data-filliny-id') || fieldId;
        if (ocrCache.has(cacheKey)) {
          results.set(fieldId, ocrCache.get(cacheKey)!);
          return;
        }

        const container = findOptimalLabelContainer(element);
        const { dataUrl } = await captureAndPreprocess(container.container);

        const {
          data: { text },
        } = await worker.recognize(dataUrl);
        const label = text
          .split('\n')
          .map(line => line.trim())
          .filter(line => line.length > 0)
          .join(' ')
          .trim();

        if (label) {
          results.set(fieldId, label);
          ocrCache.set(cacheKey, label);
        }
      } catch (error) {
        console.warn('OCR processing failed:', error);
      }
    });

    await Promise.all(batchPromises);
  }

  return results;
};

// Single field processing
export const getFieldLabelFromOCR = async (element: HTMLElement, fieldId: string): Promise<string> => {
  const results = await getFieldLabelsFromOCR([{ element, fieldId }]);
  return results.get(fieldId) || '';
};

// Cleanup
export const cleanupOCR = async () => {
  if (globalWorker) {
    await globalWorker.terminate();
    globalWorker = null;
  }
};
