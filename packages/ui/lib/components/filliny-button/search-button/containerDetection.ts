import { getFormFieldsRobust } from "./field-types";
import { safeGetLowerString } from "./field-types/utils";

interface FormCandidate {
  element: HTMLElement;
  score: number;
  fieldCount: number;
  reasons: string[];
}

/**
 * Get the depth of an element in the DOM tree
 */
const getElementDepth = (element: HTMLElement): number => {
  let depth = 0;
  let current = element.parentElement;
  while (current && current !== document.body) {
    depth++;
    current = current.parentElement;
  }
  return depth;
};

/**
 * Get field types present in a container
 */
export const getFieldTypesInContainer = (container: HTMLElement): Set<string> => {
  const types = new Set<string>();

  // Check for different input types
  const inputs = container.querySelectorAll("input");
  inputs.forEach(input => {
    if (input.type === "text" || input.type === "email" || input.type === "tel" || input.type === "url") {
      types.add("text");
    } else if (input.type === "checkbox") {
      types.add("checkbox");
    } else if (input.type === "radio") {
      types.add("radio");
    } else if (input.type === "file") {
      types.add("file");
    }
  });

  // Check for selects
  if (container.querySelector("select")) types.add("select");

  // Check for textareas
  if (container.querySelector("textarea")) types.add("textarea");

  // Check for ARIA roles
  if (container.querySelector('[role="combobox"]')) types.add("select");
  if (container.querySelector('[role="checkbox"]')) types.add("checkbox");
  if (container.querySelector('[role="radio"]')) types.add("radio");

  return types;
};

/**
 * Calculate how well a container groups related fields
 */
export const calculateContainerGroupingScore = (container: HTMLElement, fields: HTMLElement[]): number => {
  let score = 0;

  // Base score from field count
  score += fields.length * 5;

  // Check field type diversity (good grouping should have logical field combinations)
  const fieldTypes = getFieldTypesInContainer(container);

  // Bonus for logical field type combinations
  if (fieldTypes.has("text") && fieldTypes.has("email")) score += 20; // Contact forms
  if (fieldTypes.has("radio") && fieldTypes.has("checkbox")) score += 15; // Survey forms
  if (fieldTypes.has("select") && fieldTypes.has("text")) score += 15; // Application forms
  if (fieldTypes.has("checkbox") && fieldTypes.has("text")) score += 10; // Terms + info forms

  // Bonus for semantic containers
  const tagName = container.tagName.toLowerCase();
  if (tagName === "fieldset") score += 30;
  if (tagName === "form") score += 25;
  if (container.getAttribute("role") === "group") score += 20;

  // Bonus for appropriate size (not too small or too large)
  const rect = container.getBoundingClientRect();
  if (rect.height > 100 && rect.height < 2000) score += 10;
  if (rect.width > 200 && rect.width < 1200) score += 10;

  // Penalty for excessive nesting depth
  const depth = getElementDepth(container);
  if (depth > 15) score -= Math.min(depth - 15, 30);

  return score;
};

/**
 * Enhanced scoring function that considers field grouping and relationships
 * Optimized for modern web applications and SPA patterns
 */
