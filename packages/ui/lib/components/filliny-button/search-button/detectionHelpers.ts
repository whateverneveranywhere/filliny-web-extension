import type { Field, FieldType } from '@extension/shared';
import { PSM } from 'tesseract.js';
import { getConfig } from '@extension/shared';

interface ReactElementProps {
  onSubmit?: () => void;
  onChange?: () => void;
  onClick?: () => void;
  [key: string]: (() => void) | undefined;
}

interface VueElement extends HTMLElement {
  __vue__?: unknown;
}

// Add new helper for computing element visibility with more robust checks
const computeElementVisibility = (
  element: HTMLElement,
): {
  isVisible: boolean;
  hiddenReason?: string;
} => {
  // Check if element or any parent is hidden via CSS
  const isHidden = (el: HTMLElement | null): boolean => {
    while (el) {
      const style = getComputedStyle(el);
      const isFormControl = ['select', 'input', 'textarea'].includes(el.tagName.toLowerCase());

      // More comprehensive visibility checks
      if (
        style.display === 'none' ||
        style.visibility === 'hidden' ||
        (!isFormControl && style.opacity === '0') ||
        el.hasAttribute('hidden') ||
        (style.position === 'absolute' && (parseInt(style.left) < -9999 || parseInt(style.top) < -9999))
      ) {
        return true;
      }
      el = el.parentElement;
    }
    return false;
  };

  // Check dimensions and viewport position
  const rect = element.getBoundingClientRect();
  const hasZeroDimensions = !element.offsetWidth && !element.offsetHeight;
  const isOutsideViewport =
    rect.right <= 0 || rect.bottom <= 0 || rect.left >= window.innerWidth || rect.top >= window.innerHeight;

  // Special handling for form controls that might be styled differently
  const isFormControl = ['select', 'input', 'textarea'].includes(element.tagName.toLowerCase());

  if (isFormControl) {
    if (isHidden(element)) {
      return { isVisible: false, hiddenReason: 'hidden-by-css' };
    }
    return { isVisible: true };
  }

  if (hasZeroDimensions) {
    return { isVisible: false, hiddenReason: 'zero-dimensions' };
  }

  if (isOutsideViewport) {
    return { isVisible: false, hiddenReason: 'outside-viewport' };
  }

  if (isHidden(element)) {
    return { isVisible: false, hiddenReason: 'hidden-by-css' };
  }

  return { isVisible: true };
};

// Update isElementVisible to use the new compute function
const isElementVisible = (element: HTMLElement): boolean => {
  const { isVisible } = computeElementVisibility(element);
  return isVisible;
};

const getAllFrameDocuments = (): Document[] => {
  const docs: Document[] = [document];
  const processedFrames = new Set<string>();

  const tryGetIframeDoc = (iframe: HTMLIFrameElement): Document | null => {
    try {
      // Try different ways to access iframe content
      if (iframe.contentDocument?.readyState === 'complete') {
        return iframe.contentDocument;
      }
      if (iframe.contentWindow?.document?.readyState === 'complete') {
        return iframe.contentWindow.document;
      }
      // If not complete but accessible, queue for retry
      if (iframe.contentDocument || iframe.contentWindow?.document) {
        setTimeout(() => {
          const doc = tryGetIframeDoc(iframe);
          if (doc && !processedFrames.has(iframe.src)) {
            processedFrames.add(iframe.src);
            docs.push(doc);
            detectFormLikeContainers(); // Re-run detection
          }
        }, 500);
      }
    } catch (e) {
      console.debug('Frame access restricted:', {
        src: iframe.src,
        error: (e as Error).message,
      });
    }
    return null;
  };

  // Process all iframes recursively
  const processIframes = (doc: Document) => {
    Array.from(doc.getElementsByTagName('iframe')).forEach(iframe => {
      if (!processedFrames.has(iframe.src)) {
        const iframeDoc = tryGetIframeDoc(iframe);
        if (iframeDoc) {
          processedFrames.add(iframe.src);
          docs.push(iframeDoc);
          // Recursively process nested iframes
          processIframes(iframeDoc);
        }
      }
    });
  };

  try {
    processIframes(document);
  } catch (e) {
    console.warn('Error processing frames:', e);
  }

  return docs;
};

// Update the initialization to be more robust
export const initializeIframeDetection = (): void => {
  let detectingForms = false;

  const safeDetectForms = () => {
    if (detectingForms) return;
    detectingForms = true;
    setTimeout(() => {
      detectFormLikeContainers();
      detectingForms = false;
    }, 0);
  };

  // Watch for any DOM changes that might indicate new forms
  const observer = new MutationObserver(mutations => {
    const hasRelevantChanges = mutations.some(mutation =>
      Array.from(mutation.addedNodes).some(node => {
        if (node instanceof HTMLElement) {
          return node.tagName === 'IFRAME' || node.tagName === 'FORM' || node.querySelector('form, iframe');
        }
        return false;
      }),
    );

    if (hasRelevantChanges) {
      safeDetectForms();
    }
  });

  observer.observe(document.body, {
    childList: true,
    subtree: true,
  });

  // Initial detection
  safeDetectForms();

  // Handle dynamic iframe loads
  window.addEventListener('load', safeDetectForms, { once: true });
  window.addEventListener('DOMContentLoaded', safeDetectForms, { once: true });
};

// Update querySelector to work across frames
const querySelectorAllFrames = (selector: string): Element[] => {
  const results: Element[] = [];
  const documents = getAllFrameDocuments();

  for (const doc of documents) {
    try {
      results.push(...Array.from(doc.querySelectorAll(selector)));
    } catch (e) {
      console.warn('Error querying in frame:', e);
    }
  }

  return results;
};

