import { hasProperty } from '@extension/shared';
import type { ReactFiberElement } from '@extension/shared';

/**
 * Minimal React Fiber node shape for tree traversal.
 * Only the properties we actually access are typed.
 */
interface ReactFiberNode {
  memoizedProps?: Record<string, string | number | boolean | null | undefined | object>;
  pendingProps?: Record<string, string | number | boolean | null | undefined | object>;
  return?: ReactFiberNode | null;
}

// ============================================================================
// Autocomplete Label Map
// ============================================================================

/**
 * Maps standard HTML autocomplete attribute values to human-readable labels.
 * Handles compound values like "section-red shipping street-address"
 * by extracting the last semantic token.
 */
const AUTOCOMPLETE_LABEL_MAP: Record<string, string> = {
  'given-name': 'First Name',
  'additional-name': 'Middle Name',
  'family-name': 'Last Name',
  name: 'Full Name',
  'honorific-prefix': 'Title',
  'honorific-suffix': 'Suffix',
  nickname: 'Nickname',
  email: 'Email',
  username: 'Username',
  'new-password': 'New Password',
  'current-password': 'Current Password',
  'organization-title': 'Job Title',
  organization: 'Company',
  'street-address': 'Street Address',
  'address-line1': 'Address Line 1',
  'address-line2': 'Address Line 2',
  'address-line3': 'Address Line 3',
  'address-level1': 'State/Province',
  'address-level2': 'City',
  'address-level3': 'District',
  'address-level4': 'Neighborhood',
  country: 'Country',
  'country-name': 'Country',
  'postal-code': 'Postal Code',
  'cc-name': 'Cardholder Name',
  'cc-number': 'Card Number',
  'cc-exp': 'Expiration Date',
  'cc-exp-month': 'Expiration Month',
  'cc-exp-year': 'Expiration Year',
  'cc-csc': 'Security Code',
  'cc-type': 'Card Type',
  'transaction-currency': 'Currency',
  'transaction-amount': 'Amount',
  language: 'Language',
  bday: 'Birthday',
  'bday-day': 'Birth Day',
  'bday-month': 'Birth Month',
  'bday-year': 'Birth Year',
  sex: 'Gender',
  tel: 'Phone',
  'tel-country-code': 'Country Code',
  'tel-national': 'Phone Number',
  'tel-area-code': 'Area Code',
  'tel-local': 'Local Phone',
  'tel-extension': 'Phone Extension',
  url: 'Website',
  photo: 'Photo',
};

/**
 * Maps inputmode attribute values to human-readable labels.
 */
const INPUTMODE_LABEL_MAP: Record<string, string> = {
  email: 'Email',
  tel: 'Phone',
  url: 'Website',
  numeric: 'Number',
  decimal: 'Decimal Number',
  search: 'Search',
};

// ============================================================================
// String Utilities
// ============================================================================

/** Common technical prefixes to strip from field names/IDs */
const TECHNICAL_PREFIXES =
  /^(input[_-]?|field[_-]?|txt[_-]?|sel[_-]?|chk[_-]?|btn[_-]?|frm[_-]?|ctl[_-]?|ddl[_-]?|rdo[_-]?)/i;

/**
 * Convert a technical string (camelCase, snake_case, kebab-case, dot notation,
 * bracket notation) into a human-readable label.
 *
 * Examples:
 * - "firstName" -> "First Name"
 * - "first_name" -> "First Name"
 * - "first-name" -> "First Name"
 * - "user.email" -> "User Email"
 * - "user[email]" -> "User Email"
 * - "field_1" -> "Field"
 * - "input-firstName" -> "First Name"
 */
const humanizeString = (input: string): string => {
  if (!input) return '';

  const result = input
    // Strip common technical prefixes
    .replace(TECHNICAL_PREFIXES, '')
    // Remove bracket notation: user[email] -> user email
    .replace(/\[([^\]]*)\]/g, ' $1')
    // Replace dot notation: user.email -> user email
    .replace(/\./g, ' ')
    // Insert space before uppercase letters (camelCase): firstName -> first Name
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    // Replace underscores and hyphens with spaces
    .replace(/[_-]/g, ' ')
    // Strip trailing numeric suffixes: field 1 -> field
    .replace(/\s*\d+\s*$/, '')
    // Normalize whitespace
    .replace(/\s+/g, ' ')
    .trim();

  if (!result) return '';

  // Capitalize each word
  return result
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
};

