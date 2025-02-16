// Add OCR result cache
const ocrCache = new Map<string, string>();

// Add global CSP state
let isCSPRestricted: boolean | null = null;

// Add CSP detection helper
const checkCSPRestrictions = (): boolean => {
  // If we've already checked, return cached result
  if (isCSPRestricted !== null) {
    return isCSPRestricted;
  }

  try {
    console.log('Checking CSP restrictions...');
    // Check meta tag CSP
    const metaCSP = document.querySelector('meta[http-equiv="Content-Security-Policy"]');
    if (metaCSP) {
      const cspContent = metaCSP.getAttribute('content') || '';
      if (
        cspContent.includes("'strict-dynamic'") ||
        cspContent.includes("script-src 'self'") ||
        cspContent.includes("connect-src 'self'")
      ) {
        console.log('CSP restrictions detected in meta tag');
        isCSPRestricted = true;
        return true;
      }
    }

    // Test WebAssembly support
    try {
      new WebAssembly.Module(new Uint8Array([0x0, 0x61, 0x73, 0x6d, 0x01, 0x00, 0x00, 0x00]));
      isCSPRestricted = false;
      return false;
    } catch (e) {
      if (e instanceof WebAssembly.CompileError) {
        console.log('WebAssembly blocked by CSP');
        isCSPRestricted = true;
        return true;
      }
    }

    isCSPRestricted = false;
    return false;
  } catch (error) {
    console.warn('Error checking CSP, assuming restricted:', error);
    isCSPRestricted = true;
    return true;
  }
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

// Helper to find the optimal parent container for OCR
export const findOptimalLabelContainer = (
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
    ).filter(field => {
      const style = getComputedStyle(field);
      return style.display !== 'none' && style.visibility !== 'hidden';
    });
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
        el => el !== element && getComputedStyle(el).display !== 'none',
      );

      if (hasOtherInteractives) break;

      const rect = parent.getBoundingClientRect();
      if (rect.width > 800 || rect.height > 300) break;

      container = parent;
    }
    return { container, reason: 'isolated' };
  }

  // Find common ancestor
  let commonAncestor = element;
  while (commonAncestor && !commonAncestor.contains(closestField)) {
    commonAncestor = commonAncestor.parentElement!;
  }

  if (!commonAncestor || commonAncestor.tagName.toLowerCase() === 'body') {
    return { container: element, reason: 'fallback' };
  }

  // Find the optimal container by checking each ancestor's content
  let bestContainer = element;
  let bestTextDensity = 0;

  let current = element;
  while (current && current !== commonAncestor.parentElement) {
    // Skip if container includes other form fields
    const hasOtherFields = Array.from(current.querySelectorAll('input, select, textarea, button')).some(
      el => el !== element && el !== closestField && getComputedStyle(el).display !== 'none',
    );

    if (hasOtherFields) break;

    // Check container dimensions
    const rect = current.getBoundingClientRect();
    if (rect.width > 800 || rect.height > 300) break;

    // Calculate text density (text length / area)
    const text = current.textContent || '';
    const area = rect.width * rect.height;
    const density = area > 0 ? text.length / area : 0;

    if (density > bestTextDensity) {
      bestContainer = current;
      bestTextDensity = density;
    }

    current = current.parentElement!;
  }

  return {
    container: bestContainer,
    reason: bestContainer === element ? 'self' : 'structure',
  };
};

// Update processWithCSPSafeOCR to use cached CSP check
const processWithCSPSafeOCR = async (element: HTMLElement): Promise<string> => {
  try {
    // Use cached CSP check
    if (isCSPRestricted === null) {
      checkCSPRestrictions(); // This will set isCSPRestricted
    }

    if (isCSPRestricted) {
      console.log('Using fallback methods (CSP restricted)');
      return '';
    }

    // Continue with Tesseract OCR since site is not CSP restricted
    const { container } = findOptimalLabelContainer(element);
    const dataUrl = await captureElement(container);

    try {
      const { createWorker } = await import('tesseract.js');
      const worker = await createWorker('eng', 1, {
        logger: () => {},
        errorHandler: (err: Error) => {
          console.warn('Tesseract worker error:', err);
        },
      });

      const result = await worker.recognize(dataUrl);
      await worker.terminate();

      const detectedText = result.data.text
        .split('\n')
        .map(line => line.trim())
        .filter(line => line.length > 0)
        .join(' ')
        .trim();

      if (detectedText) {
        console.log('OCR successful:', detectedText);
        return detectedText;
      }

      return '';
    } catch (error) {
      console.warn('OCR failed:', error);
      return '';
    }
  } catch (error: unknown) {
    if (error instanceof Error) {
      console.error('Critical error in OCR process:', error);
    }
    return '';
  }
};

// Main export for OCR-based label detection
export const getFieldLabelFromOCR = async (element: HTMLElement, fieldId: string): Promise<string> => {
  try {
    const cacheKey = element.getAttribute('data-filliny-id') || fieldId;

    if (ocrCache.has(cacheKey)) {
      console.log('Using cached OCR label for:', { fieldId, label: ocrCache.get(cacheKey) });
      return ocrCache.get(cacheKey)!;
    }

    console.log('Cache miss, starting OCR for:', { fieldId });
    const label = await processWithCSPSafeOCR(element);

    if (label) {
      ocrCache.set(cacheKey, label);
      console.log('OCR detection complete:', { fieldId, label });
    } else {
      console.log('OCR detection failed to find label for:', { fieldId });
    }

    return label;
  } catch (error: unknown) {
    if (error instanceof Error) {
      console.error('Error in OCR detection:', {
        fieldId,
        error: error.message,
        stack: error.stack,
      });
    }
    return '';
  }
};