// Capture element using html2canvas with optimized settings
const captureElement = async (element: HTMLElement): Promise<string> => {
  try {
    const { default: html2canvas } = await import('html2canvas');

    // Get element dimensions
    const rect = element.getBoundingClientRect();

    // Calculate optimal scale based on element size
    // We want to keep resolution reasonable for OCR while not being too high
    // Target width around 800px for optimal OCR performance
    const targetWidth = 800;
    const scale = Math.min(targetWidth / rect.width, 1.5); // Cap at 1.5x

    // Capture the element with optimized settings
    const canvas = await html2canvas(element, {
      logging: false,
      useCORS: true,
      scale: scale * (window.devicePixelRatio || 1),
      allowTaint: true,
      backgroundColor: null,
      removeContainer: true,
      width: rect.width,
      height: rect.height,
      // Optimize rendering
      imageTimeout: 2000, // 2 second timeout for images
      ignoreElements: el => {
        // Ignore elements that won't contribute to label text
        const tagName = el.tagName.toLowerCase();
        return (
          tagName === 'script' ||
          tagName === 'style' ||
          tagName === 'iframe' ||
          (tagName === 'img' && !el.getAttribute('alt'))
        );
      },
      onclone: (clonedDoc, node) => {
        // Hide interactive elements in the clone for cleaner capture
        const interactives = node.querySelectorAll('input, select, textarea, button');
        interactives.forEach((el: Element) => {
          if (el !== element) {
            (el as HTMLElement).style.visibility = 'hidden';
          }
        });
      },
    });

    // Convert to black and white with optimized contrast for better OCR
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      throw new Error('Could not get canvas context');
    }

    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const data = imageData.data;

    // Optimize contrast and convert to black and white
    const threshold = 128;
    for (let i = 0; i < data.length; i += 4) {
      // Enhanced contrast calculation
      const avg = data[i] * 0.299 + data[i + 1] * 0.587 + data[i + 2] * 0.114;
      const value = avg > threshold ? 255 : 0;
      data[i] = data[i + 1] = data[i + 2] = value;
    }
    ctx.putImageData(imageData, 0, 0);

    // Further reduce size if the canvas is still large
    if (canvas.width > targetWidth) {
      const scaleFactor = targetWidth / canvas.width;
      const scaledCanvas = document.createElement('canvas');
      scaledCanvas.width = canvas.width * scaleFactor;
      scaledCanvas.height = canvas.height * scaleFactor;
      const scaledCtx = scaledCanvas.getContext('2d');
      if (scaledCtx) {
        // Use better quality scaling
        scaledCtx.imageSmoothingEnabled = true;
        scaledCtx.imageSmoothingQuality = 'high';
        scaledCtx.drawImage(canvas, 0, 0, scaledCanvas.width, scaledCanvas.height);
        return scaledCanvas.toDataURL('image/png', 0.8); // Slightly reduced quality for better performance
      }
    }

    return canvas.toDataURL('image/png', 0.8);
  } catch (error) {
    console.error('Failed to capture element:', error);
    throw error;
  }
};

// Add OCR result cache
const ocrCache = new Map<string, string>();

// Helper to find the optimal parent container for OCR
const findOptimalLabelContainer = (
  element: HTMLElement,
): {
  container: HTMLElement;
  reason: string;
} => {
  // Find all form fields in the document
  const findFormFields = (root: Document): HTMLElement[] => {
    return Array.from(
      root.querySelectorAll<HTMLElement>(
        'input:not([type="hidden"]), select, textarea, [role="textbox"], [role="combobox"], [contenteditable="true"]',
      ),
    ).filter(field => isElementVisible(field) && !shouldSkipElement(field));
  };

  // Get all fields and find current field's position
  const allFields = findFormFields(element.ownerDocument);
  const currentIndex = allFields.indexOf(element);

  // Find prev/next fields if they exist
  const prevField = currentIndex > 0 ? allFields[currentIndex - 1] : null;
  const nextField = currentIndex < allFields.length - 1 ? allFields[currentIndex + 1] : null;

  // Find the closest field (prev or next) based on DOM distance
  const getClosestField = (): HTMLElement | null => {
    if (!prevField && !nextField) return null;
    if (!prevField) return nextField;
    if (!nextField) return prevField;

    // Compare DOM distances
    let current = element;
    let prevSteps = 0;
    let nextSteps = 0;

    // Count steps to prev field
    while (current && !current.contains(prevField)) {
      current = current.parentElement!;
      prevSteps++;
    }

    // Count steps to next field
    current = element;
    while (current && !current.contains(nextField)) {
      current = current.parentElement!;
      nextSteps++;
    }

    return prevSteps <= nextSteps ? prevField : nextField;
  };

  // Find common ancestor with the closest field
  const closestField = getClosestField();
  if (!closestField) {
    // If no other fields found, use minimal container
    let container = element;
    while (container.parentElement) {
      const parent = container.parentElement;
      const hasOtherInteractives = Array.from(parent.querySelectorAll('input, select, textarea, button')).some(
        el => el !== element && isElementVisible(el as HTMLElement),
      );

      if (hasOtherInteractives) break;

      const rect = parent.getBoundingClientRect();
      if (rect.width > 800 || rect.height > 300) break;

      container = parent;
    }
    return { container, reason: 'isolated' };
  }

  // Find the path from element to common ancestor
  const getPathToAncestor = (el: HTMLElement, ancestor: HTMLElement): HTMLElement[] => {
    const path: HTMLElement[] = [];
    let current = el;
    while (current && current !== ancestor) {
      path.push(current);
      current = current.parentElement!;
    }
    path.push(ancestor);
    return path;
  };

  // Find common ancestor
  let commonAncestor = element;
  while (commonAncestor && !commonAncestor.contains(closestField)) {
    commonAncestor = commonAncestor.parentElement!;
  }

  if (!commonAncestor || commonAncestor.tagName.toLowerCase() === 'body') {
    return { container: element, reason: 'fallback' };
  }

  // Get the path from element to common ancestor
  const pathToAncestor = getPathToAncestor(element, commonAncestor);

  // Find the optimal container by checking each ancestor's content
  let bestContainer = element;
  let bestTextDensity = 0;

  for (const container of pathToAncestor) {
    // Skip if container includes other form fields
    const hasOtherFields = Array.from(container.querySelectorAll('input, select, textarea, button')).some(
      el => el !== element && el !== closestField && isElementVisible(el as HTMLElement),
    );

    if (hasOtherFields) break;

    // Check container dimensions
    const rect = container.getBoundingClientRect();
    if (rect.width > 800 || rect.height > 300) break;

    // Calculate text density (text length / area)
    const text = container.textContent || '';
    const area = rect.width * rect.height;
    const density = area > 0 ? text.length / area : 0;

    if (density > bestTextDensity) {
      bestContainer = container;
      bestTextDensity = density;
    }
  }

  return {
    container: bestContainer,
    reason: bestContainer === element ? 'self' : 'structure',
  };
};