// ============================================================================
// CSS Class Semantic Patterns
// ============================================================================

/**
 * Maps common CSS class name patterns to human-readable labels.
 * Used when no standard HTML attributes or labels can be found.
 */
const CSS_CLASS_LABEL_PATTERNS: Array<{ pattern: RegExp; label: string }> = [
  { pattern: /first[_-]?name/i, label: 'First Name' },
  { pattern: /last[_-]?name/i, label: 'Last Name' },
  { pattern: /full[_-]?name/i, label: 'Full Name' },
  { pattern: /middle[_-]?name/i, label: 'Middle Name' },
  { pattern: /email[_-]?(address)?/i, label: 'Email' },
  { pattern: /phone[_-]?(number)?/i, label: 'Phone' },
  { pattern: /street[_-]?address/i, label: 'Street Address' },
  { pattern: /address[_-]?line/i, label: 'Address' },
  { pattern: /city/i, label: 'City' },
  { pattern: /state|province/i, label: 'State/Province' },
  { pattern: /zip[_-]?(code)?|postal[_-]?(code)?/i, label: 'Postal Code' },
  { pattern: /country/i, label: 'Country' },
  { pattern: /company|organization/i, label: 'Company' },
  { pattern: /job[_-]?title|position/i, label: 'Job Title' },
  { pattern: /password/i, label: 'Password' },
  { pattern: /username/i, label: 'Username' },
  { pattern: /website|url/i, label: 'Website' },
  { pattern: /birth[_-]?day|date[_-]?of[_-]?birth|dob/i, label: 'Date of Birth' },
  { pattern: /gender|sex/i, label: 'Gender' },
  { pattern: /salary|compensation/i, label: 'Salary' },
  { pattern: /resume|cv/i, label: 'Resume/CV' },
  { pattern: /cover[_-]?letter/i, label: 'Cover Letter' },
  { pattern: /linkedin/i, label: 'LinkedIn' },
  { pattern: /github/i, label: 'GitHub' },
  { pattern: /portfolio/i, label: 'Portfolio' },
  { pattern: /message|comment/i, label: 'Message' },
  { pattern: /subject/i, label: 'Subject' },
  { pattern: /search/i, label: 'Search' },
  { pattern: /experience|years/i, label: 'Experience' },
  { pattern: /education|degree|school/i, label: 'Education' },
  { pattern: /start[_-]?date/i, label: 'Start Date' },
  { pattern: /end[_-]?date/i, label: 'End Date' },
  { pattern: /description|summary|bio/i, label: 'Description' },
  { pattern: /referral/i, label: 'Referral' },
  { pattern: /how[_-]?did[_-]?you[_-]?hear/i, label: 'How Did You Hear About Us' },
  { pattern: /visa|work[_-]?auth/i, label: 'Work Authorization' },
  { pattern: /relocat/i, label: 'Willing to Relocate' },
  { pattern: /veteran/i, label: 'Veteran Status' },
  { pattern: /disability/i, label: 'Disability Status' },
  { pattern: /race|ethnicity/i, label: 'Race/Ethnicity' },
];

// ============================================================================
// React Fiber Label Extraction
// ============================================================================

/**
 * Type guard: check if element has React fiber keys.
 */
const isReactFiberElement = (element: HTMLElement): element is ReactFiberElement => {
  try {
    return Object.keys(element).some(key => key.startsWith('__reactFiber$') || key.startsWith('__reactProps$'));
  } catch {
    return false;
  }
};

/**
 * Extract label/placeholder/name from React fiber props tree.
 * Walks up the fiber tree to find meaningful label props from parent components.
 */
