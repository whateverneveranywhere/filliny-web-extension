import { useStore } from 'zustand';
import { createStore } from 'zustand/vanilla';

/**
 * Status of an individual field during the streaming fill process
 */
enum FieldFillStatus {
  PENDING = 'PENDING',
  STREAMING = 'STREAMING',
  FILLED = 'FILLED',
  VERIFIED = 'VERIFIED',
  ERROR = 'ERROR',
}

/**
 * Phase of the overall streaming fill session
 */
enum StreamingPhase {
  IDLE = 'IDLE',
  STREAMING = 'STREAMING',
  FINALIZING = 'FINALIZING',
  COMPLETE = 'COMPLETE',
  ERROR = 'ERROR',
}

/**
 * Counters for a fill strategy's attempts and successes
 */
interface StrategyStatsEntry {
  attempted: number;
  succeeded: number;
}

/**
 * Per-field state tracked during streaming
 */
interface FieldFillState {
  label: string;
  status: FieldFillStatus;
  currentValue: string | string[] | undefined;
  previousValue: string | string[] | undefined;
  isValueStable: boolean;
  errorMessage?: string;
  verificationAttempts: number;
  verificationPassed: boolean;
  lastVerifiedAt: number | null;
  fillStrategy: string;
}

/**
 * Progress counters for the streaming session
 */
interface StreamingProgress {
  totalFields: number;
  fieldsWithValues: number;
  fieldsFilled: number;
  fieldsVerified: number;
  fieldsErrored: number;
}

/**
 * Mapping from field IDs to their partial streaming values.
 * Used to track the most recent AI response during streaming
 * so subsequent chunks can be diffed against previous values.
 */
type PartialFieldValueMap = Record<string, string | string[] | undefined>;

/**
 * Shape of the form fill store state
 */
interface FormFillState {
  phase: StreamingPhase;
  fields: Record<string, FieldFillState>;
  lastPartialObject: PartialFieldValueMap | null;
  strategyStats: Map<string, StrategyStatsEntry>;

  // Actions
  initSession: (fields: Array<{ id: string; label: string }>) => void;
  updateFieldValue: (id: string, value: string | string[] | undefined) => void;
  markFieldStable: (id: string) => void;
  markFieldFilled: (id: string) => void;
  markFieldVerified: (id: string) => void;
  markFieldError: (id: string, message: string) => void;
  setPhase: (phase: StreamingPhase) => void;
  setLastPartialObject: (obj: PartialFieldValueMap | null) => void;
  setVerificationResult: (fieldId: string, passed: boolean, strategy?: string) => void;
  recordStrategyResult: (strategy: string, succeeded: boolean) => void;
  reset: () => void;
}

const initialState = {
  phase: StreamingPhase.IDLE as StreamingPhase,
  fields: {} as Record<string, FieldFillState>,
  lastPartialObject: null as PartialFieldValueMap | null,
  strategyStats: new Map<string, StrategyStatsEntry>(),
};

/**
 * Vanilla Zustand store for form fill state.
 * Vanilla store allows imperative access via getState()/setState()
 * from non-React code (e.g., Chrome message listeners).
 */
const formFillStore = createStore<FormFillState>((set, get) => ({
  ...initialState,

  initSession: (fieldDefs: Array<{ id: string; label: string }>) => {
    const fields: Record<string, FieldFillState> = {};
    for (const { id, label } of fieldDefs) {
      fields[id] = {
        label,
        status: FieldFillStatus.PENDING,
        currentValue: undefined,
        previousValue: undefined,
        isValueStable: false,
        verificationAttempts: 0,
        verificationPassed: false,
        lastVerifiedAt: null,
        fillStrategy: '',
      };
    }
    set({
      phase: StreamingPhase.STREAMING,
      fields,
      lastPartialObject: null,
      strategyStats: new Map<string, StrategyStatsEntry>(),
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

  setLastPartialObject: (obj: PartialFieldValueMap | null) => {
    set({ lastPartialObject: obj });
  },

  setVerificationResult: (fieldId: string, passed: boolean, strategy?: string) => {
    const { fields } = get();
    const field = fields[fieldId];
    if (!field) return;

    set({
      fields: {
        ...fields,
        [fieldId]: {
          ...field,
          verificationPassed: passed,
          verificationAttempts: field.verificationAttempts + 1,
          lastVerifiedAt: Date.now(),
          fillStrategy: strategy ?? field.fillStrategy,
          status: passed ? FieldFillStatus.VERIFIED : field.status,
        },
      },
    });
  },

  recordStrategyResult: (strategy: string, succeeded: boolean) => {
    const { strategyStats } = get();
    const updated = new Map(strategyStats);
    const existing = updated.get(strategy) ?? { attempted: 0, succeeded: 0 };
    updated.set(strategy, {
      attempted: existing.attempted + 1,
      succeeded: existing.succeeded + (succeeded ? 1 : 0),
    });
    set({ strategyStats: updated });
  },

  reset: () => {
    set({
      ...initialState,
      strategyStats: new Map<string, StrategyStatsEntry>(),
    });
  },
}));

/**
 * React hook to use the form fill store in components.
 * Accepts an optional selector for granular subscriptions.
 */
const useFormFillStore = <T>(selector: (state: FormFillState) => T): T => useStore(formFillStore, selector);

/**
 * Selector: compute streaming progress counters from fields state
 */
const selectProgress = (state: FormFillState): StreamingProgress => {
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
const selectIsStreaming = (state: FormFillState): boolean => state.phase === StreamingPhase.STREAMING;

/**
 * Selector: is the session finalizing (verification pass)?
 */
const selectIsFinalizing = (state: FormFillState): boolean => state.phase === StreamingPhase.FINALIZING;

/**
 * Selector: label of the most recently STREAMING field
 */
const selectCurrentlyFillingField = (state: FormFillState): string | null => {
  const entries = Object.values(state.fields);
  const streaming = entries.filter(f => f.status === FieldFillStatus.STREAMING);
  return streaming.length > 0 ? streaming[streaming.length - 1].label : null;
};

/**
 * Selector: labels of last 3 FILLED or VERIFIED fields
 */
const selectRecentlyFilledFields = (state: FormFillState): string[] => {
  const entries = Object.values(state.fields);
  return entries
    .filter(f => f.status === FieldFillStatus.FILLED || f.status === FieldFillStatus.VERIFIED)
    .map(f => f.label)
    .slice(-3);
};

// ============================================================================
// All exports at end of file to comply with import-x/exports-last
// ============================================================================

export {
  FieldFillStatus,
  StreamingPhase,
  formFillStore,
  useFormFillStore,
  selectProgress,
  selectIsStreaming,
  selectIsFinalizing,
  selectCurrentlyFillingField,
  selectRecentlyFilledFields,
};

export type { FieldFillState, StreamingProgress, PartialFieldValueMap };
