import type { DTOFillingPrefrences } from "@extension/storage";

export type InputFieldType =
  | "text"
  | "password"
  | "email"
  | "number"
  | "tel"
  | "url"
  | "search"
  | "color"
  | "date"
  | "datetime-local"
  | "month"
  | "week"
  | "time"
  | "range";

export type FieldType = InputFieldType | "select" | "checkbox" | "radio" | "textarea" | "button" | "file" | "fieldset";
// AcceptType interface definition
export interface AcceptType {
  type: "mime" | "extension";
  value: string;
  category: "image" | "document" | "video" | "audio" | "archive" | "text" | "other";
}

export interface FileUploadData {
  acceptedTypes?: AcceptType[];
  fileInput?: {
    multiple?: boolean;
  };
}

export interface Field {
  id: string;
  name?: string;
  type: FieldType;
  placeholder?: string;
  title?: string;
  label?: string;
  description?: string;
  value?: string | string[];
  testValue?: string | string[];
  options?: Array<{
    value: string;
    text: string;
    selected: boolean;
  }>;
  required?: boolean;
  validation?: {
    pattern?: string;
    minLength?: number;
    maxLength?: number;
    min?: number;
    max?: number;
    step?: number;
  };
  metadata?: {
    framework: "react" | "angular" | "vue" | "vanilla" | "select2";
    frameworkProps?: {
      onSubmit?: () => void;
      onChange?: () => void;
      onClick?: () => void;
      [key: string]: (() => void) | undefined;
    };
    visibility: {
      isVisible: boolean;
      hiddenReason?: string;
    };
    select2Container?: string;
    actualSelect?: string;
    checkboxValue?: string;
    isExclusive?: boolean;
    isMultiple?: boolean;
    groupName?: string;
  };
  xpath?: string;
  uniqueSelectors?: string[];
}

export interface DTOFillPayload {
  contextText: string;
  formData: Field[];
  websiteUrl: string;
  preferences?: DTOFillingPrefrences;
}