const extractReactFiberLabel = (element: HTMLElement): string | null => {
  try {
    if (!isReactFiberElement(element)) return null;

    // Find the react fiber key
    const fiberKey = Object.keys(element).find(
      key => key.startsWith('__reactFiber$') || key.startsWith('__reactInternalInstance$'),
    );
    if (!fiberKey || !hasProperty(element, fiberKey)) return null;

    // Walk the fiber tree upward to find props with label-like values
    const labelProps = ['label', 'aria-label', 'placeholder', 'name', 'title', 'fieldLabel', 'inputLabel', 'helpText'];
    let fiber = element[fiberKey] as ReactFiberNode | null;
    let depth = 0;
    const maxDepth = 15;

    while (fiber && depth < maxDepth) {
      const memoizedProps = fiber.memoizedProps;
      if (memoizedProps && typeof memoizedProps === 'object') {
        for (const prop of labelProps) {
          const val = memoizedProps[prop];
          if (typeof val === 'string' && val.trim()) {
            return val.trim();
          }
        }
        // Also check for children that are strings (React text nodes used as labels)
        const children = memoizedProps.children;
        if (typeof children === 'string' && children.trim() && children.trim().length < 100) {
          return children.trim();
        }
      }

      // Also check pendingProps
      const pendingProps = fiber.pendingProps;
      if (pendingProps && typeof pendingProps === 'object') {
        for (const prop of labelProps) {
          const val = pendingProps[prop];
          if (typeof val === 'string' && val.trim()) {
            return val.trim();
          }
        }
      }

      fiber = fiber.return ?? null;
      depth++;
    }

    // Also check __reactProps$ for label-like properties
    const propsKey = Object.keys(element).find(key => key.startsWith('__reactProps$'));
    if (propsKey && hasProperty(element, propsKey)) {
      const props = element[propsKey];
      if (props && typeof props === 'object') {
        for (const prop of labelProps) {
          if (hasProperty(props, prop)) {
            const val = props[prop];
            if (typeof val === 'string' && val.trim()) {
              return val.trim();
            }
          }
        }
      }
    }

    return null;
  } catch {
    return null;
  }
};

/**
 * Extract label from CSS class names by matching semantic patterns.
 */
const extractLabelFromClasses = (element: HTMLElement): string | null => {
  try {
    // Check the element itself and its closest ancestors (up to 3 levels)
    let current: HTMLElement | null = element;
    let depth = 0;
    while (current && depth < 4) {
      const className = current.className;
      if (typeof className === 'string' && className) {
        for (const { pattern, label } of CSS_CLASS_LABEL_PATTERNS) {
          if (pattern.test(className)) {
            return label;
          }
        }
        // Also try to humanize the class name itself if it looks semantic
        const classes = className.split(/\s+/);
        for (const cls of classes) {
          // Skip obviously technical classes
          if (cls.length > 3 && !cls.startsWith('css-') && !cls.startsWith('sc-') && !/^[a-z]{1,3}$/.test(cls)) {
            const humanized = humanizeString(cls);
            if (humanized && humanized.length > 2 && humanized.length < 50) {
              return humanized;
            }
          }
        }
      }
      current = current.parentElement;
      depth++;
    }
    return null;
  } catch {
    return null;
  }
};

/**
 * Extract label from section headings (h1-h6) that precede the field's container.
 * Common in multi-section forms like job applications.
 */
const extractSectionHeadingLabel = (element: HTMLElement): string | null => {
  try {
    let container: HTMLElement | null = element.parentElement;
    let depth = 0;

    while (container && depth < 8) {
      // Check for headings inside this container that appear before the element
      const headings = container.querySelectorAll('h1, h2, h3, h4, h5, h6');
      for (const heading of Array.from(headings)) {
        // Make sure the heading appears before the element in DOM order
        if (heading.compareDocumentPosition(element) & Node.DOCUMENT_POSITION_FOLLOWING && !heading.contains(element)) {
          const headingText = heading.textContent?.trim() || '';
          if (headingText && headingText.length < 80) {
            // Only use the heading if this section contains few inputs (likely a label for them)
            const inputs = container.querySelectorAll('input, select, textarea, [contenteditable="true"]');
            if (inputs.length <= 5) {
              return headingText;
            }
          }
        }
      }
      container = container.parentElement;
      depth++;
    }
    return null;
  } catch {
    return null;
  }
};

/**
 * Extract label from table structure (th/td header for the cell containing the input).
 * Common in older forms and admin panels.
 */
