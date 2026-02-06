/**
 * Universal form element selectors with confidence scoring
 * Each selector has a confidence score indicating reliability
 *
 * Refactored to use enum-based patterns and builder functions
 * for better type safety and reduced duplication.
 */

/**
 * Confidence levels for selector reliability
 */
enum SelectorConfidence {
  HIGHEST = 0.95,
  HIGH = 0.9,
  MEDIUM_HIGH = 0.85,
  MEDIUM = 0.8,
  MEDIUM_LOW = 0.75,
  LOW = 0.7,
  LOWER = 0.65,
  LOWEST = 0.6,
  MINIMAL = 0.55,
  VERY_LOW = 0.5,
}

/**
 * Selector with confidence scoring interface
 */
interface SelectorWithConfidence {
  selector: string;
  confidence: number;
  description: string;
}

/**
 * Builder function to create selector with confidence
 * Reduces duplication and ensures consistent structure
 */
const createSelector = (
  selector: string,
  confidence: SelectorConfidence | number,
  description: string,
): SelectorWithConfidence => ({
  selector,
  confidence,
  description,
});

/**
 * Selector categories organized by type
 */
const SELECTOR_CATEGORIES = {
  // Standard HTML form elements
  STANDARD_HTML: [
    'input:not([type="hidden"]):not([type="submit"]):not([type="button"]):not([type="reset"]):not([type="image"])',
    'select',
    'textarea',
    'input[type="file"]',
  ],

  // ARIA role-based selectors
  ARIA_ROLES: [
    '[role="textbox"]',
    '[role="combobox"]',
    '[role="spinbutton"]',
    '[role="checkbox"]',
    '[role="switch"]',
    '[role="radio"]',
    '[role="searchbox"]',
    '[role="listbox"]',
    '[role="slider"]',
  ],

  // Content editable patterns
  CONTENT_EDITABLE: ['[contenteditable="true"]', '[contenteditable=""]'],

  // File upload related selectors
  FILE_UPLOAD: ['[accept]', '[data-file-upload]', '[data-upload]', '[class*="dropzone"]', '[class*="file-drop"]'],

  // Data attribute patterns
  DATA_ATTRIBUTES: [
    '[data-field]',
    '[data-input]',
    '[data-form-field]',
    '[data-form-control]',
    '[data-field-type="file"]',
    '[data-field-type="upload"]',
    '[data-input-type="file"]',
  ],

  // Test ID patterns
  TEST_IDS: [
    '[data-testid*="input"]',
    '[data-testid*="field"]',
    '[data-testid*="select"]',
    '[data-cy*="input"]',
    '[data-cy*="field"]',
  ],

  // ARIA accessibility attributes
  ARIA_ATTRIBUTES: ['[aria-required="true"]', '[aria-invalid]', '[aria-describedby]', '[aria-labelledby]'],

  // Event handler attributes
  EVENT_HANDLERS: ['[onfocus]', '[onchange]', '[oninput]'],
} as const;

/**
 * Framework-specific selector configurations
 */