// Add OCR worker pool management
interface OCRWorkerPool {
  workers: Array<{
    worker: Tesseract.Worker;
    busy: boolean;
    lastUsed: number;
  }>;
  maxWorkers: number;
  totalProcessed: number;
  lastCleanup: number;
}

let workerPool: OCRWorkerPool | null = null;

const initWorkerPool = async (): Promise<OCRWorkerPool> => {
  if (workerPool) return workerPool;

  // Calculate optimal number of workers based on hardware and memory
  const maxWorkers = Math.min(
    navigator.hardwareConcurrency ? Math.max(Math.floor(navigator.hardwareConcurrency * 0.75), 2) : 2,
    6, // Hard cap at 6 workers to prevent excessive resource usage
  );

  const { createWorker } = await import('tesseract.js');

  // Create workers in parallel
  const workers = await Promise.all(
    Array(maxWorkers)
      .fill(0)
      .map(async () => ({
        worker: await createWorker('eng', 1, {
          logger: () => {}, // Disable logging for performance
          errorHandler: (err: Error) => console.warn('OCR worker error:', err),
        }),
        busy: false,
        lastUsed: Date.now(),
      })),
  );

  // Configure all workers with optimized settings
  await Promise.all(
    workers.map(async ({ worker }) => {
      await worker.setParameters({
        tessedit_pageseg_mode: PSM.SINGLE_BLOCK, // Optimize for single text block
        tessedit_ocr_engine_mode: 3, // Use default engine mode
        tessjs_create_hocr: '0',
        tessjs_create_tsv: '0',
        tessjs_create_box: '0',
        tessjs_create_unlv: '0',
        tessjs_create_osd: '0',
        tessedit_do_invert: '0',
        tessedit_enable_doc_dict: '0',
        tessedit_unrej_any_wd: '0',
        tessedit_minimal_rejection: '1',
        tessedit_write_images: '0',
      });
    }),
  );

  workerPool = {
    workers,
    maxWorkers,
    totalProcessed: 0,
    lastCleanup: Date.now(),
  };

  // Set up periodic cleanup of idle workers
  setInterval(() => cleanupIdleWorkers(), 60000); // Check every minute

  return workerPool;
};

// Add worker cleanup to prevent memory leaks
const cleanupIdleWorkers = async () => {
  if (!workerPool || Date.now() - workerPool.lastCleanup < 60000) return;

  const idleTimeout = 300000; // 5 minutes
  const now = Date.now();

  // Keep at least 2 workers
  const idleWorkers = workerPool.workers.filter(w => !w.busy && now - w.lastUsed > idleTimeout).slice(2);

  if (idleWorkers.length > 0) {
    await Promise.all(
      idleWorkers.map(async w => {
        const idx = workerPool!.workers.indexOf(w);
        if (idx !== -1) {
          await w.worker.terminate();
          workerPool!.workers.splice(idx, 1);
        }
      }),
    );

    workerPool.lastCleanup = now;
  }
};

const getAvailableWorker = async (): Promise<{ worker: Tesseract.Worker; release: () => void }> => {
  const pool = await initWorkerPool();

  // Find available worker or wait for one
  const waitForWorker = async (): Promise<(typeof pool.workers)[0]> => {
    const available = pool.workers.find(w => !w.busy);
    if (available) return available;
    await new Promise(resolve => setTimeout(resolve, 100));
    return waitForWorker();
  };

  const workerInfo = await waitForWorker();
  workerInfo.busy = true;

  return {
    worker: workerInfo.worker,
    release: () => {
      workerInfo.busy = false;
    },
  };
};

