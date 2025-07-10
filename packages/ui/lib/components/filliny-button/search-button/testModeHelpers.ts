import { updateFormFields } from "./fieldUpdaterHelpers";
import type { AcceptType, Field, FileUploadData } from "@extension/shared";

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
    const acceptAttr = element.getAttribute("accept");
    if (acceptAttr) {
      const parsedTypes = parseAcceptAttribute(acceptAttr);
      const testFiles = generateTestFilesForAcceptTypes(parsedTypes, element.multiple);
      return element.multiple ? testFiles : testFiles[0];
    }

    // Check if multiple attribute exists
    if (element.multiple && !isMultiple) {
      return ["test-document.pdf", "test-image.jpg", "test-spreadsheet.xlsx"];
    }
  }

  // Fallback to PDF for single files
  return "test-document.pdf";
};

/**
 * Generate test files based on accept types
 */
const generateTestFilesForAcceptTypes = (acceptTypes: AcceptType[], isMultiple: boolean = false): string[] => {
  const testFiles: string[] = [];

  // Sample filenames by category
  const categorySamples: Record<AcceptType["category"], string[]> = {
    image: ["test-photo.jpg", "test-image.png", "test-graphic.svg"],
    document: ["test-document.pdf", "test-report.docx", "test-spreadsheet.xlsx"],
    video: ["test-video.mp4", "test-clip.mov", "test-recording.webm"],
    audio: ["test-audio.mp3", "test-song.wav", "test-recording.ogg"],
    archive: ["test-archive.zip", "test-backup.tar.gz", "test-files.rar"],
    text: ["test-notes.txt", "test-data.csv", "test-config.json"],
    other: ["test-file.bin", "test-data.dat"],
  };

  // Group accept types by category
  const categories = acceptTypes.reduce(
    (acc, type) => {
      if (!acc[type.category]) {
        acc[type.category] = [];
      }
      acc[type.category].push(type);
      return acc;
    },
    {} as Record<AcceptType["category"], AcceptType[]>,
  );

  // Generate test files for each category
  for (const [category, types] of Object.entries(categories)) {
    const samples = categorySamples[category as AcceptType["category"]] || ["test-file.txt"];

    // If specific extensions are specified, use them
    const extensionTypes = types.filter(t => t.type === "extension");
    if (extensionTypes.length > 0) {
      for (const extType of extensionTypes) {
        testFiles.push(`test-${category}.${extType.value}`);
        if (isMultiple && testFiles.length < 3) {
          testFiles.push(`test-${category}-2.${extType.value}`);
        }
      }
    } else {
      // Use default samples for the category
      testFiles.push(...samples.slice(0, isMultiple ? 2 : 1));
    }
  }

  // Add default files if nothing matched
  if (testFiles.length === 0) {
    testFiles.push("test-document.pdf");
    if (isMultiple) {
      testFiles.push("test-image.jpg", "test-data.xlsx");
    }
  }

  // Remove duplicates and limit to reasonable number
  const uniqueFiles = [...new Set(testFiles)];
  return isMultiple ? uniqueFiles.slice(0, 3) : [uniqueFiles[0]];
};

/**
 * Parse accept attribute value into structured accept types
 */
const parseAcceptAttribute = (acceptValue: string): AcceptType[] => {
  if (!acceptValue || acceptValue.trim() === "") {
    return [];
  }

  return acceptValue
    .split(",")
    .map(item => item.trim())
    .filter(item => item !== "")
    .map(item => {
      const trimmed = item.trim();

      if (trimmed.startsWith(".")) {
        // File extension
        const extension = trimmed.substring(1).toLowerCase();
        return {
          type: "extension" as const,
          value: extension,
          category: categorizeFileType(extension),
        };
      } else {
        // MIME type
        const mimeType = trimmed.toLowerCase();
        return {
          type: "mime" as const,
          value: mimeType,
          category: categorizeMimeType(mimeType),
        };
      }
    });
};

/**
 * Categorize file type by extension
 */