const FRAMEWORK_SELECTORS = {
  // Material-UI (MUI)
  MATERIAL_UI: {
    inputs: ['.MuiTextField-root input', '.MuiTextField-root textarea', '.MuiInputBase-input'],
    selects: ['.MuiSelect-root', '.MuiSelect-select'],
    checkboxes: ['.MuiCheckbox-root input', '.MuiRadio-root input'],
    autocomplete: ['.MuiAutocomplete-input'],
  },

  // Ant Design
  ANT_DESIGN: {
    inputs: ['.ant-input', '.ant-input-number-input'],
    selects: ['.ant-select', '.ant-select-selector'],
    checkboxes: ['.ant-checkbox-input', '.ant-radio-input'],
    uploads: ['.ant-upload'],
    datePickers: ['.ant-picker-input input'],
  },

  // Chakra UI
  CHAKRA_UI: {
    inputs: ['.chakra-input', '.chakra-numberinput__field'],
    selects: ['.chakra-select'],
    checkboxes: ['.chakra-checkbox__input', '.chakra-radio__input'],
    switches: ['.chakra-switch__input'],
  },

  // Bootstrap
  BOOTSTRAP: {
    inputs: ['.form-control', '.form-input'],
    selects: ['.form-select'],
    checkboxes: ['.form-check-input'],
    ranges: ['.form-range'],
    fields: ['.form-field', '.input-field', '.text-field'],
  },

  // Headless UI
  HEADLESS_UI: {
    components: [
      '[data-headlessui-state]',
      '[data-headlessui-focus-guard]',
      '[data-headless-combobox-input]',
      '[data-headless-listbox-button]',
      '[data-headless-switch]',
    ],
  },

  // Radix UI
  RADIX_UI: {
    components: [
      '[data-radix-slot]',
      '[data-radix-collection-item]',
      '[data-radix-checkbox-indicator]',
      '[data-radix-radio-item]',
      '[data-radix-select-trigger]',
      '[data-radix-select-viewport]',
      '[data-radix-switch-thumb]',
    ],
  },

  // Svelte
  SVELTE: {
    components: [
      '[data-svelte-component*="input"]',
      '[data-svelte-component*="select"]',
      '[data-svelte-component*="checkbox"]',
      '[data-svelte-component*="field"]',
      '[data-sveltekit-form]',
      '.svelte-input',
      '.svelte-select',
    ],
  },

  // Alpine.js
  ALPINE: {
    components: ['[x-data]', '[x-model]', '[x-bind]', '[x-on]', '[@click]', '[@input]', '[@change]'],
  },

  // HTMX
  HTMX: {
    components: [
      '[hx-post]',
      '[hx-get]',
      '[hx-put]',
      '[hx-delete]',
      '[hx-patch]',
      '[hx-trigger]',
      '[hx-target]',
      '[hx-swap]',
    ],
  },

  // Knockout.js
  KNOCKOUT: {
    components: ['[data-bind]', '[data-bind*="value"]', '[data-bind*="checked"]', '[data-bind*="textInput"]'],
  },

  // Date Pickers
  DATE_PICKERS: {
    flatpickr: ['.flatpickr-input', '[data-flatpickr]'],
    reactDatePicker: ['.react-datepicker__input-container input', '.react-datepicker-wrapper input'],
    muiDatePicker: ['.MuiDatePicker-root input', '.MuiDateTimePicker-root input'],
    antDatePicker: ['.ant-picker-input input', '.ant-picker'],
    pikaday: ['.pika-single input', '[data-pikaday]'],
  },

  // Phone Widgets
  PHONE_WIDGETS: {
    intlTelInput: ['.iti input', '.iti__tel-input', '[data-intl-tel-input]'],
    reactPhoneInput: ['.react-tel-input input', '.phone-input input'],
  },

  // OTP / Verification Code Inputs
  OTP_INPUTS: {
    components: [
      '[autocomplete="one-time-code"]',
      '[inputmode="numeric"][maxlength="1"]',
      '[class*="otp"]',
      '[class*="verification-code"]',
      '[class*="pin-input"]',
      '[data-otp-input]',
    ],
  },

  // Vuetify / Element Plus / Quasar
  VUETIFY: {
    inputs: ['.v-text-field input', '.v-textarea textarea', '.v-field input'],
    selects: ['.v-select', '.v-autocomplete'],
    checkboxes: ['.v-checkbox input', '.v-radio input', '.v-switch input'],
  },

  ELEMENT_PLUS: {
    inputs: ['.el-input__inner', '.el-textarea__inner'],
    selects: ['.el-select', '.el-select__input'],
    checkboxes: ['.el-checkbox__input', '.el-radio__input'],
  },

  QUASAR: {
    inputs: ['.q-field__native', '.q-input input'],
    selects: ['.q-select', '.q-select__input'],
    checkboxes: ['.q-checkbox__inner', '.q-radio__inner', '.q-toggle__inner'],
  },

  // Rich Text Editors
  RICH_TEXT_EDITORS: {
    ckeditor: ['.ck-editor__editable', '.ck-editor__editable_inline', '.cke_editable'],
    tinymce: ['.mce-tinymce', '.mce-content-body', '.tox-tinymce', '[data-mce-placeholder]'],
    quill: ['.ql-editor', '.ql-container', '[data-quill]'],
    prosemirror: ['.ProseMirror', '[data-prosemirror]'],
    draftjs: ['.public-DraftEditor-content', '.DraftEditor-root'],
    froala: ['.fr-element', '.fr-wrapper'],
    slate: ['[data-slate-editor]', '[data-slate-node]'],
  },
} as const;

/**
 * CSS class patterns for generic form elements
 */
const CSS_CLASS_PATTERNS = {
  UPLOAD: ['[class*="upload"]', '[class*="file"]', '[class*="attach"]', '[class*="dropzone"]'],
  FIELD: ['[class*="field"]', '[class*="input"]', '[class*="control"]'],
  FORM: ['[class*="form-"]', '[class*="-form"]'],
} as const;

// ============================================================================
// SELECTOR BUILDERS - Functions to create selectors with consistent patterns
// ============================================================================

/**
 * Create button selectors with role attribute
 */
