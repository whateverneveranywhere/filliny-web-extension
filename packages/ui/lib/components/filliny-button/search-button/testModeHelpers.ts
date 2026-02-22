import { generateTestFilesForAcceptTypes, parseAcceptTypes } from './field-types/file';
import { updateFormFields } from './fieldUpdaterHelpers';
import { FieldTypeEnum } from '@extension/shared';
import type { Field, FileUploadData } from '@extension/shared';

/**
 * Generate test file based on field metadata and accept types
 */
const generateTestFileForField = (field: Field): string | string[] => {
  // First, try to get accept types from field metadata
  const fileUploadData = (field.metadata as { fileUploadData?: FileUploadData })?.fileUploadData;
  const acceptTypes = fileUploadData?.acceptedTypes || [];
  const isMultiple = fileUploadData?.fileInput?.multiple || false;

  // If we have accept types, generate appropriate files
  if (acceptTypes.length > 0) {
    const testFiles = generateTestFilesForAcceptTypes(acceptTypes, isMultiple);
    return isMultiple ? testFiles : testFiles[0];
  }

  // Try to check if there's an element in the DOM to inspect
  const element = document.querySelector<HTMLInputElement>(`[data-filliny-id="${field.id}"]`);
  if (element) {
    const acceptAttr = element.getAttribute('accept');
    if (acceptAttr) {
      const parsedTypes = parseAcceptTypes(acceptAttr);
      const testFiles = generateTestFilesForAcceptTypes(parsedTypes, element.multiple);
      return element.multiple ? testFiles : testFiles[0];
    }

    // Check if multiple attribute exists
    if (element.multiple && !isMultiple) {
      return ['test-document.pdf', 'test-image.jpg', 'test-spreadsheet.xlsx'];
    }
  }

  // Fallback to PDF for single files
  return 'test-document.pdf';
};

/**
 * Generate appropriate test values for different field types
 * This is used by both form-level and field-level test mode filling
 */
