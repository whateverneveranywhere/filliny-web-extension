export const getFieldLabel = (element: HTMLElement): string => {
  // Array to store potential label candidates with confidence scores
  const labelCandidates: Array<{ text: string; confidence: number }> = [];

  // Strategy 1: Check for explicit label with 'for' attribute (highest confidence)
  if (element.id) {
    const labelElement = document.querySelector(`label[for="${CSS.escape(element.id)}"]`);
    if (labelElement) {
      const labelText = labelElement.textContent?.trim() || "";
      if (labelText) {
        labelCandidates.push({ text: labelText, confidence: 0.9 });

        // Also check if the label has inner elements with more specific text
        const innerSpans = Array.from(labelElement.querySelectorAll("span, div, p"));
        if (innerSpans.length > 0) {
          for (const span of innerSpans) {
            const spanText = span.textContent?.trim() || "";
            if (spanText && spanText !== labelText) {
              labelCandidates.push({ text: spanText, confidence: 0.85 });
            }
          }
        }
      }
    }
  }

  // Strategy 2: Check if element is inside a label
  const parentLabel = element.closest("label");
  if (parentLabel) {
    // Get all text nodes directly inside the label, excluding the input element's text
    let labelText = "";
    const walker = document.createTreeWalker(parentLabel, NodeFilter.SHOW_TEXT, {
      acceptNode: function (node) {
        // Skip text nodes that are children of the input element
        if (element.contains(node)) {
          return NodeFilter.FILTER_REJECT;
        }
        return NodeFilter.FILTER_ACCEPT;
      },
    });

    let node;
    while ((node = walker.nextNode())) {
      labelText += node.textContent?.trim() + " ";
    }

    labelText = labelText.trim();
    if (labelText) {
      labelCandidates.push({ text: labelText, confidence: 0.85 });
    }
  }

  // Strategy 3: Check for aria-label attribute
  const ariaLabel = element.getAttribute("aria-label");
  if (ariaLabel) {
    labelCandidates.push({ text: ariaLabel, confidence: 0.8 });
  }

  // Strategy 4: Check for aria-labelledby attribute
  const ariaLabelledBy = element.getAttribute("aria-labelledby");
  if (ariaLabelledBy) {
    const labelIds = ariaLabelledBy.split(/\s+/);
    const labelTexts: string[] = [];

    for (const id of labelIds) {
      const labelElement = document.getElementById(id);
      if (labelElement) {
        const text = labelElement.textContent?.trim() || "";
        if (text) {
          labelTexts.push(text);
        }
      }
    }

    if (labelTexts.length > 0) {
      labelCandidates.push({ text: labelTexts.join(" "), confidence: 0.8 });
    }
  }

  // Strategy 5: Check for placeholder attribute
  const placeholder = element.getAttribute("placeholder");
  if (placeholder) {
    labelCandidates.push({ text: placeholder, confidence: 0.6 });
  }

  // Strategy 6: Check for name attribute
  const name = element.getAttribute("name");
  if (name) {
    // Convert camelCase or snake_case to readable text
    const readableName = name
      .replace(/([A-Z])/g, " $1") // Convert camelCase to spaces
      .replace(/_/g, " ") // Convert snake_case to spaces
      .replace(/^\w/, c => c.toUpperCase()) // Capitalize first letter
      .trim();

    labelCandidates.push({ text: readableName, confidence: 0.5 });
  }

  // Strategy 7: Check sibling elements that might be labels
  // Look for preceding siblings first (most common pattern)
  const sibling = element.previousElementSibling;
  if (sibling && ["LABEL", "DIV", "SPAN", "P", "H1", "H2", "H3", "H4", "H5", "H6"].includes(sibling.tagName)) {
    const siblingText = sibling.textContent?.trim() || "";
    if (siblingText) {
      // Higher confidence for elements that are direct siblings and have short text (likely to be labels)
      const confidence = siblingText.length < 50 ? 0.75 : 0.65;
      labelCandidates.push({ text: siblingText, confidence });
    }
  }

  // Strategy 8: Check parent's preceding element (common in many forms)
  const parent = element.parentElement;
  if (parent && parent.previousElementSibling) {
    const parentSibling = parent.previousElementSibling;
    if (["LABEL", "DIV", "SPAN", "P", "H1", "H2", "H3", "H4", "H5", "H6"].includes(parentSibling.tagName)) {
      const siblingText = parentSibling.textContent?.trim() || "";
      if (siblingText) {
        labelCandidates.push({ text: siblingText, confidence: 0.7 });
      }
    }
  }

  // Strategy 9: Check parent's first child if it's not the input
  if (parent && parent.firstElementChild && parent.firstElementChild !== element) {
    const firstChild = parent.firstElementChild;
    if (["LABEL", "DIV", "SPAN", "P", "H1", "H2", "H3", "H4", "H5", "H6"].includes(firstChild.tagName)) {
      const childText = firstChild.textContent?.trim() || "";
      if (childText) {
        labelCandidates.push({ text: childText, confidence: 0.65 });
      }
    }
  }

  // Strategy 10: Look for a wrapper div with a dedicated text node before the field
  if (parent) {
    // Get all text nodes directly inside the parent
    const textNodes: Text[] = [];
    for (let i = 0; i < parent.childNodes.length; i++) {
      const node = parent.childNodes[i];
      if (node.nodeType === Node.TEXT_NODE && node.textContent?.trim()) {
        textNodes.push(node as Text);
      }
    }

    // Check if there's a text node before the element
    for (const textNode of textNodes) {
      if (parent.compareDocumentPosition(textNode) & Node.DOCUMENT_POSITION_PRECEDING) {
        const text = textNode.textContent?.trim() || "";
        if (text) {
          labelCandidates.push({ text, confidence: 0.6 });
        }
      }
    }

    // Strategy 11: Check parent classes for form-group patterns
    if (
      parent.classList.contains("form-group") ||
      parent.classList.contains("field-group") ||
      parent.classList.contains("input-group")
    ) {
      // Look for common label elements within this parent
      const labelElements = Array.from(parent.querySelectorAll("label, .field-label, .input-label, .form-label"));
      for (const labelEl of labelElements) {
        if (!element.contains(labelEl)) {
          // Ensure we're not getting a child of our input
          const labelText = labelEl.textContent?.trim() || "";
          if (labelText) {
            labelCandidates.push({ text: labelText, confidence: 0.75 });
          }
        }
      }
    }
  }

  // If we still don't have candidates, look for fieldset legend
  if (labelCandidates.length === 0) {
    const fieldset = element.closest("fieldset");
    if (fieldset) {
      const legend = fieldset.querySelector("legend");
      if (legend) {
        const legendText = legend.textContent?.trim() || "";
        if (legendText) {
          labelCandidates.push({ text: legendText, confidence: 0.6 });
        }
      }
    }
  }

  // Sort candidates by confidence score (highest first)
  labelCandidates.sort((a, b) => b.confidence - a.confidence);

  // Return the highest confidence candidate, or empty string if none found
  return labelCandidates.length > 0 ? labelCandidates[0].text : "";
};

export const getFieldDescription = (element: HTMLElement): string => {
  let description = element.getAttribute("aria-describedby") || element.getAttribute("data-description") || "";

  if (description) {
    const descElement = document.getElementById(description);
    if (descElement) {
      description = descElement.textContent?.trim() || "";
    }
  } else {
    const parent = element.parentElement;
    if (parent) {
      const siblingDesc = parent.querySelector(".description, .help-text, .hint, .form-text, .form-hint, .field-hint");
      if (siblingDesc) {
        description = siblingDesc.textContent?.trim() || "";
      }
    }
  }

  return description;
};