const extractTableHeaderLabel = (element: HTMLElement): string | null => {
  try {
    const td = element.closest('td');
    if (!td) return null;

    const tr = td.closest('tr');
    if (!tr) return null;

    const cellIndex = td instanceof HTMLTableCellElement ? Array.from(tr.cells).indexOf(td) : -1;

    // Strategy 1: Check the preceding td/th in the same row
    if (cellIndex > 0) {
      const prevCell = tr.cells[cellIndex - 1];
      if (prevCell) {
        const text = prevCell.textContent?.trim() || '';
        if (text && text.length < 80) {
          return text;
        }
      }
    }

    // Strategy 2: Check the thead th at the same column index
    const table = td.closest('table');
    if (table) {
      const thead = table.querySelector('thead');
      if (thead) {
        const headerRow = thead.querySelector('tr');
        if (headerRow && headerRow.cells[cellIndex]) {
          const text = headerRow.cells[cellIndex]?.textContent?.trim() || '';
          if (text && text.length < 80) {
            return text;
          }
        }
      }
    }

    return null;
  } catch {
    return null;
  }
};

// ============================================================================
// Label Extraction
// ============================================================================

/**
 * Extract the semantic autocomplete token from a potentially compound value.
 * e.g., "section-red shipping street-address" -> "street-address"
 */
const getAutocompleteLabel = (autocomplete: string): string | null => {
  const tokens = autocomplete.trim().toLowerCase().split(/\s+/);
  // Walk backwards to find the first known semantic token
  for (let i = tokens.length - 1; i >= 0; i--) {
    const token = tokens[i];
    if (token && AUTOCOMPLETE_LABEL_MAP[token]) {
      return AUTOCOMPLETE_LABEL_MAP[token];
    }
  }
  return null;
};

/**
 * Determine the label for a form field element.
 *
 * Uses a multi-strategy approach with confidence scoring.
 * Returns a combined label from top distinct candidates, never an empty string.
 */
