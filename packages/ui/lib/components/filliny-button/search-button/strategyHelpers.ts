import { checkCSPRestrictions } from './ocrHelpers';
import type { DetectionStrategy } from './detectionHelpers';

interface FormComplexity {
  score: number;
  reasons: string[];
}

const evaluateFormComplexity = (container: HTMLElement): FormComplexity => {
  const complexity = {
    score: 0,
    reasons: [] as string[],
  };

  // Check layout complexity
  const style = window.getComputedStyle(container);
  if (style.display === 'grid' || style.display === 'flex') {
    complexity.score += 2;
    complexity.reasons.push('Complex layout (grid/flex)');
  }

  // Check for nested layout containers
  const layoutContainers = container.querySelectorAll('[class*="layout"], [class*="grid"], [class*="flex"]').length;
  if (layoutContainers > 2) {
    complexity.score += layoutContainers;
    complexity.reasons.push(`Multiple layout containers (${layoutContainers})`);
  }

  // Check for dynamic content
  if (container.querySelector('[data-dynamic], [data-loading], [aria-live]')) {
    complexity.score += 2;
    complexity.reasons.push('Dynamic content markers present');
  }

  // Check label linking
  const labels = Array.from(container.querySelectorAll('label'));
  const unlinkedLabels = labels.filter(label => !label.htmlFor).length;
  if (unlinkedLabels > 0) {
    complexity.score += unlinkedLabels * 2;
    complexity.reasons.push(`Unlinked labels (${unlinkedLabels}/${labels.length})`);
  }

  // Check for visual indicators
  const visualElements = container.querySelectorAll('img, svg, [class*="icon"]').length;
  if (visualElements > 0) {
    complexity.score += visualElements;
    complexity.reasons.push(`Visual elements present (${visualElements})`);
  }

  // Check for floating text (potential visual labels)
  const hasFloatingText = Array.from(container.childNodes).some(
    node => node.nodeType === Node.TEXT_NODE && (node.textContent?.trim().length ?? 0) > 0,
  );
  if (hasFloatingText) {
    complexity.score += 3;
    complexity.reasons.push('Floating text content detected');
  }

  // Check for non-standard form controls
  const customControls = container.querySelectorAll('[role], [contenteditable], [data-filliny-field]').length;
  if (customControls > 0) {
    complexity.score += customControls;
    complexity.reasons.push(`Custom form controls (${customControls})`);
  }

  // Check explicit OCR preference
  if (container.hasAttribute('data-prefer-ocr')) {
    complexity.score += 10;
    complexity.reasons.push('Explicit OCR preference');
  }

  return complexity;
};

export const determineDetectionStrategy = async (container: HTMLElement): Promise<DetectionStrategy> => {
  // First check if OCR is even possible based on CSP
  const isOCRPossible = !(await checkCSPRestrictions());

  if (!isOCRPossible) {
    console.log(
      '%c⚠️ OCR detection unavailable due to CSP restrictions',
      'background: #dc2626; color: white; padding: 4px 8px; border-radius: 4px; font-size: 12px;',
    );
    return 'dom';
  }

  const complexity = evaluateFormComplexity(container);

  // Log complexity analysis
  console.log(
    '%c📊 Form Complexity Analysis',
    'background: #0891b2; color: white; padding: 4px 8px; border-radius: 4px; font-size: 12px;',
    '\nScore:',
    complexity.score,
    '\nFactors:\n-',
    complexity.reasons.join('\n- '),
  );

  // Decision threshold for OCR
  const COMPLEXITY_THRESHOLD = 5;
  const shouldUseOCR = complexity.score >= COMPLEXITY_THRESHOLD;

  // Log decision factors
  console.log(
    '%c🤔 Strategy Decision Factors',
    'background: #0891b2; color: white; padding: 4px 8px; border-radius: 4px; font-size: 12px;',
    '\nOCR Available:',
    isOCRPossible,
    '\nComplexity Score:',
    complexity.score,
    '\nThreshold:',
    COMPLEXITY_THRESHOLD,
    '\nChosen Strategy:',
    shouldUseOCR ? 'OCR' : 'DOM',
  );

  return shouldUseOCR ? 'ocr' : 'dom';
};
