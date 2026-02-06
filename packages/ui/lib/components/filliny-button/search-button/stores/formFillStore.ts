import { useStore } from 'zustand';
import { createStore } from 'zustand/vanilla';

/**
 * Status of an individual field during the streaming fill process
 */
export enum FieldFillStatus {
  PENDING = 'PENDING',
  STREAMING = 'STREAMING',
  FILLED = 'FILLED',
  VERIFIED = 'VERIFIED',
  ERROR = 'ERROR',
}

/**
 * Phase of the overall streaming fill session
 */
export enum StreamingPhase {
  IDLE = 'IDLE',
  STREAMING = 'STREAMING',
  FINALIZING = 'FINALIZING',
  COMPLETE = 'COMPLETE',
  ERROR = 'ERROR',
}

/**
 * Per-field state tracked during streaming
 */
export interface FieldFillState {
  status: FieldFillStatus;
  currentValue: string | string[] | undefined;
  previousValue: string | string[] | undefined;
  isValueStable: boolean;
  errorMessage?: string;
}

/**
 * Progress counters for the streaming session
 */
export interface StreamingProgress {
  totalFields: number;
  fieldsWithValues: number;
  fieldsFilled: number;
  fieldsVerified: number;
  fieldsErrored: number;
}

/**
 * Shape of the form fill store state
 */
interface FormFillState {
  phase: StreamingPhase;
  fields: Record<string, FieldFillState>;
  lastPartialObject: Record<string, unknown> | null;

  // Actions
  initSession: (fieldIds: string[]) => void;
  updateFieldValue: (id: string, value: string | string[] | undefined) => void;
  markFieldStable: (id: string) => void;
  markFieldFilled: (id: string) => void;
  markFieldVerified: (id: string) => void;
  markFieldError: (id: string, message: string) => void;
  setPhase: (phase: StreamingPhase) => void;
  setLastPartialObject: (obj: Record<string, unknown> | null) => void;
  reset: () => void;
}

const initialState = {
  phase: StreamingPhase.IDLE as StreamingPhase,
  fields: {} as Record<string, FieldFillState>,
  lastPartialObject: null as Record<string, unknown> | null,
};

/**
 * Vanilla Zustand store for form fill state.
 * Vanilla store allows imperative access via getState()/setState()
 * from non-React code (e.g., Chrome message listeners).
 */
export const formFillStore = createStore<FormFillState>((set, get) => ({
  ...initialState,

  initSession: (fieldIds: string[]) => {
    const fields: Record<string, FieldFillState> = {};
    for (const id of fieldIds) {
      fields[id] = {
        status: FieldFillStatus.PENDING,
        currentValue: undefined,
        previousValue: undefined,
        isValueStable: false,
      };
    }
    set({
      phase: StreamingPhase.STREAMING,
      fields,
      lastPartialObject: null,
    });
  },

  updateFieldValue: (id: string, value: string | string[] | undefined) => {
    const { fields } = get();
    const field = fields[id];
    if (!field) return;

    set({
      fields: {
        ...fields,
        [id]: {
          ...field,
          previousValue: field.currentValue,
          currentValue: value,
          status: FieldFillStatus.STREAMING,
          isValueStable: false,
        },
      },
    });
  },

  markFieldStable: (id: string) => {
    const { fields } = get();
    const field = fields[id];
    if (!field) return;

    set({
      fields: {
        ...fields,
        [id]: {
          ...field,
          isValueStable: true,
        },
      },
    });
  },

  markFieldFilled: (id: string) => {
    const { fields } = get();
    const field = fields[id];
    if (!field) return;

    set({
      fields: {
        ...fields,
        [id]: {
          ...field,
          status: FieldFillStatus.FILLED,
          isValueStable: true,
        },
      },
    });
  },

  markFieldVerified: (id: string) => {
    const { fields } = get();
    const field = fields[id];
    if (!field) return;

    set({
      fields: {
        ...fields,
        [id]: {
          ...field,
          status: FieldFillStatus.VERIFIED,
        },
      },
    });
  },

  markFieldError: (id: string, message: string) => {
    const { fields } = get();
    const field = fields[id];
    if (!field) return;

    set({
      fields: {
        ...fields,
        [id]: {
          ...field,
          status: FieldFillStatus.ERROR,
          errorMessage: message,
        },
      },
    });
  },

  setPhase: (phase: StreamingPhase) => {
    set({ phase });
  },

  setLastPartialObject: (obj: Record<string, unknown> | null) => {
    set({ lastPartialObject: obj });
  },

  reset: () => {
    set({ ...initialState });
  },
}));

/**
 * React hook to use the form fill store in components.
 * Accepts an optional selector for granular subscriptions.
 */
export const useFormFillStore = <T>(selector: (state: FormFillState) => T): T => useStore(formFillStore, selector);

/**
 * Selector: compute streaming progress counters from fields state
 */
export const selectProgress = (state: FormFillState): StreamingProgress => {
  const entries = Object.values(state.fields);
  return {
    totalFields: entries.length,
    fieldsWithValues: entries.filter(f => f.currentValue !== undefined).length,
    fieldsFilled: entries.filter(f => f.status === FieldFillStatus.FILLED || f.status === FieldFillStatus.VERIFIED)
      .length,
    fieldsVerified: entries.filter(f => f.status === FieldFillStatus.VERIFIED).length,
    fieldsErrored: entries.filter(f => f.status === FieldFillStatus.ERROR).length,
  };
};

/**
 * Selector: is the session currently streaming?
 */
export const selectIsStreaming = (state: FormFillState): boolean => state.phase === StreamingPhase.STREAMING;

/**
 * Selector: is the session finalizing (verification pass)?
 */
export const selectIsFinalizing = (state: FormFillState): boolean => state.phase === StreamingPhase.FINALIZING;