const getFieldLabel = (element: HTMLElement): string => {
  const labelCandidates: Array<{ text: string; confidence: number }> = [];

  // Strategy 1: Explicit label with 'for' attribute (highest confidence)
  if (element.id) {
    try {
      const labelElement = document.querySelector(`label[for="${CSS.escape(element.id)}"]`);
      if (labelElement) {
        const labelText = labelElement.textContent?.trim() || '';
        if (labelText) {
          labelCandidates.push({ text: labelText, confidence: 0.9 });

          const innerSpans = Array.from(labelElement.querySelectorAll('span, div, p'));
          for (const span of innerSpans) {
            const spanText = span.textContent?.trim() || '';
            if (spanText && spanText !== labelText) {
              labelCandidates.push({ text: spanText, confidence: 0.85 });
            }
          }
        }
      }
    } catch {
      // CSS.escape or querySelector may throw for unusual IDs
    }
  }

  // Strategy 2: Element nested inside a <label>
  const parentLabel = element.closest('label');
  if (parentLabel) {
    let labelText = '';
    const walker = document.createTreeWalker(parentLabel, NodeFilter.SHOW_TEXT, {
      acceptNode: node => {
        if (element.contains(node)) {
          return NodeFilter.FILTER_REJECT;
        }
        return NodeFilter.FILTER_ACCEPT;
      },
    });

    let node;
    while ((node = walker.nextNode())) {
      labelText += node.textContent?.trim() + ' ';
    }

    labelText = labelText.trim();
    if (labelText) {
      labelCandidates.push({ text: labelText, confidence: 0.85 });
    }
  }

  // Strategy 3: aria-label attribute
  const ariaLabel = element.getAttribute('aria-label');
  if (ariaLabel?.trim()) {
    labelCandidates.push({ text: ariaLabel.trim(), confidence: 0.8 });
  }

  // Strategy 4: aria-labelledby attribute
  const ariaLabelledBy = element.getAttribute('aria-labelledby');
  if (ariaLabelledBy) {
    const labelIds = ariaLabelledBy.split(/\s+/);
    const labelTexts: string[] = [];

    for (const id of labelIds) {
      const labelElement = document.getElementById(id);
      if (labelElement) {
        const text = labelElement.textContent?.trim() || '';
        if (text) {
          labelTexts.push(text);
        }
      }
    }

    if (labelTexts.length > 0) {
      labelCandidates.push({ text: labelTexts.join(' '), confidence: 0.8 });
    }
  }

  // Strategy 5: placeholder attribute
  const placeholder = element.getAttribute('placeholder');
  if (placeholder?.trim()) {
    labelCandidates.push({ text: placeholder.trim(), confidence: 0.6 });
  }

  // Strategy 6: name attribute (using humanizeString)
  const name = element.getAttribute('name');
  if (name) {
    const readableName = humanizeString(name);
    if (readableName) {
      labelCandidates.push({ text: readableName, confidence: 0.5 });
    }
  }

  // Strategy 7: Previous sibling label text
  const sibling = element.previousElementSibling;
  if (sibling && ['LABEL', 'DIV', 'SPAN', 'P', 'H1', 'H2', 'H3', 'H4', 'H5', 'H6'].includes(sibling.tagName)) {
    const siblingText = sibling.textContent?.trim() || '';
    if (siblingText) {
      const confidence = siblingText.length < 50 ? 0.75 : 0.65;
      labelCandidates.push({ text: siblingText, confidence });
    }
  }

  // Strategy 8: Parent's preceding sibling
  const parent = element.parentElement;
  if (parent?.previousElementSibling) {
    const parentSibling = parent.previousElementSibling;
    if (['LABEL', 'DIV', 'SPAN', 'P', 'H1', 'H2', 'H3', 'H4', 'H5', 'H6'].includes(parentSibling.tagName)) {
      const siblingText = parentSibling.textContent?.trim() || '';
      if (siblingText) {
        labelCandidates.push({ text: siblingText, confidence: 0.7 });
      }
    }
  }

  // Strategy 9: Parent's first child (if not the input itself)
  if (parent?.firstElementChild && parent.firstElementChild !== element) {
    const firstChild = parent.firstElementChild;
    if (['LABEL', 'DIV', 'SPAN', 'P', 'H1', 'H2', 'H3', 'H4', 'H5', 'H6'].includes(firstChild.tagName)) {
      const childText = firstChild.textContent?.trim() || '';
      if (childText) {
        labelCandidates.push({ text: childText, confidence: 0.65 });
      }
    }
  }

  // Strategy 10: Parent text nodes
  if (parent) {
    for (let i = 0; i < parent.childNodes.length; i++) {
      const childNode = parent.childNodes[i];
      if (childNode && childNode.nodeType === Node.TEXT_NODE && childNode.textContent?.trim()) {
        const text = childNode.textContent.trim();
        if (text) {
          labelCandidates.push({ text, confidence: 0.6 });
        }
      }
    }

    // Strategy 11: Form-group pattern
    if (
      parent.classList.contains('form-group') ||
      parent.classList.contains('field-group') ||
      parent.classList.contains('input-group')
    ) {
      const labelElements = Array.from(parent.querySelectorAll('label, .field-label, .input-label, .form-label'));
      for (const labelEl of labelElements) {
        if (!element.contains(labelEl)) {
          const labelText = labelEl.textContent?.trim() || '';
          if (labelText) {
            labelCandidates.push({ text: labelText, confidence: 0.75 });
          }
        }
      }
    }
  }

  // Strategy 12: title HTML attribute
  const titleAttr = element.getAttribute('title');
  if (titleAttr?.trim()) {
    labelCandidates.push({ text: titleAttr.trim(), confidence: 0.55 });
  }

  // Strategy 13: autocomplete attribute mapping
  const autocomplete = element.getAttribute('autocomplete');
  if (autocomplete && autocomplete !== 'off' && autocomplete !== 'on') {
    const acLabel = getAutocompleteLabel(autocomplete);
    if (acLabel) {
      labelCandidates.push({ text: acLabel, confidence: 0.7 });
    }
  }

  // Strategy 14: data-* attribute mining
  const dataAttrs = [
    'data-label',
    'data-field-name',
    'data-testid',
    'data-cy',
    'data-qa',
    'data-automation-id',
    'data-name',
  ];
  for (const attr of dataAttrs) {
    const val = element.getAttribute(attr);
    if (val?.trim()) {
      const humanized = humanizeString(val.trim());
      if (humanized) {
        labelCandidates.push({ text: humanized, confidence: 0.55 });
        break; // Take only the first matching data attribute
      }
    }
  }

  // Strategy 15: id attribute parsing (lower confidence - IDs are technical)
  if (element.id) {
    const humanizedId = humanizeString(element.id);
    if (humanizedId) {
      labelCandidates.push({ text: humanizedId, confidence: 0.45 });
    }
  }

  // Strategy 16: aria-description / resolved aria-describedby
  const ariaDescription = element.getAttribute('aria-description');
  if (ariaDescription?.trim()) {
    labelCandidates.push({ text: ariaDescription.trim(), confidence: 0.5 });
  } else {
    const ariaDescribedBy = element.getAttribute('aria-describedby');
    if (ariaDescribedBy) {
      const descIds = ariaDescribedBy.split(/\s+/);
      const descTexts: string[] = [];
      for (const id of descIds) {
        const el = document.getElementById(id);
        if (el) {
          const text = el.textContent?.trim() || '';
          if (text) {
            descTexts.push(text);
          }
        }
      }
      if (descTexts.length > 0) {
        labelCandidates.push({ text: descTexts.join(' '), confidence: 0.5 });
      }
    }
  }

  // Strategy 17: Spatial proximity (visual label)
  try {
    const rect = element.getBoundingClientRect();
    if (rect.width > 0 && rect.height > 0) {
      const maxDistance = 150;
      const candidateSelectors = 'label, span, div, p, h1, h2, h3, h4, h5, h6, legend, dt';
      const nearbyElements =
        element.closest('form') || element.closest('[role="form"]') || parent?.parentElement || document.body;
      const textElements = nearbyElements ? Array.from(nearbyElements.querySelectorAll(candidateSelectors)) : [];

      let closestText = '';
      let closestDistance = maxDistance;

      for (const textEl of textElements) {
        // Skip if it contains the input element
        if (textEl.contains(element) || element.contains(textEl)) continue;
        // Skip elements with form inputs inside them (likely wrapper divs)
        if (textEl.querySelector('input, select, textarea, [contenteditable]')) continue;

        const textContent = textEl.textContent?.trim() || '';
        if (!textContent || textContent.length > 100) continue;

        const textRect = textEl.getBoundingClientRect();
        if (textRect.width === 0 || textRect.height === 0) continue;

        // Check if text element is above or to the left of the input
        const isAbove = textRect.bottom <= rect.top + 5 && textRect.bottom >= rect.top - maxDistance;
        const isLeft = textRect.right <= rect.left + 5 && textRect.right >= rect.left - maxDistance;
        const isSameRow = Math.abs(textRect.top - rect.top) < rect.height;

        if (isAbove) {
          // Prefer elements directly above (horizontally aligned)
          const horizontalOverlap = Math.max(
            0,
            Math.min(rect.right, textRect.right) - Math.max(rect.left, textRect.left),
          );
          const verticalDistance = rect.top - textRect.bottom;
          const distance = verticalDistance - (horizontalOverlap > 0 ? 20 : 0); // Bonus for horizontal alignment
          if (distance < closestDistance) {
            closestDistance = distance;
            closestText = textContent;
          }
        } else if (isLeft && isSameRow) {
          const distance = rect.left - textRect.right;
          if (distance < closestDistance) {
            closestDistance = distance;
            closestText = textContent;
          }
        }
      }

      if (closestText) {
        labelCandidates.push({ text: closestText, confidence: 0.65 });
      }
    }
  } catch {
    // getBoundingClientRect may fail in some contexts
  }

  // Strategy 18: Ancestor text walk
  try {
    let ancestor = parent;
    let depth = 0;
    while (ancestor && depth < 5) {
      // Check if this ancestor has exactly 1 form input (this element)
      const inputs = ancestor.querySelectorAll('input, select, textarea, [contenteditable="true"]');
      if (inputs.length === 1) {
        // Collect direct text nodes from this container
        let ancestorText = '';
        for (let i = 0; i < ancestor.childNodes.length; i++) {
          const childNode = ancestor.childNodes[i];
          if (childNode && childNode.nodeType === Node.TEXT_NODE) {
            ancestorText += (childNode.textContent?.trim() || '') + ' ';
          }
        }
        // Also check for span/label children that aren't the input
        const textChildren = Array.from(
          ancestor.querySelectorAll(':scope > span, :scope > label, :scope > div, :scope > p'),
        );
        for (const textChild of textChildren) {
          if (!textChild.contains(element) && !textChild.querySelector('input, select, textarea')) {
            ancestorText += (textChild.textContent?.trim() || '') + ' ';
          }
        }
        ancestorText = ancestorText.trim();
        if (ancestorText && ancestorText.length < 100) {
          labelCandidates.push({ text: ancestorText, confidence: 0.4 });
          break;
        }
      }
      ancestor = ancestor.parentElement;
      depth++;
    }
  } catch {
    // DOM traversal may fail
  }

  // Strategy 19: inputmode mapping
  const inputmode = element.getAttribute('inputmode');
  if (inputmode && INPUTMODE_LABEL_MAP[inputmode]) {
    labelCandidates.push({ text: INPUTMODE_LABEL_MAP[inputmode], confidence: 0.3 });
  }

  // Strategy 20: Fieldset legend (always run, not just when candidates array is empty)
  const fieldset = element.closest('fieldset');
  if (fieldset) {
    const legend = fieldset.querySelector('legend');
    if (legend) {
      const legendText = legend.textContent?.trim() || '';
      if (legendText) {
        labelCandidates.push({ text: legendText, confidence: 0.6 });
      }
    }
  }

  // Strategy 21: React fiber props extraction (for React-based ATS/CMS sites like gem.com)
  const reactLabel = extractReactFiberLabel(element);
  if (reactLabel) {
    labelCandidates.push({ text: reactLabel, confidence: 0.75 });
  }

  // Strategy 22: CSS class semantic analysis
  const classLabel = extractLabelFromClasses(element);
  if (classLabel) {
    labelCandidates.push({ text: classLabel, confidence: 0.4 });
  }

  // Strategy 23: Section heading label (h1-h6 in ancestor containers)
  const sectionLabel = extractSectionHeadingLabel(element);
  if (sectionLabel) {
    labelCandidates.push({ text: `[${sectionLabel}]`, confidence: 0.35 });
  }

  // Strategy 24: Table header label (th/td context for table-based forms)
  const tableLabel = extractTableHeaderLabel(element);
  if (tableLabel) {
    labelCandidates.push({ text: tableLabel, confidence: 0.65 });
  }

  // Strategy 25: Broader ancestor text walk (grandparent/great-grandparent up to 8 levels)
  try {
    let ancestor = parent?.parentElement ?? null;
    let depth = 0;
    while (ancestor && depth < 6) {
      const inputs = ancestor.querySelectorAll('input, select, textarea, [contenteditable="true"]');
      if (inputs.length === 1) {
        // This ancestor wraps only our field - its text is likely a label
        const textElements = Array.from(
          ancestor.querySelectorAll(
            ':scope > span, :scope > label, :scope > div > span, :scope > div > label, :scope > p, :scope > strong, :scope > em, :scope > b',
          ),
        );
        for (const textChild of textElements) {
          if (!textChild.contains(element) && !textChild.querySelector('input, select, textarea')) {
            const text = textChild.textContent?.trim() || '';
            if (text && text.length > 1 && text.length < 100) {
              labelCandidates.push({ text, confidence: 0.35 - depth * 0.03 });
              break;
            }
          }
        }
      }
      ancestor = ancestor.parentElement;
      depth++;
    }
  } catch {
    // Deep ancestor traversal may fail
  }

  // Strategy 26: All data-* attributes mining (broader search)
  try {
    const allAttrs = Array.from(element.attributes);
    for (const attr of allAttrs) {
      if (
        attr.name.startsWith('data-') &&
        !['data-filliny-id', 'data-filliny-updated', 'data-reactid'].includes(attr.name) &&
        attr.value?.trim()
      ) {
        const humanized = humanizeString(attr.value.trim());
        if (humanized && humanized.length > 2 && humanized.length < 80) {
          // Avoid duplicating values already captured in Strategy 14
          const alreadyFound = labelCandidates.some(c => c.text.toLowerCase() === humanized.toLowerCase());
          if (!alreadyFound) {
            labelCandidates.push({ text: humanized, confidence: 0.3 });
          }
        }
      }
    }
  } catch {
    // Attribute mining may fail
  }

  // Strategy 27: Next sibling text (for right-aligned or suffix labels)
  try {
    const nextSibling = element.nextElementSibling;
    if (
      nextSibling &&
      ['LABEL', 'SPAN', 'DIV', 'P'].includes(nextSibling.tagName) &&
      !nextSibling.querySelector('input, select, textarea')
    ) {
      const siblingText = nextSibling.textContent?.trim() || '';
      if (siblingText && siblingText.length < 60) {
        labelCandidates.push({ text: siblingText, confidence: 0.45 });
      }
    }
  } catch {
    // Next sibling detection may fail
  }

  // Sort candidates by confidence score (highest first)
  labelCandidates.sort((a, b) => b.confidence - a.confidence);

  if (labelCandidates.length === 0) {
    // Nuclear fallback: never return empty string
    const tagName = element.tagName.toLowerCase();
    const inputType = element.getAttribute('type') || 'unknown';
    return `${tagName}:${inputType}`;
  }

  // Multi-signal combining: combine ALL distinct candidates (no limit)
  // to give the API maximum context about the field
  const seen = new Set<string>();
  const distinct: string[] = [];
  for (const candidate of labelCandidates) {
    const normalized = candidate.text.toLowerCase().trim();
    if (!normalized) continue;
    // Skip if we've already seen very similar text
    if (seen.has(normalized)) continue;
    // Also check if one already-added label contains this or vice versa
    let isDuplicate = false;
    for (const existing of seen) {
      if (existing.includes(normalized) || normalized.includes(existing)) {
        isDuplicate = true;
        break;
      }
    }
    if (isDuplicate) continue;

    seen.add(normalized);
    distinct.push(candidate.text);
  }

  // No truncation - return ALL combined candidates for maximum API context
  return distinct.join(' | ');
};