const createButtonWithRoleSelector = (classPattern: string, confidence: SelectorConfidence): SelectorWithConfidence =>
  createSelector(`[class*="${classPattern}"][role="button"]`, confidence, `${classPattern} buttons with ARIA role`);

/**
 * Create button element selectors
 */
const createButtonSelector = (classPattern: string, confidence: SelectorConfidence): SelectorWithConfidence =>
  createSelector(`button[class*="${classPattern}"]`, confidence, `${classPattern} buttons`);

/**
 * Create framework input selectors
 */
const createFrameworkSelectors = (
  framework: string,
  selectors: readonly string[],
  confidence: SelectorConfidence,
): SelectorWithConfidence[] =>
  selectors.map(selector => createSelector(selector, confidence, `${framework} component`));

// ============================================================================
// UNIVERSAL FORM SELECTORS - Main export with all selectors
// ============================================================================

/**
 * Create universal form element selectors with confidence scoring
 * Selectors are ordered by confidence level for optimal matching
 */
const UNIVERSAL_FORM_SELECTORS: SelectorWithConfidence[] = [
  // ========================================
  // STANDARD HTML FORM FIELDS (HIGHEST CONFIDENCE)
  // ========================================
  createSelector(
    'input:not([type="hidden"]):not([type="submit"]):not([type="button"]):not([type="reset"]):not([type="image"])',
    SelectorConfidence.HIGHEST,
    'Standard HTML input elements',
  ),
  createSelector('select', SelectorConfidence.HIGHEST, 'Standard HTML select elements'),
  createSelector('textarea', SelectorConfidence.HIGHEST, 'Standard HTML textarea elements'),
  createSelector('input[type="file"]', SelectorConfidence.HIGHEST, 'Standard file input elements'),

  // ========================================
  // ARIA FORM FIELDS (HIGH CONFIDENCE)
  // ========================================
  createSelector('[role="textbox"]', SelectorConfidence.HIGH, 'ARIA textbox elements'),
  createSelector('[role="combobox"]', SelectorConfidence.HIGH, 'ARIA combobox elements'),
  createSelector('[role="spinbutton"]', SelectorConfidence.HIGH, 'ARIA spinbutton elements'),
  createSelector('[role="checkbox"]', SelectorConfidence.HIGH, 'ARIA checkbox elements'),
  createSelector('[role="switch"]', SelectorConfidence.HIGH, 'ARIA switch elements'),
  createSelector('[role="radio"]', SelectorConfidence.HIGH, 'ARIA radio elements'),
  createSelector('[role="searchbox"]', SelectorConfidence.HIGH, 'ARIA searchbox elements'),
  createSelector('[role="listbox"]', SelectorConfidence.MEDIUM_HIGH, 'ARIA listbox elements'),
  createSelector('[role="slider"]', SelectorConfidence.MEDIUM_HIGH, 'ARIA slider elements'),

  // ========================================
  // BOOTSTRAP & COMMON UI FRAMEWORKS (HIGH CONFIDENCE)
  // ========================================
  createSelector('.form-select', SelectorConfidence.HIGH, 'Bootstrap form select elements'),
  createSelector('.form-check-input', SelectorConfidence.HIGH, 'Bootstrap form check inputs'),
  createSelector('.form-range', SelectorConfidence.HIGH, 'Bootstrap form range inputs'),

  // ========================================
  // CONTENT EDITABLE (MEDIUM-HIGH CONFIDENCE)
  // ========================================
  createSelector('[contenteditable="true"]', SelectorConfidence.MEDIUM_HIGH, 'Content editable elements'),
  createSelector('[contenteditable=""]', SelectorConfidence.MEDIUM, 'Content editable elements (empty value)'),

  // ========================================
  // FRAMEWORK-SPECIFIC: MATERIAL-UI (MEDIUM-HIGH CONFIDENCE)
  // ========================================
  ...createFrameworkSelectors('Material-UI', FRAMEWORK_SELECTORS.MATERIAL_UI.inputs, SelectorConfidence.MEDIUM_HIGH),
  createSelector('.MuiSelect-root', SelectorConfidence.MEDIUM_HIGH, 'Material-UI select components'),
  createSelector('.MuiCheckbox-root input', SelectorConfidence.MEDIUM_HIGH, 'Material-UI checkbox inputs'),
  createSelector('.MuiAutocomplete-input', SelectorConfidence.MEDIUM_HIGH, 'Material-UI autocomplete input'),

  // ========================================
  // FRAMEWORK-SPECIFIC: ANT DESIGN (MEDIUM-HIGH CONFIDENCE)
  // ========================================
  ...createFrameworkSelectors('Ant Design', FRAMEWORK_SELECTORS.ANT_DESIGN.inputs, SelectorConfidence.MEDIUM_HIGH),
  createSelector('.ant-select', SelectorConfidence.MEDIUM_HIGH, 'Ant Design select components'),
  createSelector('.ant-checkbox-input', SelectorConfidence.MEDIUM_HIGH, 'Ant Design checkbox inputs'),
  createSelector('.ant-upload', SelectorConfidence.MEDIUM_HIGH, 'Ant Design upload components'),

  // ========================================
  // FRAMEWORK-SPECIFIC: HEADLESS UI (MEDIUM-HIGH CONFIDENCE)
  // ========================================
  createSelector('[data-headlessui-state]', SelectorConfidence.MEDIUM_HIGH, 'Headless UI components with state'),
  createSelector('[data-headless-combobox-input]', SelectorConfidence.MEDIUM_HIGH, 'Headless UI combobox input'),
  createSelector('[data-headless-listbox-button]', SelectorConfidence.MEDIUM_HIGH, 'Headless UI listbox button'),
  createSelector('[data-headless-switch]', SelectorConfidence.MEDIUM_HIGH, 'Headless UI switch component'),

  // ========================================
  // FRAMEWORK-SPECIFIC: RADIX UI (MEDIUM-HIGH CONFIDENCE)
  // ========================================
  createSelector('[data-radix-slot]', SelectorConfidence.MEDIUM_HIGH, 'Radix UI slot elements'),
  createSelector('[data-radix-collection-item]', SelectorConfidence.MEDIUM_HIGH, 'Radix UI collection items'),
  createSelector('[data-radix-checkbox-indicator]', SelectorConfidence.MEDIUM, 'Radix UI checkbox indicator'),
  createSelector('[data-radix-radio-item]', SelectorConfidence.MEDIUM, 'Radix UI radio item'),
  createSelector('[data-radix-select-trigger]', SelectorConfidence.MEDIUM_HIGH, 'Radix UI select trigger'),
  createSelector('[data-radix-switch-thumb]', SelectorConfidence.MEDIUM, 'Radix UI switch thumb'),

  // ========================================
  // FRAMEWORK-SPECIFIC: SVELTE (MEDIUM-HIGH CONFIDENCE)
  // ========================================
  createSelector('[data-svelte-component*="input"]', SelectorConfidence.MEDIUM_HIGH, 'Svelte input component'),
  createSelector('[data-svelte-component*="select"]', SelectorConfidence.MEDIUM_HIGH, 'Svelte select component'),
  createSelector('[data-svelte-component*="checkbox"]', SelectorConfidence.MEDIUM_HIGH, 'Svelte checkbox component'),
  createSelector('[data-sveltekit-form]', SelectorConfidence.MEDIUM_HIGH, 'SvelteKit form element'),
  createSelector('.svelte-input', SelectorConfidence.MEDIUM, 'Svelte input class'),
  createSelector('.svelte-select', SelectorConfidence.MEDIUM, 'Svelte select class'),

  // ========================================
  // FRAMEWORK-SPECIFIC: ALPINE.JS (MEDIUM-HIGH CONFIDENCE)
  // ========================================
  createSelector('[x-model]', SelectorConfidence.MEDIUM_HIGH, 'Alpine.js model-bound input'),
  createSelector('[x-data] input', SelectorConfidence.MEDIUM, 'Input within Alpine.js component'),
  createSelector('[x-data] select', SelectorConfidence.MEDIUM, 'Select within Alpine.js component'),
  createSelector('[x-data] textarea', SelectorConfidence.MEDIUM, 'Textarea within Alpine.js component'),

  // ========================================
  // FRAMEWORK-SPECIFIC: HTMX (MEDIUM CONFIDENCE)
  // ========================================
  createSelector('[hx-post] input', SelectorConfidence.MEDIUM, 'Input within HTMX post form'),
  createSelector('[hx-post] select', SelectorConfidence.MEDIUM, 'Select within HTMX post form'),
  createSelector('[hx-post] textarea', SelectorConfidence.MEDIUM, 'Textarea within HTMX post form'),

  // ========================================
  // FRAMEWORK-SPECIFIC: KNOCKOUT.JS (MEDIUM CONFIDENCE)
  // ========================================
  createSelector('[data-bind*="value"]', SelectorConfidence.MEDIUM, 'Knockout.js value-bound element'),
  createSelector('[data-bind*="checked"]', SelectorConfidence.MEDIUM, 'Knockout.js checked-bound element'),
  createSelector('[data-bind*="textInput"]', SelectorConfidence.MEDIUM, 'Knockout.js textInput-bound element'),

  // ========================================
  // DATE PICKER SELECTORS (MEDIUM-HIGH CONFIDENCE)
  // ========================================
  createSelector('.flatpickr-input', SelectorConfidence.MEDIUM_HIGH, 'Flatpickr date input'),
  createSelector('.react-datepicker__input-container input', SelectorConfidence.MEDIUM_HIGH, 'React DatePicker input'),
  createSelector('.ant-picker-input input', SelectorConfidence.MEDIUM_HIGH, 'Ant Design date picker input'),
  createSelector('.MuiDatePicker-root input', SelectorConfidence.MEDIUM_HIGH, 'MUI DatePicker input'),

  // ========================================
  // PHONE WIDGET SELECTORS (MEDIUM-HIGH CONFIDENCE)
  // ========================================
  createSelector('.iti input', SelectorConfidence.MEDIUM_HIGH, 'International telephone input'),
  createSelector('.iti__tel-input', SelectorConfidence.MEDIUM_HIGH, 'ITI telephone input'),
  createSelector('.react-tel-input input', SelectorConfidence.MEDIUM, 'React telephone input'),

  // ========================================
  // OTP / VERIFICATION CODE SELECTORS (MEDIUM CONFIDENCE)
  // ========================================
  createSelector('[autocomplete="one-time-code"]', SelectorConfidence.MEDIUM_HIGH, 'OTP autocomplete input'),
  createSelector('[inputmode="numeric"][maxlength="1"]', SelectorConfidence.MEDIUM, 'Single digit numeric input (OTP)'),
  createSelector('[class*="otp"]', SelectorConfidence.MEDIUM, 'OTP class-based input'),
  createSelector('[class*="pin-input"]', SelectorConfidence.MEDIUM, 'PIN input component'),

  // ========================================
  // VUETIFY / ELEMENT PLUS / QUASAR (MEDIUM CONFIDENCE)
  // ========================================
  createSelector('.v-text-field input', SelectorConfidence.MEDIUM, 'Vuetify text field input'),
  createSelector('.v-select', SelectorConfidence.MEDIUM, 'Vuetify select component'),
  createSelector('.el-input__inner', SelectorConfidence.MEDIUM, 'Element Plus input'),
  createSelector('.el-select', SelectorConfidence.MEDIUM, 'Element Plus select'),
  createSelector('.q-field__native', SelectorConfidence.MEDIUM, 'Quasar field native input'),

  // ========================================
  // STAR RATING SELECTORS (MEDIUM-LOW CONFIDENCE)
  // ========================================
  createSelector('[class*="rating"]', SelectorConfidence.MEDIUM_LOW, 'Rating component'),
  createSelector('[class*="star"]', SelectorConfidence.MEDIUM_LOW, 'Star rating component'),
  createSelector('[role="slider"][aria-label*="rating"]', SelectorConfidence.MEDIUM, 'ARIA slider rating'),

  // ========================================
  // RICH TEXT EDITORS (MEDIUM-HIGH CONFIDENCE)
  // ========================================
  // CKEditor
  createSelector('.ck-editor__editable', SelectorConfidence.MEDIUM_HIGH, 'CKEditor 5 editable area'),
  createSelector('.ck-editor__editable_inline', SelectorConfidence.MEDIUM_HIGH, 'CKEditor 5 inline editable'),
  createSelector('.cke_editable', SelectorConfidence.MEDIUM_HIGH, 'CKEditor 4 editable area'),

  // TinyMCE
  createSelector('.mce-tinymce', SelectorConfidence.MEDIUM_HIGH, 'TinyMCE container'),
  createSelector('.mce-content-body', SelectorConfidence.MEDIUM_HIGH, 'TinyMCE content body'),
  createSelector('.tox-tinymce', SelectorConfidence.MEDIUM_HIGH, 'TinyMCE 5+ container'),
  createSelector('[data-mce-placeholder]', SelectorConfidence.MEDIUM, 'TinyMCE placeholder element'),

  // Quill
  createSelector('.ql-editor', SelectorConfidence.MEDIUM_HIGH, 'Quill editor editable area'),
  createSelector('.ql-container', SelectorConfidence.MEDIUM, 'Quill editor container'),
  createSelector('[data-quill]', SelectorConfidence.MEDIUM, 'Quill data attribute'),

  // ProseMirror
  createSelector('.ProseMirror', SelectorConfidence.MEDIUM_HIGH, 'ProseMirror editor'),
  createSelector('[data-prosemirror]', SelectorConfidence.MEDIUM, 'ProseMirror data attribute'),

  // Draft.js
  createSelector('.public-DraftEditor-content', SelectorConfidence.MEDIUM_HIGH, 'Draft.js editor content'),
  createSelector('.DraftEditor-root', SelectorConfidence.MEDIUM, 'Draft.js editor root'),

  // Froala
  createSelector('.fr-element', SelectorConfidence.MEDIUM_HIGH, 'Froala editor element'),
  createSelector('.fr-wrapper', SelectorConfidence.MEDIUM, 'Froala editor wrapper'),

  // Slate
  createSelector('[data-slate-editor]', SelectorConfidence.MEDIUM_HIGH, 'Slate editor'),
  createSelector('[data-slate-node]', SelectorConfidence.MEDIUM, 'Slate editor node'),

  // ========================================
  // FRAMEWORK-SPECIFIC: CHAKRA UI (MEDIUM CONFIDENCE)
  // ========================================
  createSelector('.chakra-input', SelectorConfidence.MEDIUM, 'Chakra UI input components'),
  createSelector('.chakra-select', SelectorConfidence.MEDIUM, 'Chakra UI select components'),
  createSelector('.chakra-checkbox__input', SelectorConfidence.MEDIUM, 'Chakra UI checkbox input'),
  createSelector('.chakra-switch__input', SelectorConfidence.MEDIUM, 'Chakra UI switch input'),

  // ========================================
  // FILE UPLOAD PATTERNS (MEDIUM CONFIDENCE)
  // ========================================
  createSelector('[data-file-upload]', SelectorConfidence.MEDIUM, 'Elements with file upload data attribute'),
  createSelector('[class*="dropzone"]', SelectorConfidence.MEDIUM, 'Dropzone elements'),
  createSelector('[class*="file-drop"]', SelectorConfidence.MEDIUM, 'File drop elements'),
  createSelector(
    'label[for] input[type="file"][style*="display: none"]',
    SelectorConfidence.MEDIUM_HIGH,
    'Labels for hidden file inputs',
  ),
  createSelector(
    'input[type="file"][style*="display: none"] + *',
    SelectorConfidence.MEDIUM,
    'Elements following hidden file inputs',
  ),
  createSelector(
    'input[type="file"][class*="hidden"] + *',
    SelectorConfidence.MEDIUM,
    'Elements following hidden file inputs (class)',
  ),
  createSelector(
    'input[type="file"][class*="sr-only"] + *',
    SelectorConfidence.MEDIUM,
    'Elements following screen reader only file inputs',
  ),

  // Upload with ARIA roles
  createButtonWithRoleSelector('upload', SelectorConfidence.MEDIUM),
  createButtonWithRoleSelector('file', SelectorConfidence.MEDIUM_LOW),

  // ========================================
  // CUSTOM DATA ATTRIBUTES (MEDIUM CONFIDENCE)
  // ========================================
  createSelector('[data-form-field]', SelectorConfidence.MEDIUM_HIGH, 'Elements with data-form-field attribute'),
  createSelector('[data-form-control]', SelectorConfidence.MEDIUM_HIGH, 'Elements with data-form-control attribute'),
  createSelector('[data-field]', SelectorConfidence.MEDIUM, 'Elements with data-field attribute'),
  createSelector('[data-input]', SelectorConfidence.MEDIUM, 'Elements with data-input attribute'),
  createSelector('[data-field-type="file"]', SelectorConfidence.MEDIUM, 'Elements with file field type'),
  createSelector('[data-field-type="upload"]', SelectorConfidence.MEDIUM, 'Elements with upload field type'),
  createSelector('[data-input-type="file"]', SelectorConfidence.MEDIUM, 'Elements with file input type'),

  // ========================================
  // COMMON CSS CLASS PATTERNS (MEDIUM CONFIDENCE)
  // ========================================
  createSelector('.form-control', SelectorConfidence.MEDIUM, 'Bootstrap form control elements'),
  createSelector('.form-input', SelectorConfidence.MEDIUM, 'Form input elements'),
  createSelector('.form-field', SelectorConfidence.MEDIUM, 'Form field elements'),
  createSelector('.input-field', SelectorConfidence.MEDIUM_LOW, 'Input field elements'),
  createSelector('.text-field', SelectorConfidence.MEDIUM_LOW, 'Text field elements'),
  createSelector('.select-field', SelectorConfidence.MEDIUM_LOW, 'Select field elements'),
  createSelector('.checkbox-field', SelectorConfidence.MEDIUM_LOW, 'Checkbox field elements'),
  createSelector('.radio-field', SelectorConfidence.MEDIUM_LOW, 'Radio field elements'),

  // ========================================
  // ARIA ACCESSIBILITY PATTERNS (MEDIUM-LOW CONFIDENCE)
  // ========================================
  createSelector('[aria-required="true"]', SelectorConfidence.MEDIUM, 'Elements marked as required via ARIA'),
  createSelector('[aria-invalid]', SelectorConfidence.MEDIUM_LOW, 'Elements with ARIA invalid state'),
  createSelector('[data-upload]', SelectorConfidence.MEDIUM_LOW, 'Elements with upload data attribute'),
  createSelector('[draggable="true"][class*="upload"]', SelectorConfidence.MEDIUM_LOW, 'Draggable upload elements'),
  createSelector('[ondrop][class*="upload"]', SelectorConfidence.MEDIUM_LOW, 'Elements with drop handlers for uploads'),

  // ========================================
  // TEST ID PATTERNS (MEDIUM-LOW CONFIDENCE)
  // ========================================
  createSelector('[data-testid*="input"]', SelectorConfidence.MEDIUM_LOW, 'Elements with input-related test IDs'),
  createSelector('[data-testid*="field"]', SelectorConfidence.MEDIUM_LOW, 'Elements with field-related test IDs'),
  createSelector('[data-testid*="select"]', SelectorConfidence.MEDIUM_LOW, 'Elements with select-related test IDs'),
  createSelector('[data-cy*="input"]', SelectorConfidence.MEDIUM_LOW, 'Cypress test elements for inputs'),
  createSelector('[data-cy*="field"]', SelectorConfidence.MEDIUM_LOW, 'Cypress test elements for fields'),

  // ========================================
  // INTERACTIVE UPLOAD BUTTONS (MEDIUM-LOW CONFIDENCE)
  // ========================================
  createButtonSelector('upload', SelectorConfidence.MEDIUM_LOW),
  createButtonSelector('file', SelectorConfidence.LOW),
  createButtonSelector('attach', SelectorConfidence.LOW),
  createButtonSelector('browse', SelectorConfidence.LOW),
  createSelector('[role="button"][class*="upload"]', SelectorConfidence.LOW, 'Upload elements with button role'),
  createSelector('[role="button"][class*="file"]', SelectorConfidence.LOWER, 'File elements with button role'),

  // ========================================
  // ACCEPT ATTRIBUTE & FILE PATTERNS (LOW CONFIDENCE)
  // ========================================
  createSelector('[accept]', SelectorConfidence.LOW, 'Elements with accept attribute'),
  createSelector('[class*="resume"]', SelectorConfidence.LOW, 'Elements with resume-related classes'),
  createSelector('[class*="cv"]', SelectorConfidence.LOW, 'Elements with CV-related classes'),
  createSelector('[aria-describedby]', SelectorConfidence.LOW, 'Elements with ARIA descriptions'),
  createSelector('[aria-labelledby]', SelectorConfidence.LOW, 'Elements with ARIA label references'),

  // ========================================
  // EVENT HANDLER PATTERNS (LOW CONFIDENCE)
  // ========================================
  createSelector('[onchange]', SelectorConfidence.LOW, 'Elements with change event handlers'),
  createSelector('[oninput]', SelectorConfidence.LOW, 'Elements with input event handlers'),
  createSelector('[onfocus]', SelectorConfidence.LOWER, 'Elements with focus event handlers'),

  // ========================================
  // ATTACHMENT PATTERNS (LOWER CONFIDENCE)
  // ========================================
  createSelector('[class*="attach"]', SelectorConfidence.LOWER, 'Elements with attachment-related classes'),

  // ========================================
  // UNIVERSAL INTERACTIVE PATTERNS (LOWEST CONFIDENCE)
  // ========================================
  createSelector('input[class*="input"]', SelectorConfidence.LOWEST, 'Input elements with input-related classes'),
  createSelector('select[class*="select"]', SelectorConfidence.LOWEST, 'Select elements with select-related classes'),
  createSelector(
    'textarea[class*="textarea"]',
    SelectorConfidence.LOWEST,
    'Textarea elements with textarea-related classes',
  ),
  createSelector('[tabindex]:not([tabindex="-1"])', SelectorConfidence.LOWEST, 'Focusable elements with tabindex'),
  createSelector('[class*="document"]', SelectorConfidence.LOWEST, 'Elements with document-related classes'),

  // Custom elements with "is" attribute
  createSelector('*[is*="input"]', SelectorConfidence.LOWEST, 'Custom elements extending input'),
  createSelector('*[is*="select"]', SelectorConfidence.LOWEST, 'Custom elements extending select'),
  createSelector('*[is*="field"]', SelectorConfidence.LOWEST, 'Custom elements extending field'),

  // ========================================
  // GENERIC PATTERNS (MINIMAL CONFIDENCE)
  // ========================================
  createSelector(
    '[class*="input"][type]',
    SelectorConfidence.MINIMAL,
    'Elements with input classes and type attribute',
  ),
  createSelector('[class*="field"][role]', SelectorConfidence.MINIMAL, 'Elements with field classes and ARIA roles'),
  createSelector(
    '[class*="control"][aria-label]',
    SelectorConfidence.MINIMAL,
    'Elements with control classes and ARIA labels',
  ),

  // ========================================
  // HYPHENATED CLASS PATTERNS (VERY LOW CONFIDENCE)
  // ========================================
  createSelector('*[class*="-input"]', SelectorConfidence.VERY_LOW, 'Elements with hyphenated input classes'),
  createSelector('*[class*="-field"]', SelectorConfidence.VERY_LOW, 'Elements with hyphenated field classes'),
  createSelector('*[class*="-control"]', SelectorConfidence.VERY_LOW, 'Elements with hyphenated control classes'),
];

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Get selectors by minimum confidence level
 */