export const generateTestValue = (field: Field): string | string[] => {
  const now = new Date();
  const type = field.type;

  switch (type) {
    // Basic input types
    case FieldTypeEnum.TEXT:
      // Use label-based intelligent values when available
      if (field.label) {
        const label = field.label.toLowerCase();
        const name = field.name?.toLowerCase() || '';

        // Personal info fields
        if (label.includes('name') || name.includes('name')) {
          if (label.includes('first') || label.includes('given') || name.includes('first') || name.includes('given')) {
            return 'John';
          }
          if (label.includes('last') || label.includes('family') || name.includes('last') || name.includes('surname')) {
            return 'Doe';
          }
          if (label.includes('full') || label.includes('display')) {
            return 'John Doe';
          }
          return 'John Doe';
        }

        // Address fields
        if (label.includes('address') || name.includes('address')) {
          if (label.includes('line 1') || label.includes('line1')) {
            return '123 Main St';
          }
          if (label.includes('line 2') || label.includes('line2')) {
            return 'Apt 4B';
          }
          return '123 Main St';
        }

        if (label.includes('city') || name.includes('city')) {
          return 'New York';
        }

        if (label.includes('state') || name.includes('state')) {
          return 'NY';
        }

        if (label.includes('zip') || label.includes('postal') || name.includes('zip') || name.includes('postal')) {
          return '10001';
        }

        if (label.includes('country') || name.includes('country')) {
          return 'USA';
        }

        // Credit card fields
        if (label.includes('card') || name.includes('card')) {
          if (label.includes('number') || name.includes('number') || name.includes('num')) {
            return '4111111111111111';
          }
          if (label.includes('cvv') || label.includes('cvc') || name.includes('cvv') || name.includes('cvc')) {
            return '123';
          }
          if (label.includes('name')) {
            return 'John Doe';
          }
        }

        // Phone fields
        if (label.includes('phone') || name.includes('phone')) {
          return '+1-555-0123';
        }
      }

      return 'Test input';

    case FieldTypeEnum.PASSWORD:
      return 'P@ssw0rd123';

    case FieldTypeEnum.EMAIL:
      return 'test@example.com';

    case FieldTypeEnum.TEL:
      return '+1-555-0123';

    case FieldTypeEnum.URL:
      return 'https://example.com';

    case FieldTypeEnum.SEARCH:
      return 'search query';

    // Date and time inputs
    case FieldTypeEnum.DATE:
      return now.toISOString().split('T')[0];

    case FieldTypeEnum.DATETIME_LOCAL:
      return now.toISOString().slice(0, 16);

    case FieldTypeEnum.MONTH:
      return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

    case FieldTypeEnum.WEEK: {
      const weekNum = Math.ceil((now.getDate() + 6) / 7);
      return `${now.getFullYear()}-W${String(weekNum).padStart(2, '0')}`;
    }

    case FieldTypeEnum.TIME:
      return `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

    // Numeric inputs
    case FieldTypeEnum.NUMBER:
    case FieldTypeEnum.RANGE: {
      const min = field.validation?.min ?? 0;
      const max = field.validation?.max ?? 100;
      const step = field.validation?.step ?? 1;
      return String(Math.floor((max - min) / step) * step + min);
    }

    // Color input
    case FieldTypeEnum.COLOR:
      return '#FF0000';

    // Complex input types
    case FieldTypeEnum.FILE:
      return generateTestFileForField(field);

    case FieldTypeEnum.CHECKBOX: {
      // If this is a checkbox group, return array of values
      if (field.options && field.options.length > 1) {
        // Select 1-2 random options for checkbox groups
        const numToSelect = Math.min(Math.ceil(Math.random() * 2), field.options.length);
        const shuffled = [...field.options].sort(() => 0.5 - Math.random());
        return shuffled.slice(0, numToSelect).map(opt => opt.value);
      }

      // For single checkbox, return random for test mode
      return Math.random() > 0.5 ? 'true' : 'false';
    }

    case FieldTypeEnum.RADIO: {
      if (field.options?.length) {
        // For radio groups, prefer non-placeholder options
        const nonPlaceholders = field.options.filter(opt => {
          const text = opt.text.toLowerCase();
          return !text.includes('select') && !text.includes('choose') && !text.includes('pick') && text !== '';
        });

        if (nonPlaceholders.length > 0) {
          // Pick a random valid option for better testing variety
          const randomIndex = Math.floor(Math.random() * nonPlaceholders.length);
          return nonPlaceholders[randomIndex].value;
        }

        // Fallback to first option
        return field.options[0].value;
      }
      return 'true';
    }

    case FieldTypeEnum.SELECT: {
      if (!field.options?.length) return '';

      // Check for a select element to examine options and determine if multi-select
      const element = document.querySelector<HTMLElement>(`[data-filliny-id="${field.id}"]`);
      const isMultiple = element instanceof HTMLSelectElement ? element.multiple : false;

      // Skip placeholder options
      const nonPlaceholders = field.options.filter(opt => {
        const text = opt.text.toLowerCase();
        return (
          !text.includes('select') &&
          !text.includes('choose') &&
          !text.includes('pick') &&
          text !== '' &&
          opt.value !== ''
        );
      });

      if (nonPlaceholders.length > 0) {
        if (isMultiple) {
          // For multi-select, return array of 1-2 values
          const numToSelect = Math.min(1 + Math.floor(Math.random() * 2), nonPlaceholders.length);
          const shuffled = [...nonPlaceholders].sort(() => 0.5 - Math.random());
          return shuffled.slice(0, numToSelect).map(opt => opt.value);
        } else {
          // For single select, pick a random valid option
          const selectedIndex = Math.floor(Math.random() * nonPlaceholders.length);
          return nonPlaceholders[selectedIndex].value;
        }
      }

      // Fallback
      if (field.options.length > 0) {
        return isMultiple ? [field.options[0].value] : field.options[0].value;
      }

      // Last resort fallback
      return isMultiple ? ['option1'] : 'option1';
    }

    case FieldTypeEnum.TEXTAREA:
      // Provide a longer multi-line sample for textareas to ensure they visibly update
      return `This is a sample textarea content for testing purposes.\nThis form field supports multiple lines of text.\nFeel free to edit this example text.`;

    case FieldTypeEnum.BUTTON:
      return 'Click me';

    case FieldTypeEnum.FIELDSET:
      return '';

    default:
      return 'Sample test value';
  }
};

/**
 * Prepare a field for test mode by adding testValue
 */
export const prepareFieldForTestMode = (field: Field): Field => {
  // Generate a test value based on the field type
  const testValue = generateTestValue(field);

  // Return a new field object with the testValue set
  return {
    ...field,
    // Set both value and testValue to ensure consistent behavior
    value: testValue,
    testValue: testValue,
  };
};

/**
 * Main function to handle test mode filling for one or more fields
 */
export const runTestModeFill = async (fields: Field[]): Promise<void> => {
  if (!fields.length) {
    console.warn('No fields provided for test mode fill.');
    return;
  }

  console.log(`Starting test mode fill for ${fields.length} fields.`);

  // Prepare all fields with test values
  const fieldsWithTestValues = fields.map(prepareFieldForTestMode);

  // Log the generated values for debugging
  console.log(
    'Test mode: Values generated:',
    fieldsWithTestValues.map(f => ({ id: f.id, type: f.type, value: f.value })),
  );

  try {
    // Update the fields on the form
    await updateFormFields(fieldsWithTestValues, true);
    console.log('Test mode fill completed successfully.');
  } catch (error) {
    console.error('Error during test mode fill:', error);
    // Dynamic import to avoid circular dependency
    import('./toastHelpers').then(({ showFillErrorToast }) => {
      showFillErrorToast('Test mode failed to update fields. Please check the console for details.');
    });
  }
};