// ============================================================================
// Description Extraction
// ============================================================================

const getFieldDescription = (element: HTMLElement): string => {
  // Check aria-description (newer attribute) first
  const ariaDesc = element.getAttribute('aria-description');
  if (ariaDesc?.trim()) {
    return ariaDesc.trim();
  }

  // Check aria-describedby
  const ariaDescribedBy = element.getAttribute('aria-describedby');
  if (ariaDescribedBy) {
    const descIds = ariaDescribedBy.split(/\s+/);
    const texts: string[] = [];
    for (const id of descIds) {
      const descElement = document.getElementById(id);
      if (descElement) {
        const text = descElement.textContent?.trim() || '';
        if (text) texts.push(text);
      }
    }
    if (texts.length > 0) return texts.join(' ');
  }

  // Check data attributes
  const dataDesc = element.getAttribute('data-description');
  if (dataDesc?.trim()) return dataDesc.trim();

  const dataTooltip = element.getAttribute('data-tooltip');
  if (dataTooltip?.trim()) return dataTooltip.trim();

  const dataTip = element.getAttribute('data-tip');
  if (dataTip?.trim()) return dataTip.trim();

  const dataHint = element.getAttribute('data-hint');
  if (dataHint?.trim()) return dataHint.trim();

  // Check sibling/cousin elements with helper text classes
  const parent = element.parentElement;
  if (parent) {
    const helperSelectors =
      '.description, .help-text, .hint, .form-text, .form-hint, .field-hint, .helper-text, .error-text, .info-text, .field-description, .input-hint, .input-help';
    const siblingDesc = parent.querySelector(helperSelectors);
    if (siblingDesc) {
      const text = siblingDesc.textContent?.trim() || '';
      if (text) return text;
    }

    // Also check grandparent for helper text (common in wrapper-based layouts)
    const grandparent = parent.parentElement;
    if (grandparent) {
      const grandparentDesc = grandparent.querySelector(helperSelectors);
      if (grandparentDesc && !grandparentDesc.contains(element)) {
        const text = grandparentDesc.textContent?.trim() || '';
        if (text) return text;
      }
    }
  }

  return '';
};

export { humanizeString, getFieldLabel, getFieldDescription, extractReactFiberLabel };