const getSelectorsByConfidence = (minConfidence: number): SelectorWithConfidence[] =>
  UNIVERSAL_FORM_SELECTORS.filter(s => s.confidence >= minConfidence);

/**
 * Get selectors within a confidence range
 */
const getSelectorsByConfidenceRange = (minConfidence: number, maxConfidence: number): SelectorWithConfidence[] =>
  UNIVERSAL_FORM_SELECTORS.filter(s => s.confidence >= minConfidence && s.confidence <= maxConfidence);

/**
 * Get high confidence selectors (0.85+)
 */
const HIGH_CONFIDENCE_SELECTORS = getSelectorsByConfidence(SelectorConfidence.MEDIUM_HIGH);

/**
 * Get medium confidence selectors (0.7-0.85)
 */
const MEDIUM_CONFIDENCE_SELECTORS = getSelectorsByConfidenceRange(SelectorConfidence.LOW, SelectorConfidence.MEDIUM);

/**
 * Get low confidence selectors (<0.7)
 */
const LOW_CONFIDENCE_SELECTORS = UNIVERSAL_FORM_SELECTORS.filter(s => s.confidence < SelectorConfidence.LOW);

/**
 * Get selectors for a specific framework
 */
const getFrameworkSelectors = (framework: keyof typeof FRAMEWORK_SELECTORS): SelectorWithConfidence[] => {
  const frameworkConfig = FRAMEWORK_SELECTORS[framework];
  const selectors: SelectorWithConfidence[] = [];

  Object.entries(frameworkConfig).forEach(([, selectorList]) => {
    (selectorList as readonly string[]).forEach(selector => {
      selectors.push(createSelector(selector, SelectorConfidence.MEDIUM_HIGH, `${framework} component`));
    });
  });

  return selectors;
};

