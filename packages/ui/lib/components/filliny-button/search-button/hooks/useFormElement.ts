import { useEffect, useRef } from 'react';

/**
 * Counts the number of form fields within an element
 */
const countFormFields = (element: HTMLElement): number => {
  const selectors = [
    'input:not([type="hidden"]):not([type="submit"]):not([type="button"]):not([type="reset"])',
    'select',
    'textarea',
    '[role="textbox"]',
    '[role="combobox"]',
    '[role="checkbox"]',
    '[role="radio"]',
  ];

  let count = 0;
  selectors.forEach(selector => {
    try {
      count += element.querySelectorAll(selector).length;
    } catch {
      // Continue if selector fails
    }
  });

  return count;
};

/**
 * Finds the outermost container that contains the most form fields
 */
const findOutermostContainer = (element: HTMLElement): HTMLElement => {
  let bestContainer = element;
  let maxFieldCount = countFormFields(element);

  let parent = element.parentElement;
  while (parent && parent !== document.body && parent !== document.documentElement) {
    const parentFieldCount = countFormFields(parent);

    // If parent has more fields, use it
    if (parentFieldCount > maxFieldCount * 1.1) {
      bestContainer = parent;
      maxFieldCount = parentFieldCount;
    }

    parent = parent.parentElement;
  }

  console.log(
    `useFormElement: Using container with ${maxFieldCount} fields: ${bestContainer.tagName}${bestContainer.className ? '.' + bestContainer.className : ''}`,
  );
  return bestContainer;
};

/**
 * Finds the form element by formId using multiple strategies
 */
const findFormElement = (formId: string): HTMLElement | null => {
  // Try multiple strategies to find the form element
  const strategies = [
    () => document.querySelector(`form[data-form-id="${formId}"]`) as HTMLElement,
    () => document.querySelector(`[data-filliny-form-container][data-form-id="${formId}"]`) as HTMLElement,
    () => document.querySelector(`[data-form-id="${formId}"]`) as HTMLElement,
    // Add new strategies for unified form
    () => document.querySelector(`[data-filliny-unified-form="true"]`) as HTMLElement,
    () => document.querySelector(`[data-filliny-primary-form="true"]`) as HTMLElement,
  ];

  for (const strategy of strategies) {
    const element = strategy();
    if (element) {
      console.log(`useFormElement: Found form element using strategy`);
      return findOutermostContainer(element);
    }
  }

  // Special handling for unified form scenario
  if (formId === 'unified-form') {
    // Try to find any element that's part of the unified form group
    const unifiedFormMember = document.querySelector('[data-filliny-unified-form-member="unified-form"]');
    if (unifiedFormMember && unifiedFormMember instanceof HTMLElement) {
      console.log(`useFormElement: Found unified form member`);
      return findOutermostContainer(unifiedFormMember);
    }

    // Last resort: try to find any form with overlay active
    const activeOverlayForm = document.querySelector('[data-filliny-overlay-active="true"]');
    if (activeOverlayForm && activeOverlayForm instanceof HTMLElement) {
      console.log(`useFormElement: Found form with active overlay`);
      return findOutermostContainer(activeOverlayForm);
    }
  }

  // Fallback: look for any form-like container and pick the largest
  const fallbackElements = document.querySelectorAll<HTMLElement>(
    'form, [data-filliny-form-container], [role="form"], [data-form], .form, .form-container',
  );

  if (fallbackElements.length > 0) {
    console.log(`useFormElement: Using fallback form detection`);
    // Return the largest element (most likely to be the main form)
    const largestElement = Array.from(fallbackElements).reduce((largest, current) => {
      const largestRect = largest.getBoundingClientRect();
      const currentRect = current.getBoundingClientRect();
      return currentRect.width * currentRect.height > largestRect.width * largestRect.height ? current : largest;
    });

    return findOutermostContainer(largestElement);
  }

  return null;
};

/**
 * Scrolls the page to bring the form into view
 */
const scrollToForm = (formElement: HTMLElement | null): void => {
  if (!formElement) return;

  const formRect = formElement.getBoundingClientRect();
  const viewportHeight = window.innerHeight;
  const isFormVisible = formRect.bottom > 0 && formRect.top < viewportHeight && formRect.height > 0;

  if (!isFormVisible) {
    const scrollPosition = window.scrollY + formRect.top - 100;
    window.scrollTo({
      top: Math.max(0, scrollPosition),
      behavior: 'smooth',
    });
  }
};

interface UseFormElementReturn {
  formRef: React.MutableRefObject<HTMLElement | null>;
  scrollToForm: () => void;
}

/**
 * Custom hook to find and track a form element by its ID
 * Separates form element finding logic from component rendering
 */
export const useFormElement = (formId: string): UseFormElementReturn => {
  const formRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    const form = findFormElement(formId);
    if (!form) {
      console.error(`useFormElement: Could not find form element for ID: ${formId}`);
      return;
    }

    formRef.current = form;
    console.log(`useFormElement: Monitoring form: ${form.tagName}${form.className ? '.' + form.className : ''}`);
  }, [formId]);

  const handleScrollToForm = () => scrollToForm(formRef.current);

  return {
    formRef,
    scrollToForm: handleScrollToForm,
  };
};

export { findFormElement, scrollToForm, countFormFields, findOutermostContainer };