export const scoreFormContainerEnhanced = (
  element: HTMLElement,
  fields: HTMLElement[],
): { score: number; reasons: string[] } => {
  let score = 0;
  const reasons: string[] = [];

  // Enhanced base score from field count with better scaling
  const fieldCount = fields.length;
  if (fieldCount === 0) return { score: 0, reasons: ["no fields"] };

  // Progressive scoring that rewards more fields but with diminishing returns
  if (fieldCount >= 10) {
    score += 120; // High score for forms with many fields
  } else if (fieldCount >= 5) {
    score += fieldCount * 15; // Good score for medium forms
  } else {
    score += fieldCount * 10; // Base score for small forms
  }
  reasons.push(`${fieldCount} form fields`);

  // Enhanced field diversity scoring
  const fieldTypes = getFieldTypesInContainer(element);
  const diversityBonus = Math.min(fieldTypes.size * 12, 60); // Cap diversity bonus
  score += diversityBonus;
  reasons.push(`${fieldTypes.size} different field types (+${diversityBonus})`);

  // Bonus for modern form patterns and logical field combinations
  const hasTextAndEmail = fieldTypes.has("text") && fieldTypes.has("email");
  const hasSelectAndText = fieldTypes.has("select") && fieldTypes.has("text");
  const hasCheckboxAndRadio = fieldTypes.has("checkbox") && fieldTypes.has("radio");
  const hasFileInput = fieldTypes.has("file");

  if (hasTextAndEmail) {
    score += 25;
    reasons.push("contact form pattern (+25)");
  }
  if (hasSelectAndText) {
    score += 20;
    reasons.push("application form pattern (+20)");
  }
  if (hasCheckboxAndRadio) {
    score += 18;
    reasons.push("survey/preference form pattern (+18)");
  }
  if (hasFileInput) {
    score += 15;
    reasons.push("document upload form (+15)");
  }

  // Semantic HTML elements get higher scores
  const tagName = safeGetLowerString(element.tagName);
  if (tagName === "form") {
    score += 60;
    reasons.push("semantic <form> element");
  } else if (tagName === "fieldset") {
    score += 40;
    reasons.push("semantic <fieldset> element");
  }

  // ARIA roles
  const role = element.getAttribute("role");
  if (role === "form") {
    score += 50;
    reasons.push("ARIA form role");
  } else if (role === "group") {
    score += 30;
    reasons.push("ARIA group role");
  }

  // Enhanced class name patterns (case insensitive) - optimized for modern web apps
  const className = safeGetLowerString(element.className);
  const classPatterns = [
    // Core form patterns
    { pattern: /\bform\b/, score: 40, label: "form class" },
    { pattern: /\bsurvey\b/, score: 45, label: "survey class" },
    { pattern: /\bquestionnaire\b/, score: 45, label: "questionnaire class" },
    { pattern: /\bapplication\b/, score: 35, label: "application class" },

    // Business/insurance specific patterns
    { pattern: /\bprofile\b/, score: 40, label: "profile class" },
    { pattern: /\binsurance\b/, score: 42, label: "insurance class" },
    { pattern: /\bpolicy\b/, score: 38, label: "policy class" },
    { pattern: /\bcoverage\b/, score: 36, label: "coverage class" },
    { pattern: /\bquote\b/, score: 35, label: "quote class" },
    { pattern: /\bclaim\b/, score: 35, label: "claim class" },
    { pattern: /\baccount\b/, score: 32, label: "account class" },
    { pattern: /\bmember\b/, score: 30, label: "member class" },
    { pattern: /\bcustomer\b/, score: 30, label: "customer class" },

    // Authentication and user flows
    { pattern: /\bcontact\b/, score: 28, label: "contact class" },
    { pattern: /\bsignup\b/, score: 30, label: "signup class" },
    { pattern: /\blogin\b/, score: 25, label: "login class" },
    { pattern: /\bregistration\b/, score: 35, label: "registration class" },
    { pattern: /\bonboarding\b/, score: 33, label: "onboarding class" },

    // E-commerce patterns
    { pattern: /\bcheckout\b/, score: 40, label: "checkout class" },
    { pattern: /\bpayment\b/, score: 38, label: "payment class" },
    { pattern: /\bbilling\b/, score: 36, label: "billing class" },
    { pattern: /\bshipping\b/, score: 34, label: "shipping class" },

    // Multi-step form patterns
    { pattern: /\bwizard\b/, score: 30, label: "wizard class" },
    { pattern: /\bstep\b/, score: 20, label: "step class" },
    { pattern: /\bstage\b/, score: 18, label: "stage class" },
    { pattern: /\bflow\b/, score: 16, label: "flow class" },

    // Container patterns
    { pattern: /\bform-container\b/, score: 35, label: "form container class" },
    { pattern: /\bform-wrapper\b/, score: 35, label: "form wrapper class" },
    { pattern: /\bform-section\b/, score: 32, label: "form section class" },
    { pattern: /\bform-group\b/, score: 28, label: "form group class" },
    { pattern: /\bform-body\b/, score: 33, label: "form body class" },
    { pattern: /\bform-content\b/, score: 33, label: "form content class" },

    // Modern SPA patterns
    { pattern: /\bpage\b/, score: 15, label: "page class" },
    { pattern: /\bview\b/, score: 12, label: "view class" },
    { pattern: /\bcomponent\b/, score: 10, label: "component class" },
    { pattern: /\bcontainer\b/, score: 8, label: "container class" },

    // Negative patterns (reduce score)
    { pattern: /\bmodal\b/, score: -12, label: "modal (small penalty)" },
    { pattern: /\bpopup\b/, score: -12, label: "popup (small penalty)" },
    { pattern: /\btooltip\b/, score: -20, label: "tooltip (penalty)" },
    { pattern: /\bdropdown\b/, score: -15, label: "dropdown (penalty)" },
    { pattern: /\bmenu\b/, score: -18, label: "menu (penalty)" },
    { pattern: /\bnavigation\b/, score: -25, label: "navigation (penalty)" },
    { pattern: /\bheader\b/, score: -20, label: "header (penalty)" },
    { pattern: /\bfooter\b/, score: -20, label: "footer (penalty)" },
    { pattern: /\bsidebar\b/, score: -22, label: "sidebar (penalty)" },
  ];

  for (const { pattern, score: patternScore, label } of classPatterns) {
    if (pattern.test(className)) {
      score += patternScore;
      reasons.push(label);
    }
  }

  // ID patterns
  const id = safeGetLowerString(element.id);
  const idPatterns = [
    { pattern: /\bform\b/, score: 25, label: "form ID" },
    { pattern: /\bsurvey\b/, score: 30, label: "survey ID" },
    { pattern: /\bapplication\b/, score: 20, label: "application ID" },
    { pattern: /\bcontact\b/, score: 15, label: "contact ID" },
    { pattern: /\bwizard\b/, score: 15, label: "wizard ID" },
  ];

  for (const { pattern, score: patternScore, label } of idPatterns) {
    if (pattern.test(id)) {
      score += patternScore;
      reasons.push(label);
    }
  }

  // Data attributes
  const dataAttributes = [
    { attr: "data-form", score: 25, label: "data-form attribute" },
    { attr: "data-step", score: 15, label: "data-step attribute" },
    { attr: "data-wizard", score: 20, label: "data-wizard attribute" },
    { attr: "data-survey", score: 30, label: "data-survey attribute" },
  ];

  for (const { attr, score: attrScore, label } of dataAttributes) {
    if (element.hasAttribute(attr)) {
      score += attrScore;
      reasons.push(label);
    }
  }

  // Structural indicators
  const hasLegend = element.querySelector("legend");
  if (hasLegend) {
    score += 20;
    reasons.push("contains legend");
  }

  const hasSubmitButton = element.querySelector('input[type="submit"], button[type="submit"], button:not([type])');
  if (hasSubmitButton) {
    score += 25;
    reasons.push("contains submit button");
  }

  // Group relationship bonuses
  const hasRadioGroups = element.querySelectorAll('input[type="radio"]').length >= 2;
  const hasCheckboxGroups = element.querySelectorAll('input[type="checkbox"]').length >= 2;

  if (hasRadioGroups) {
    score += 15;
    reasons.push("contains radio button groups");
  }

  if (hasCheckboxGroups) {
    score += 15;
    reasons.push("contains checkbox groups");
  }

  // Framework-specific patterns
  const frameworkPatterns = [
    { pattern: /\bfreebirdFormviewerViewFormCard\b/, score: 50, label: "Google Forms" },
    { pattern: /\bfreebirdFormviewerViewFormContent\b/, score: 50, label: "Google Forms content" },
    { pattern: /\bform-container\b/, score: 35, label: "form container" },
    { pattern: /\binput-container\b/, score: 20, label: "input container" },
    { pattern: /\bfield-container\b/, score: 20, label: "field container" },
    { pattern: /\bform-section\b/, score: 30, label: "form section" },
    { pattern: /\bform-group\b/, score: 25, label: "form group" },
    { pattern: /\bform-wrapper\b/, score: 35, label: "form wrapper" },
    { pattern: /\bform-body\b/, score: 30, label: "form body" },
    { pattern: /\bform-content\b/, score: 30, label: "form content" },
  ];

  for (const { pattern, score: patternScore, label } of frameworkPatterns) {
    if (pattern.test(className)) {
      score += patternScore;
      reasons.push(label);
    }
  }

  // Penalty for very deep nesting (likely not a form container)
  const depth = getElementDepth(element);
  if (depth > 12) {
    const penalty = Math.min((depth - 12) * 3, 40);
    score -= penalty;
    reasons.push(`deep nesting penalty (${depth} levels, -${penalty})`);
  }

  // Bonus for reasonable size and visibility
  const rect = element.getBoundingClientRect();
  if (rect.width > 250 && rect.height > 150) {
    score += 15;
    reasons.push("reasonable size");
  }

  // Strong penalty for hidden elements
  const style = window.getComputedStyle(element);
  if (style.display === "none" || style.visibility === "hidden") {
    score -= 80;
    reasons.push("hidden element penalty");
  }

  // Bonus for containers that properly group related fields
  const groupingBonus = calculateContainerGroupingScore(element, fields) * 0.3; // Scale down the grouping score
  if (groupingBonus > 5) {
    score += groupingBonus;
    reasons.push(`good field grouping (+${Math.round(groupingBonus)})`);
  }

  return { score: Math.round(score), reasons };
};

