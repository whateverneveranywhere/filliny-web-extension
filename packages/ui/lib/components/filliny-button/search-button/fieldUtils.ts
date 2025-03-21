export const getFieldLabel = (element: HTMLElement): string => {
  let label = "";

  if (element.id) {
    const labelElement = document.querySelector(`label[for="${element.id}"]`);
    if (labelElement) {
      label = labelElement.textContent?.trim() || "";
    }
  }

  if (!label) {
    const parentLabel = element.closest("label");
    if (parentLabel) {
      label = parentLabel.textContent?.trim() || "";
    }
  }

  return label;
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
      const siblingDesc = parent.querySelector(".description, .help-text, .hint");
      if (siblingDesc) {
        description = siblingDesc.textContent?.trim() || "";
      }
    }
  }

  return description;
};