// Enhanced debug image saving with metadata
const saveDebugImage = async (
  dataUrl: string,
  fieldId: string,
  metadata: {
    reason: string;
    ocrText: string;
    elementInfo: {
      tagName: string;
      classes: string;
      type?: string;
      id?: string;
    };
  },
): Promise<void> => {
  const config = getConfig();
  if (!config.debug.saveScreenshots) {
    return;
  }

  try {
    // Create debug info overlay
    const debugCanvas = document.createElement('canvas');
    const debugCtx = debugCanvas.getContext('2d');
    if (!debugCtx) return;

    // Load the original image
    const img = new Image();
    await new Promise((resolve, reject) => {
      img.onload = resolve;
      img.onerror = reject;
      img.src = dataUrl;
    });

    // Set canvas size
    debugCanvas.width = img.width;
    debugCanvas.height = img.height + 60; // Extra space for debug info

    // Draw original image
    debugCtx.drawImage(img, 0, 0);

    // Add debug information overlay
    debugCtx.fillStyle = 'rgba(0, 0, 0, 0.8)';
    debugCtx.fillRect(0, img.height, debugCanvas.width, 60);
    debugCtx.fillStyle = 'white';
    debugCtx.font = '12px monospace';

    const debugInfo = [
      `Field: ${fieldId} | Type: ${metadata.elementInfo.type || metadata.elementInfo.tagName} | Reason: ${metadata.reason}`,
      `OCR Text: "${metadata.ocrText}"`,
      `Element: ${metadata.elementInfo.tagName}${metadata.elementInfo.id ? '#' + metadata.elementInfo.id : ''}.${metadata.elementInfo.classes}`,
    ];

    debugInfo.forEach((text, i) => {
      debugCtx.fillText(text, 5, img.height + 15 + i * 15);
    });

    // Save with debug info
    const debugDataUrl = debugCanvas.toDataURL('image/png');
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');

    // Create a downloadable link
    const link = document.createElement('a');
    link.href = debugDataUrl;
    link.download = `filliny-debug-${fieldId}-${timestamp}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    console.log('Debug image saved:', {
      fieldId,
      metadata,
      timestamp,
    });
  } catch (e) {
    console.warn('Failed to save debug image:', e);
  }
};

// Update processBatchOCR to use less restrictive text filtering
const processBatchOCR = async (elements: HTMLElement[]): Promise<Map<string, string>> => {
  const results = new Map<string, string>();
  const config = getConfig();
  const startTime = Date.now();

  if (config.debug.enableOCRLogs) {
    console.time('batchOCRTotal');
  }

  try {
    // Initialize worker pool
    const pool = await initWorkerPool();

    // Create batches based on available workers
    const batchSize = Math.ceil(elements.length / pool.maxWorkers);
    const batches: HTMLElement[][] = [];

    for (let i = 0; i < elements.length; i += batchSize) {
      batches.push(elements.slice(i, i + batchSize));
    }

    // Process batches in parallel
    await Promise.all(
      batches.map(async batch => {
        const { worker, release } = await getAvailableWorker();

        try {
          // Process elements in batch sequentially but batches in parallel
          for (const element of batch) {
            const cacheKey = element.getAttribute('data-filliny-id');
            if (!cacheKey) continue;

            try {
              const { container, reason } = findOptimalLabelContainer(element);
              const dataUrl = await captureElement(container);

              const result = await worker.recognize(dataUrl);

              // Process OCR result
              const detectedText = result.data.text
                .split('\n')
                .map(line => line.trim())
                .filter(line => line.length > 0 && !line.includes('{{') && !line.includes('}}'))
                .join(' ')
                .trim()
                .replace(/\s+/g, ' ');

              if (detectedText) {
                results.set(cacheKey, detectedText);
                ocrCache.set(cacheKey, detectedText);
              }

              // Save debug image if enabled
              if (config.debug.saveScreenshots) {
                await saveDebugImage(dataUrl, cacheKey, {
                  reason,
                  ocrText: detectedText,
                  elementInfo: {
                    tagName: element.tagName,
                    classes: element.className,
                    type: element instanceof HTMLInputElement ? element.type : undefined,
                    id: element.id,
                  },
                });
              }
            } catch (e) {
              console.warn('OCR processing failed for element:', cacheKey, e);
            }
          }
        } finally {
          release();
        }
      }),
    );
  } catch (e) {
    console.error('Batch OCR processing failed:', e);
  }

  if (config.debug.enableOCRLogs) {
    console.timeEnd('batchOCRTotal');
    console.log('OCR Performance:', {
      totalTime: Date.now() - startTime,
      elementsProcessed: elements.length,
      successfulDetections: results.size,
      timePerElement: (Date.now() - startTime) / elements.length,
    });
  }

  return results;
};

// Update getFieldLabelFromScreenshot to properly wait for batch results
const getFieldLabelFromScreenshot = async (element: HTMLElement, fieldId: string): Promise<string> => {
  try {
    // Check cache first
    const cacheKey = element.getAttribute('data-filliny-id') || fieldId;
    if (ocrCache.has(cacheKey)) {
      // console.log('Using cached OCR result for:', { fieldId, label: ocrCache.get(cacheKey) });
      return ocrCache.get(cacheKey)!;
    }

    // Process immediately if no batch in progress
    if (batchQueue.size === 0) {
      // console.log('Processing single element immediately:', fieldId);
      const results = await processBatchOCR([element]);
      const label = results.get(cacheKey);
      // console.log('Single element OCR result:', { fieldId, label });
      return label || '';
    }

    // Add to batch queue
    // console.log('Adding to batch queue:', fieldId);
    batchQueue.set(cacheKey, element);

    // If batch is full or timeout reached, process the batch
    if (batchQueue.size >= BATCH_SIZE || Date.now() - lastBatchTime > BATCH_TIMEOUT) {
      // console.log('Processing batch due to:', batchQueue.size >= BATCH_SIZE ? 'size limit' : 'timeout');
      const batchElements = Array.from(batchQueue.values());
      batchQueue.clear();
      lastBatchTime = Date.now();

      const results = await processBatchOCR(batchElements);
      const label = results.get(cacheKey);
      // console.log('Batch OCR result:', { fieldId, label });
      return label || '';
    }

    // If we're still collecting batch items, process this element immediately
    // instead of waiting for the batch to fill
    // console.log('Processing element while batch collects:', fieldId);
    const results = await processBatchOCR([element]);
    const label = results.get(cacheKey);
    // console.log('Individual OCR result:', { fieldId, label });
    return label || '';
  } catch (e) {
    console.error('OCR failed:', e);
    return '';
  }
};

// Add batch processing constants and state
const BATCH_SIZE = 10;
const BATCH_TIMEOUT = 200; // ms
const batchQueue = new Map<string, HTMLElement>();
let lastBatchTime = Date.now();

// Update getFieldLabel to use OCR first, then fallback strategies
const getFieldLabel = async (element: HTMLElement, fieldId: string): Promise<string> => {
  // Try OCR-based label detection first
  const ocrLabel = await getFieldLabelFromScreenshot(element, fieldId);
  if (ocrLabel) {
    // console.log('Using OCR-detected label:', { fieldId, label: ocrLabel });
    return ocrLabel;
  }

  // console.log('OCR failed, trying fallback strategies:', { fieldId });

  // Fallback strategies if OCR fails
  const strategies = [
    // 1. Accessibility-first approach
    async () => {
      // Check ARIA attributes
      const ariaLabel = element.getAttribute('aria-label')?.trim();
      if (ariaLabel) return ariaLabel;

      // Check ARIA labelledby
      const labelledBy = element.getAttribute('aria-labelledby');
      if (labelledBy) {
        const labelTexts = labelledBy
          .split(/\s+/)
          .map(id => document.getElementById(id)?.textContent?.trim())
          .filter(Boolean);
        if (labelTexts.length) return labelTexts.join(' ');
      }

      // Check ARIA describedby
      const describedBy = element.getAttribute('aria-describedby');
      if (describedBy) {
        const descriptionTexts = describedBy
          .split(/\s+/)
          .map(id => document.getElementById(id)?.textContent?.trim())
          .filter(Boolean);
        if (descriptionTexts.length) return descriptionTexts.join(' ');
      }

      return '';
    },

    // 2. Standard HTML semantics
    () => {
      // Check for explicit label using 'for' attribute
      if (element.id) {
        const labelElement = element.ownerDocument.querySelector(`label[for="${element.id}"]`);
        if (labelElement?.textContent?.trim()) return labelElement.textContent.trim();
      }

      // Check for wrapping label
      const parentLabel = element.closest('label');
      if (parentLabel) {
        // Clone to avoid modifying the actual DOM
        const clone = parentLabel.cloneNode(true) as HTMLElement;
        // Remove the input element from clone to get just the label text
        clone.querySelectorAll('input, select, textarea, button').forEach(el => el.remove());
        if (clone.textContent?.trim()) return clone.textContent.trim();
      }

      return '';
    },

    // 3. DOM structure analysis
    () => {
      const doc = element.ownerDocument;

      // Try to find preceding text nodes using XPath
      try {
        const xpathResult = doc.evaluate(
          './preceding-sibling::text()[normalize-space(.)!=""] | ./preceding-sibling::*/text()[normalize-space(.)!=""] | ../text()[following-sibling::*[1][self::' +
            element.tagName.toLowerCase() +
            ']]',
          element,
          null,
          XPathResult.ORDERED_NODE_SNAPSHOT_TYPE,
          null,
        );

        const textNodes = [];
        for (let i = 0; i < xpathResult.snapshotLength; i++) {
          const node = xpathResult.snapshotItem(i);
          if (node?.textContent) textNodes.push(node.textContent.trim());
        }

        // Return the closest meaningful text
        const relevantText = textNodes
          .reverse()
          .find(
            text =>
              text.length > 1 &&
              text.length < 200 &&
              !/^[0-9.,$€£%]+$/.test(text) &&
              !text.includes('{{') &&
              !text.includes('}}'),
          );

        if (relevantText) return relevantText;
      } catch (e) {
        console.debug('XPath evaluation failed:', e);
      }

      return '';
    },

    // 4. Form field attributes
    () => {
      return (
        element.getAttribute('placeholder')?.trim() ||
        element.getAttribute('title')?.trim() ||
        element
          .getAttribute('name')
          ?.split(/[._[\]]/g)
          .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
          .join(' ')
          .trim() ||
        ''
      );
    },
  ];

  // Try each fallback strategy until we find a valid label
  for (const strategy of strategies) {
    const label = await strategy();
    if (label && !/^[0-9.,$€£%]+$/.test(label)) {
      // console.log('Using fallback label:', { fieldId, label, strategy: strategy.name });
      return label;
    }
  }

  return 'Unlabeled field';
};

const shouldSkipElement = (element: HTMLElement): boolean => {
  // Skip disabled elements
  if (element.hasAttribute('disabled')) return true;

  // Skip readonly elements
  if (element.hasAttribute('readonly')) return true;

  // Skip elements with specific data attributes
  if (element.getAttribute('data-filliny-skip') === 'true') return true;

  // Skip elements that are part of autocomplete/datalist
  if (element.hasAttribute('list')) return true;

  return false;
};

// Add new helper to detect framework-specific properties
const detectFramework = (
  element: HTMLElement,
): {
  framework: 'react' | 'angular' | 'vue' | 'vanilla';
  props?: ReactElementProps;
} => {
  // Check for React
  const reactKey = Object.keys(element).find(key => key.startsWith('__react') || key.startsWith('_reactProps'));
  if (reactKey) {
    return {
      framework: 'react',
      props: (element as unknown as { [key: string]: ReactElementProps })[reactKey],
    };
  }

  // Check for Angular
  if (element.hasAttribute('ng-model') || element.hasAttribute('[(ngModel)]')) {
    return { framework: 'angular' };
  }

  // Check for Vue
  if (element.hasAttribute('v-model') || (element as VueElement).__vue__) {
    return { framework: 'vue' };
  }

  return { framework: 'vanilla' };
};

// Add new helper for tracking used IDs
const usedFieldIds = new Set<string>();

const getUniqueFieldId = (baseIndex: number): string => {
  let fieldId = `field-${baseIndex}`;
  let counter = baseIndex;

  while (usedFieldIds.has(fieldId)) {
    counter++;
    fieldId = `field-${counter}`;
  }

  usedFieldIds.add(fieldId);
  return fieldId;
};

// Update field detection to use framework information
const detectInputField = async (
  input: HTMLInputElement,
  index: number,
  testMode: boolean = false,
): Promise<Field | null> => {
  if (!isElementVisible(input) || shouldSkipElement(input)) return null;

  const framework = detectFramework(input);
  const field = await createBaseField(input, index, input.type, testMode);
  if (!field) return null;

  // Special handling for Select2 inputs
  if (input.classList.contains('select2-focusser')) {
    const select2Container = input.closest('.select2-container');
    if (select2Container) {
      const selectId = select2Container.getAttribute('id')?.replace('s2id_', '');
      if (selectId) {
        const actualSelect = document.getElementById(selectId) as HTMLSelectElement;
        if (actualSelect) {
          const selectField = await createBaseField(actualSelect, index, 'select', testMode);
          if (!selectField) return null;

          // Set data attribute on both elements
          select2Container.setAttribute('data-filliny-id', selectField.id);
          input.setAttribute('data-filliny-id', selectField.id);

          selectField.options = await Promise.all(
            Array.from(actualSelect.options).map(async opt => ({
              value: opt.value,
              text: opt.text.trim(),
              selected: opt.selected,
            })),
          );

          // Always select first valid option in test mode
          const validOptions = selectField.options.filter(
            opt =>
              opt.value &&
              !opt.text.toLowerCase().includes('select') &&
              !opt.text.includes('--') &&
              !opt.text.toLowerCase().includes('please select'),
          );

          if (validOptions.length > 0) {
            selectField.testValue = validOptions[0].value;
            selectField.value = validOptions[0].value; // Set the value immediately in test mode
          }

          // Add Select2-specific metadata
          selectField.metadata = {
            framework: 'select2',
            select2Container: select2Container.id,
            actualSelect: selectId,
            visibility: computeElementVisibility(actualSelect),
          };

          return selectField;
        }
      }
    }
  }

  // Add framework-specific metadata
  field.metadata = {
    framework: framework.framework,
    frameworkProps: framework.props,
    visibility: computeElementVisibility(input),
  };

  // Rest of the existing detection logic...
  switch (input.type) {
    case 'button':
    case 'submit':
    case 'reset':
    case 'hidden':
      return null;
    case 'color':
    case 'date':
    case 'datetime-local':
    case 'month':
    case 'week':
    case 'time':
    case 'range':
    case 'tel':
    case 'email':
    case 'url':
    case 'number':
      field.value = input.value || '';
      if (input.type === 'number' || input.type === 'range') {
        field.validation = {
          ...field.validation,
          step: Number(input.step) || 1,
        };
      }
      return field;
    case 'file':
      return field;
    default:
      field.value = input.value || '';
      return field;
  }
};

const detectSelectField = async (select: HTMLSelectElement, index: number): Promise<Field | null> => {
  if (!isElementVisible(select) || shouldSkipElement(select)) return null;

  const field = await createBaseField(select, index, 'select');
  field.value = select.value || '';
  field.options = await Promise.all(
    Array.from(select.options).map(async opt => ({
      value: opt.value,
      text: opt.text.trim(),
      selected: opt.selected,
    })),
  );
  field.testValue = select.getAttribute('data-test-value') || '';

  return field;
};

const detectRadioGroup = async (
  element: HTMLInputElement,
  index: number,
  processedGroups: Set<string>,
): Promise<Field | null> => {
  const name = element.name;
  if (!name || processedGroups.has(name)) return null;

  // Find the parent form or form-like container
  const container = element.closest('form, [data-filliny-confidence], fieldset, [role="radiogroup"]');
  if (!container) return null;

  const groupElements = container.querySelectorAll<HTMLInputElement>(`input[type="radio"][name="${name}"]`);
  const visibleElements = Array.from(groupElements).filter(el => isElementVisible(el) && !shouldSkipElement(el));

  if (visibleElements.length === 0) return null;

  // Create field for the group
  const field = await createBaseField(visibleElements[0], index, 'radio');

  // Find the common container for all radio buttons in the group
  const commonContainer = findCommonContainer(visibleElements);
  if (commonContainer) {
    // Try to get a group label first from the container
    const containerLabel = await getFieldLabel(commonContainer, field.id);
    if (containerLabel && containerLabel !== 'Unlabeled field') {
      field.label = containerLabel;
    }
  }

  // Get labels for each radio option with optimized OCR
  field.options = await Promise.all(
    visibleElements.map(async el => {
      // Find the closest label container for this radio button
      const labelContainer = findRadioLabelContainer(el);
      let labelText = '';

      if (labelContainer) {
        // First try standard label detection methods
        const standardLabel = await getStandardLabel(labelContainer);
        if (standardLabel) {
          labelText = standardLabel;
        } else {
          // If standard methods fail, use OCR with optimized container
          const { container: ocrContainer } = findOptimalLabelContainer(labelContainer);
          labelText = await getFieldLabelFromScreenshot(ocrContainer, field.id);
        }
      }

      // Fallback to element value if no label found
      return {
        value: el.value,
        text: labelText || el.value,
        selected: el.checked,
      };
    }),
  );

  const selectedRadio = visibleElements.find(el => el.checked);
  field.value = selectedRadio ? field.options.find(opt => opt.value === selectedRadio.value)?.text || '' : '';
  field.testValue = visibleElements[0].getAttribute('data-test-value') || '';

  // Add field ID to all radio buttons in group and their containers
  visibleElements.forEach(el => {
    el.setAttribute('data-filliny-id', field.id);
    const container = findRadioLabelContainer(el);
    if (container) {
      container.setAttribute('data-filliny-id', field.id);
    }
  });

  processedGroups.add(name);
  return field;
};

// Helper function to find the common container for a group of radio buttons
const findCommonContainer = (elements: HTMLElement[]): HTMLElement | null => {
  if (elements.length === 0) return null;
  if (elements.length === 1) return elements[0].parentElement;

  let commonAncestor = elements[0].parentElement;
  while (commonAncestor) {
    if (elements.every(el => commonAncestor?.contains(el))) {
      // Check if this is a meaningful container (fieldset, div with role, etc.)
      if (
        commonAncestor.tagName.toLowerCase() === 'fieldset' ||
        commonAncestor.getAttribute('role') === 'radiogroup' ||
        commonAncestor.classList.contains('radio-group') ||
        commonAncestor.querySelector('legend')
      ) {
        return commonAncestor;
      }
    }
    commonAncestor = commonAncestor.parentElement;
  }
  return null;
};

// Helper function to find the best label container for a radio button
const findRadioLabelContainer = (radio: HTMLElement): HTMLElement | null => {
  // First check for an explicit label
  if (radio.id) {
    const explicitLabel = radio.ownerDocument.querySelector<HTMLElement>(`label[for="${radio.id}"]`);
    if (explicitLabel) return explicitLabel;
  }

  // Check for wrapping label
  const wrapperLabel = radio.closest('label');
  if (wrapperLabel) return wrapperLabel;

  // Look for adjacent label-like elements
  const parent = radio.parentElement;
  if (!parent) return null;

  // Check siblings
  const siblings = Array.from(parent.children);
  const radioIndex = siblings.indexOf(radio);

  // Check next sibling first (most common pattern)
  if (radioIndex < siblings.length - 1) {
    const next = siblings[radioIndex + 1];
    if (isLabelLike(next)) return next as HTMLElement;
  }

  // Check previous sibling
  if (radioIndex > 0) {
    const prev = siblings[radioIndex - 1];
    if (isLabelLike(prev)) return prev as HTMLElement;
  }

  // If no good container found, return parent as fallback
  return parent;
};

// Helper to check if an element is likely to contain a label
const isLabelLike = (element: Element): boolean => {
  // First ensure we have an HTMLElement
  if (!(element instanceof HTMLElement)) return false;

  // Now TypeScript knows element is HTMLElement
  const tagName = element.tagName.toLowerCase();
  if (['label', 'span', 'div', 'p'].includes(tagName)) {
    // Check if element has meaningful text content
    const text = element.textContent?.trim() || '';
    return text.length > 0 && text.length < 100 && !/^[0-9.,$€£%]+$/.test(text);
  }
  return false;
};

// Helper to get standard label without OCR
const getStandardLabel = async (element: HTMLElement): Promise<string> => {
  // Check for explicit text content
  const text = element.textContent?.trim();
  if (text && text.length > 0 && text.length < 100 && !/^[0-9.,$€£%]+$/.test(text)) {
    return text;
  }

  // Check ARIA attributes
  const ariaLabel = element.getAttribute('aria-label')?.trim();
  if (ariaLabel) return ariaLabel;

  // Check ARIA labelledby
  const labelledBy = element.getAttribute('aria-labelledby');
  if (labelledBy) {
    const labelTexts = labelledBy
      .split(/\s+/)
      .map(id => element.ownerDocument.getElementById(id)?.textContent?.trim())
      .filter(Boolean);
    if (labelTexts.length) return labelTexts.join(' ');
  }

  return '';
};

const detectTextareaField = async (textarea: HTMLTextAreaElement, index: number): Promise<Field | null> => {
  if (!isElementVisible(textarea) || shouldSkipElement(textarea)) return null;

  const field = await createBaseField(textarea, index, 'textarea');
  field.value = textarea.value || '';
  field.testValue = textarea.getAttribute('data-test-value') || '';
  return field;
};

const detectCheckboxField = async (element: HTMLElement, index: number): Promise<Field | null> => {
  if (!isElementVisible(element) || shouldSkipElement(element)) return null;

  const field = await createBaseField(element, index, 'checkbox');

  // Get the current state
  let isChecked = false;
  if (element instanceof HTMLInputElement) {
    isChecked = element.checked;
  } else {
    isChecked = element.getAttribute('aria-checked') === 'true' || element.hasAttribute('checked');
  }

  // Store boolean value as string
  field.value = isChecked.toString();

  field.metadata = {
    framework: 'vanilla',
    visibility: { isVisible: isElementVisible(element) },
    checkboxValue: element instanceof HTMLInputElement ? element.value : 'on',
    isExclusive:
      element.hasAttribute('data-exclusive') ||
      element.closest('[role="radiogroup"]') !== null ||
      element.closest('fieldset[data-exclusive]') !== null,
    groupName:
      element instanceof HTMLInputElement
        ? element.name
        : element.getAttribute('data-group') || element.closest('fieldset')?.id,
  };

  return field;
};

const getElementRole = (element: HTMLElement): string | null => {
  // Check explicit role first
  const role = element.getAttribute('role');
  if (role) return role;

  // Check implicit roles based on element type
  switch (element.tagName.toLowerCase()) {
    case 'input':
      return (element as HTMLInputElement).type;
    case 'select':
      return 'combobox';
    case 'textarea':
      return 'textbox';
    default:
      return null;
  }
};

const getElementValue = (element: HTMLElement): string => {
  // Check standard value attribute
  const value = element.getAttribute('value') || '';

  // Check aria-checked for checkbox-like elements
  const checked = element.getAttribute('aria-checked');
  if (checked) {
    return checked;
  }

  // Check data-state for custom components
  const state = element.getAttribute('data-state');
  if (state) {
    return state;
  }

  // For input-like elements
  if (element instanceof HTMLInputElement) {
    return element.value;
  }

  // For custom components, check inner text
  return value || element.textContent?.trim() || '';
};

// Add new helper function at the top
const isFormLikeContainer = async (element: HTMLElement): Promise<boolean> => {
  // Framework-specific form indicators
  const framework = detectFramework(element);
  if (framework.framework !== 'vanilla') {
    const hasFormProps =
      framework.props &&
      (framework.props.onSubmit ||
        framework.props.onChange ||
        framework.props['ng-submit'] ||
        framework.props['v-on:submit']);
    if (hasFormProps) return true;
  }

  // Common form-like container classes and attributes
  const formLikeClasses = [
    'form',
    'form-group',
    'form-container',
    'form-wrapper',
    'form-section',
    'form-content',
    'form-body',
  ];

  const formLikeRoles = ['form', 'group', 'region', 'search', 'contentinfo'];

  // Check for form-like classes
  const hasFormClass = formLikeClasses.some(
    className => element.classList.contains(className) || element.className.toLowerCase().includes(className),
  );

  // Check for form-like roles
  const hasFormRole = formLikeRoles.includes(element.getAttribute('role') || '');

  // Check for multiple form controls
  const formControls = element.querySelectorAll(
    'input:not([type="hidden"]), select, textarea, [role="textbox"], [role="combobox"]',
  );

  // Check for form-like structure
  const hasFormStructure =
    formControls.length > 1 &&
    !!(
      element.querySelector('button[type="submit"]') ||
      element.querySelector('[role="button"]') ||
      element.querySelector('input[type="submit"]')
    );

  return hasFormClass || hasFormRole || hasFormStructure;
};

// Modify the detectFields export to handle both forms and form-like containers
export const detectFields = async (container: HTMLElement, isImplicitForm: boolean = false): Promise<Field[]> => {
  const fields: Field[] = [];
  let index = 0;
  const processedGroups = new Set<string>();

  // Process all elements and collect promises
  const elements = Array.from(
    container.querySelectorAll<HTMLElement>(`
      input[type="checkbox"], [role="checkbox"], [role="switch"],
      input, select, textarea, [role="radio"], [role="textbox"],
      [role="combobox"], [role="spinbutton"], [data-filliny-field]
    `),
  );

  for (const element of elements) {
    if (!isElementVisible(element) || shouldSkipElement(element)) continue;

    const role = getElementRole(element);
    let field: Field | null = null;

    try {
      switch (role) {
        case 'checkbox':
        case 'switch':
          field = await detectCheckboxField(element, index);
          break;
        case 'radio':
          if (element instanceof HTMLInputElement) {
            field = await detectRadioGroup(element, index, processedGroups);
          }
          break;
        case 'textbox':
        case 'spinbutton':
          field = await detectTextLikeField(element, index);
          break;
        case 'combobox':
          field = await detectSelectLikeField(element, index);
          break;
        default:
          // Handle native elements
          if (element instanceof HTMLInputElement) {
            field = await detectInputField(element, index, isImplicitForm);
          } else if (element instanceof HTMLSelectElement) {
            field = await detectSelectField(element, index);
          } else if (element instanceof HTMLTextAreaElement) {
            field = await detectTextareaField(element, index);
          }
      }

      if (field) {
        fields.push(field);
        index++;
      }
    } catch (e) {
      console.warn('Error detecting field:', e);
    }
  }

  return fields;
};

const detectTextLikeField = async (element: HTMLElement, index: number): Promise<Field | null> => {
  const field = await createBaseField(element, index, 'text');
  field.value = getElementValue(element);
  field.testValue = element.getAttribute('data-test-value') || '';
  return field;
};

const detectDynamicSelectOptions = async (element: HTMLElement): Promise<Array<{ value: string; text: string }>> => {
  const originalState = document.documentElement.innerHTML;
  let options: Array<{ value: string; text: string }> = [];

  try {
    // Click to trigger any dynamic content
    element.click();
    await new Promise(resolve => setTimeout(resolve, 300));

    // Look for any newly added content in the DOM
    const root = element.ownerDocument;
    const addedElements = Array.from(root.querySelectorAll('*')).filter(el => {
      if (!el.isConnected || !isElementVisible(el as HTMLElement)) return false;

      // Look for common option patterns
      const isOptionLike =
        el.matches('li, [role="option"]') || // Standard options
        el.getAttribute('role')?.includes('option') || // ARIA roles
        el.matches('[data-value], [value]') || // Value attributes
        el.parentElement?.getAttribute('role')?.includes('listbox'); // Inside listbox

      return isOptionLike && !element.contains(el);
    });

    // Group options by their containers to find the most likely option list
    const optionGroups = addedElements.reduce((groups, el) => {
      const container = el.parentElement;
      if (!container) return groups;

      if (!groups.has(container)) {
        groups.set(container, []);
      }
      groups.get(container)?.push(el);
      return groups;
    }, new Map<Element, Element[]>());

    // Use the group with the most options
    const bestGroup = Array.from(optionGroups.entries()).sort(([, a], [, b]) => b.length - a.length)[0]?.[1] || [];

    options = bestGroup
      .map(opt => ({
        value: opt.getAttribute('data-value') || opt.getAttribute('value') || opt.textContent?.trim() || '',
        text: opt.textContent?.trim() || '',
      }))
      .filter(opt => opt.value || opt.text);

    // Clean up
    document.body.click();
  } catch (e) {
    console.debug('Error detecting dynamic options:', (e as Error).message);
  }

  // Restore original state if needed
  if (document.documentElement.innerHTML !== originalState) {
    document.documentElement.innerHTML = originalState;
  }

  return options;
};

// Update detectSelectLikeField to use the dynamic detection as fallback
const detectSelectLikeField = async (element: HTMLElement, index: number): Promise<Field | null> => {
  const field = await createBaseField(element, index, 'select');

  // Try standard option detection first
  const staticOptions = element.querySelectorAll('[role="option"], option, [data-option]');
  if (staticOptions.length) {
    field.options = Array.from(staticOptions).map(opt => ({
      value: opt.getAttribute('value') || opt.textContent?.trim() || '',
      text: opt.textContent?.trim() || '',
      selected: opt.getAttribute('aria-selected') === 'true' || opt.hasAttribute('selected'),
    }));
  } else {
    // Fallback to dynamic detection
    const dynamicOptions = await detectDynamicSelectOptions(element);
    if (dynamicOptions.length) {
      field.options = dynamicOptions.map(opt => ({
        ...opt,
        selected: false,
      }));
    }
  }

  field.value = getElementValue(element);
  field.testValue = element.getAttribute('data-test-value') || '';
  return field;
};

// Add new export for detecting form-like containers
export const detectFormLikeContainers = async (): Promise<HTMLElement[]> => {
  const containers: HTMLElement[] = [];
  const documents = getAllFrameDocuments();

  for (const doc of documents) {
    try {
      const forms = Array.from(doc.querySelectorAll<HTMLFormElement>('form'));
      containers.push(...forms);

      // Convert NodeList to Array
      const potentialContainers = Array.from(doc.querySelectorAll<HTMLElement>('div, section, article, main, aside'));

      for (const container of potentialContainers) {
        if (container.closest('form') || containers.some(existing => existing.contains(container))) {
          continue;
        }
        if (await isFormLikeContainer(container)) {
          containers.push(container);
        }
      }
    } catch (e) {
      console.warn('Error detecting forms in frame:', e);
    }
  }

  return containers;
};

// Add new helper for XPath-based element location
export const findElementByXPath = (xpath: string): HTMLElement | null => {
  // Try direct XPath first
  for (const doc of getAllFrameDocuments()) {
    try {
      const result = doc.evaluate(xpath, doc, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null);
      const element = result.singleNodeValue as HTMLElement;
      if (element) return element;
    } catch (e) {
      console.warn('XPath evaluation failed:', e);
    }
  }

  // Fallback to querySelector if XPath fails
  const elements = querySelectorAllFrames('[data-filliny-id]');
  return (elements[0] as HTMLElement) || null;
};

// Add helper to generate XPath for an element
const getElementXPath = (element: HTMLElement): string => {
  if (!element.parentElement) return '';

  const idx =
    Array.from(element.parentElement.children)
      .filter(child => child.tagName === element.tagName)
      .indexOf(element) + 1;

  return `${getElementXPath(element.parentElement)}/${element.tagName.toLowerCase()}[${idx}]`;
};

// Update field creation to include XPath information
const createBaseField = async (
  element: HTMLElement,
  index: number,
  type: string,
  testMode: boolean = false,
): Promise<Field> => {
  const fieldId = getUniqueFieldId(index);

  // Set the data attribute on the element
  element.setAttribute('data-filliny-id', fieldId);

  // First detect all field properties except label
  const field: Field = {
    id: fieldId,
    type: type as FieldType,
    xpath: getElementXPath(element),
    uniqueSelectors: generateUniqueSelectors(element),
    value: '',
  };

  // Now get the label using OCR as primary strategy
  field.label = await getFieldLabel(element, fieldId);

  // Generate default test values based on field type
  if (testMode) {
    switch (type) {
      case 'text':
        field.testValue = 'Test text';
        break;
      case 'email':
        field.testValue = 'test@example.com';
        break;
      case 'tel':
        field.testValue = '+1234567890';
        break;
      case 'select':
        // Will be handled by Select2 specific code
        break;
      case 'number':
        field.testValue = '42';
        break;
      default:
        field.testValue = `Test ${type}`;
    }
  }

  return field;
};

// Helper to generate multiple unique selectors for an element
const generateUniqueSelectors = (element: HTMLElement): string[] => {
  const selectors: string[] = [];

  // ID-based selector
  if (element.id) {
    selectors.push(`#${CSS.escape(element.id)}`);
  }

  // Class-based selector
  if (element.className) {
    const classSelector = Array.from(element.classList)
      .map(c => `.${CSS.escape(c)}`)
      .join('');
    if (classSelector) selectors.push(classSelector);
  }

  // Attribute-based selectors
  ['name', 'type', 'role', 'aria-label'].forEach(attr => {
    if (element.hasAttribute(attr)) {
      selectors.push(`[${attr}="${CSS.escape(element.getAttribute(attr)!)}"]`);
    }
  });

  return selectors;
};