const categorizeFileType = (extension: string): AcceptType["category"] => {
  const imageExts = ["jpg", "jpeg", "png", "gif", "bmp", "webp", "svg", "ico", "tiff", "tif", "heic", "heif"];
  const documentExts = ["pdf", "doc", "docx", "xls", "xlsx", "ppt", "pptx", "odt", "ods", "odp", "rtf"];
  const audioExts = ["mp3", "wav", "ogg", "flac", "aac", "wma", "m4a"];
  const videoExts = ["mp4", "avi", "mov", "wmv", "flv", "webm", "mkv", "m4v"];
  const archiveExts = ["zip", "rar", "tar", "gz", "7z", "bz2"];
  const textExts = ["txt", "csv", "json", "xml", "html", "htm", "css", "js", "ts", "md", "yaml", "yml"];

  if (imageExts.includes(extension)) return "image";
  if (documentExts.includes(extension)) return "document";
  if (audioExts.includes(extension)) return "audio";
  if (videoExts.includes(extension)) return "video";
  if (archiveExts.includes(extension)) return "archive";
  if (textExts.includes(extension)) return "text";
  return "other";
};

/**
 * Categorize MIME type
 */
const categorizeMimeType = (mimeType: string): AcceptType["category"] => {
  if (mimeType.startsWith("image/")) return "image";
  if (mimeType.startsWith("audio/")) return "audio";
  if (mimeType.startsWith("video/")) return "video";
  if (mimeType.startsWith("text/")) return "text";
  if (
    mimeType.includes("pdf") ||
    mimeType.includes("document") ||
    mimeType.includes("spreadsheet") ||
    mimeType.includes("presentation")
  )
    return "document";
  if (mimeType.includes("zip") || mimeType.includes("compressed")) return "archive";
  return "other";
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
    case "text":
      // Use label-based intelligent values when available
      if (field.label) {
        const label = field.label.toLowerCase();
        const name = field.name?.toLowerCase() || "";

        // Personal info fields
        if (label.includes("name") || name.includes("name")) {
          if (label.includes("first") || label.includes("given") || name.includes("first") || name.includes("given")) {
            return "John";
          }
          if (label.includes("last") || label.includes("family") || name.includes("last") || name.includes("surname")) {
            return "Doe";
          }
          if (label.includes("full") || label.includes("display")) {
            return "John Doe";
          }
          return "John Doe";
        }

        // Address fields
        if (label.includes("address") || name.includes("address")) {
          if (label.includes("line 1") || label.includes("line1")) {
            return "123 Main St";
          }
          if (label.includes("line 2") || label.includes("line2")) {
            return "Apt 4B";
          }
          return "123 Main St";
        }

        if (label.includes("city") || name.includes("city")) {
          return "New York";
        }

        if (label.includes("state") || name.includes("state")) {
          return "NY";
        }

        if (label.includes("zip") || label.includes("postal") || name.includes("zip") || name.includes("postal")) {
          return "10001";
        }

        if (label.includes("country") || name.includes("country")) {
          return "USA";
        }

        // Credit card fields
        if (label.includes("card") || name.includes("card")) {
          if (label.includes("number") || name.includes("number") || name.includes("num")) {
            return "4111111111111111";
          }
          if (label.includes("cvv") || label.includes("cvc") || name.includes("cvv") || name.includes("cvc")) {
            return "123";
          }
          if (label.includes("name")) {
            return "John Doe";
          }
        }

        // Phone fields
        if (label.includes("phone") || name.includes("phone")) {
          return "+1-555-0123";
        }
      }

      return "Test input";

    case "password":
      return "P@ssw0rd123";

    case "email":
      return "test@example.com";

    case "tel":
      return "+1-555-0123";

    case "url":
      return "https://example.com";

    case "search":
      return "search query";

    // Date and time inputs
    case "date":
      return now.toISOString().split("T")[0];

    case "datetime-local":
      return now.toISOString().slice(0, 16);

    case "month":
      return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;

    case "week": {
      const weekNum = Math.ceil((now.getDate() + 6) / 7);
      return `${now.getFullYear()}-W${String(weekNum).padStart(2, "0")}`;
    }

    case "time":
      return `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;

    // Numeric inputs
    case "number":
    case "range": {
      const min = field.validation?.min ?? 0;
      const max = field.validation?.max ?? 100;
      const step = field.validation?.step ?? 1;
      return String(Math.floor((max - min) / step) * step + min);
    }

    // Color input
    case "color":
      return "#FF0000";

    // Complex input types
    case "file":
      return generateTestFileForField(field);

    case "checkbox": {
      // If this is a checkbox group, return array of values
      if (field.options && field.options.length > 1) {
        // Select 1-2 random options for checkbox groups
        const numToSelect = Math.min(Math.ceil(Math.random() * 2), field.options.length);
        const shuffled = [...field.options].sort(() => 0.5 - Math.random());
        return shuffled.slice(0, numToSelect).map(opt => opt.value);
      }

      // For single checkbox, return random for test mode
      return Math.random() > 0.5 ? "true" : "false";
    }

    case "radio": {
      if (field.options?.length) {
        // For radio groups, prefer non-placeholder options
        const nonPlaceholders = field.options.filter(opt => {
          const text = opt.text.toLowerCase();
          return !text.includes("select") && !text.includes("choose") && !text.includes("pick") && text !== "";
        });

        if (nonPlaceholders.length > 0) {
          // Pick a random valid option for better testing variety
          const randomIndex = Math.floor(Math.random() * nonPlaceholders.length);
          return nonPlaceholders[randomIndex].value;
        }

        // Fallback to first option
        return field.options[0].value;
      }
      return "true";
    }

    case "select": {
      if (!field.options?.length) return "";

      // Check for a select element to examine options and determine if multi-select
      const element = document.querySelector<HTMLElement>(`[data-filliny-id="${field.id}"]`);
      const isMultiple = element instanceof HTMLSelectElement ? element.multiple : false;

      // Skip placeholder options
      const nonPlaceholders = field.options.filter(opt => {
        const text = opt.text.toLowerCase();
        return (
          !text.includes("select") &&
          !text.includes("choose") &&
          !text.includes("pick") &&
          text !== "" &&
          opt.value !== ""
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
      return isMultiple ? ["option1"] : "option1";
    }

    case "textarea":
      // Provide a longer multi-line sample for textareas to ensure they visibly update
      return `This is a sample textarea content for testing purposes.\nThis form field supports multiple lines of text.\nFeel free to edit this example text.`;

    case "button":
      return "Click me";

    case "fieldset":
      return "";

    default:
      return "Sample test value";
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
    console.warn("No fields provided for test mode fill.");
    return;
  }

  console.log(`Starting test mode fill for ${fields.length} fields.`);
  showTestModeIndicator();

  // Prepare all fields with test values
  const fieldsWithTestValues = fields.map(prepareFieldForTestMode);

  // Log the generated values for debugging
  console.log(
    "Test mode: Values generated:",
    fieldsWithTestValues.map(f => ({ id: f.id, type: f.type, value: f.value })),
  );

  try {
    // Update the fields on the form
    await updateFormFields(fieldsWithTestValues, true);
    console.log("Test mode fill completed successfully.");
  } catch (error) {
    console.error("Error during test mode fill:", error);
    alert("Test mode failed to update fields. See console for details.");
  }
};

/**
 * Add visual test mode indicators to the page
 */
export const showTestModeIndicator = (): void => {
  try {
    const existingIndicator = document.getElementById("filliny-test-mode-indicator");
    if (existingIndicator) {
      existingIndicator.remove();
    }

    // Create a visual indicator for test mode
    const testModeIndicator = document.createElement("div");
    testModeIndicator.id = "filliny-test-mode-indicator";
    testModeIndicator.textContent = "Test Mode Active";
    testModeIndicator.style.cssText =
      "position: fixed; top: 20px; right: 20px; background: #ca8a04; color: white; padding: 8px 16px; border-radius: 4px; z-index: 10000000; font-weight: bold; box-shadow: 0 2px 5px rgba(0,0,0,0.2);";
    document.body.appendChild(testModeIndicator);

    // Remove the indicator after 3 seconds
    setTimeout(() => {
      try {
        testModeIndicator.remove();
      } catch (removeError) {
        console.debug("Error removing test mode indicator:", removeError);
      }
    }, 3000);
  } catch (error) {
    console.debug("Error showing test mode indicator:", error);
  }
};