/**
 * Find the optimal container for a field considering grouping and hierarchy
 * Enhanced to find truly outermost containers
 */
export const findOptimalFieldContainer = (
  field: HTMLElement,
  allFields: HTMLElement[],
  doc: Document,
): HTMLElement | null => {
  // Start from the field and work upwards to find the best container
  let currentElement = field.parentElement;
  let bestContainer: HTMLElement | null = null;
  let maxGroupScore = 0;
  let maxFieldCount = 0;

  // Track all potential containers
  const containerCandidates: Array<{ element: HTMLElement; score: number; fieldCount: number }> = [];

  while (currentElement && currentElement !== doc.body && currentElement !== doc.documentElement) {
    // Calculate how well this container groups related fields
    const containerFields = allFields.filter(f => currentElement!.contains(f));

    if (containerFields.length >= 1) {
      // Score this container based on how well it groups fields
      const groupScore = calculateContainerGroupingScore(currentElement, containerFields);

      containerCandidates.push({
        element: currentElement,
        score: groupScore,
        fieldCount: containerFields.length,
      });

      // Prefer containers with more fields and better grouping
      const shouldUpdate =
        groupScore > maxGroupScore || (groupScore >= maxGroupScore * 0.8 && containerFields.length > maxFieldCount);

      if (shouldUpdate) {
        maxGroupScore = groupScore;
        maxFieldCount = containerFields.length;
        bestContainer = currentElement;
      }
    }

    currentElement = currentElement.parentElement;
  }

  // Post-processing: Ensure we have the outermost meaningful container
  if (bestContainer && containerCandidates.length > 1) {
    // Sort by field count (descending) and then by score
    containerCandidates.sort((a, b) => {
      if (a.fieldCount !== b.fieldCount) {
        return b.fieldCount - a.fieldCount;
      }
      return b.score - a.score;
    });

    // If the top candidate has significantly more fields, prefer it
    const topCandidate = containerCandidates[0];
    if (topCandidate.fieldCount > maxFieldCount * 1.2 && topCandidate.score >= maxGroupScore * 0.5) {
      console.log(`🔄 Switching to outermost container with ${topCandidate.fieldCount} fields (was ${maxFieldCount})`);
      bestContainer = topCandidate.element;
    }
  }

  return bestContainer;
};

/**
 * Find an expanded container that might be more comprehensive
 */
export const findExpandedContainer = (element: HTMLElement): HTMLElement | null => {
  let current = element.parentElement;
  let bestContainer = element;
  let maxFields = getFormFieldsRobust(element).length;

  while (current && current !== document.body && current !== document.documentElement) {
    const currentFields = getFormFieldsRobust(current);

    // If parent has significantly more fields, it might be better
    if (currentFields.length > maxFields * 1.2) {
      bestContainer = current;
      maxFields = currentFields.length;
    }

    // Don't go too high up the DOM tree
    const depth = getElementDepth(current);
    if (depth > 20) break;

    current = current.parentElement;
  }

  return bestContainer !== element ? bestContainer : null;
};