/**
 * Get all rich text editor selectors
 */
const getRichTextEditorSelectors = (): SelectorWithConfidence[] => {
  const editors = FRAMEWORK_SELECTORS.RICH_TEXT_EDITORS;
  const selectors: SelectorWithConfidence[] = [];

  Object.entries(editors).forEach(([editorName, selectorList]) => {
    selectorList.forEach(selector => {
      selectors.push(createSelector(selector, SelectorConfidence.MEDIUM_HIGH, `${editorName} editor`));
    });
  });

  return selectors;
};

/**
 * Combine multiple selector arrays and deduplicate
 */
const combineSelectors = (...selectorArrays: SelectorWithConfidence[][]): SelectorWithConfidence[] => {
  const seen = new Set<string>();
  const combined: SelectorWithConfidence[] = [];

  selectorArrays.flat().forEach(s => {
    if (!seen.has(s.selector)) {
      seen.add(s.selector);
      combined.push(s);
    }
  });

  return combined.sort((a, b) => b.confidence - a.confidence);
};

/**
 * Get combined selector string for querySelectorAll
 */
const getCombinedSelectorString = (minConfidence: number = SelectorConfidence.LOW): string =>
  getSelectorsByConfidence(minConfidence)
    .map(s => s.selector)
    .join(', ');

// ============================================================================
// Exports (at end of file per ESLint import-x/exports-last rule)
// ============================================================================

export {
  SelectorConfidence,
  SELECTOR_CATEGORIES,
  FRAMEWORK_SELECTORS,
  CSS_CLASS_PATTERNS,
  UNIVERSAL_FORM_SELECTORS,
  getSelectorsByConfidence,
  getSelectorsByConfidenceRange,
  HIGH_CONFIDENCE_SELECTORS,
  MEDIUM_CONFIDENCE_SELECTORS,
  LOW_CONFIDENCE_SELECTORS,
  getFrameworkSelectors,
  getRichTextEditorSelectors,
  combineSelectors,
  getCombinedSelectorString,
};
export type { SelectorWithConfidence };
