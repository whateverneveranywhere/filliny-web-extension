import { useFormElement, useOverlayPosition, useFormFill } from './hooks';
import {
  useFormFillStore,
  selectProgress,
  selectCurrentlyFillingField,
  selectRecentlyFilledFields,
  StreamingPhase,
} from './stores';
import { Button } from '../../ui';
import * as Progress from '@radix-ui/react-progress';
import { X, Wand2, Loader2, CheckCircle2, XCircle, AlertTriangle, Check } from 'lucide-react';
import { useRef } from 'react';
import type { OverlayPosition } from '@extension/shared';
import type React from 'react';

interface OverlayProps {
  formId: string;
  initialPosition: OverlayPosition;
  onDismiss: () => void;
  testMode?: boolean;
}

/**
 * Compact floating progress card shown during streaming.
 * Renders as a fixed-position card in the bottom-right of the viewport,
 * independent of the form overlay so users can see fields being filled.
 */
const CompactStreamingProgress: React.FC = () => {
  const phase = useFormFillStore(state => state.phase);
  const progress = useFormFillStore(selectProgress);
  const currentField = useFormFillStore(selectCurrentlyFillingField);
  const recentFields = useFormFillStore(selectRecentlyFilledFields);

  const progressPercent =
    progress.totalFields > 0 ? Math.round((progress.fieldsWithValues / progress.totalFields) * 100) : 0;

  const isComplete = phase === StreamingPhase.COMPLETE;
  const isError = phase === StreamingPhase.ERROR;
  const isFullSuccess = isComplete && progress.fieldsErrored === 0;
  const isPartialSuccess = isComplete && progress.fieldsErrored > 0;

  const getBarColor = () => {
    if (isError) return 'filliny-bg-red-400';
    if (isPartialSuccess) return 'filliny-bg-amber-400';
    if (isFullSuccess) return 'filliny-bg-green-400';
    return 'filliny-bg-white';
  };

  const getStatusIcon = () => {
    if (isFullSuccess) return <CheckCircle2 className="filliny-h-4 filliny-w-4 filliny-text-green-400" />;
    if (isPartialSuccess) return <AlertTriangle className="filliny-h-4 filliny-w-4 filliny-text-amber-400" />;
    if (isError) return <XCircle className="filliny-h-4 filliny-w-4 filliny-text-red-400" />;
    return <Loader2 className="filliny-h-4 filliny-w-4 filliny-animate-spin filliny-text-white" />;
  };

  const getStatusText = (): string => {
    if (isFullSuccess) return 'Form Filled!';
    if (isPartialSuccess) return 'Mostly Filled';
    if (isError) return 'Fill Failed';
    if (phase === StreamingPhase.FINALIZING) return 'Verifying...';
    return `${progress.fieldsWithValues}/${progress.totalFields} fields`;
  };

  return (
    <div
      style={{
        position: 'fixed',
        bottom: '16px',
        right: '16px',
        zIndex: 10000001,
        pointerEvents: 'auto',
      }}
      className="filliny-w-[220px] filliny-rounded-lg filliny-bg-zinc-900/95 filliny-backdrop-blur-xl filliny-border filliny-border-white/10 filliny-shadow-lg filliny-p-3 filliny-transition-all filliny-duration-300">
      {/* Header row: icon + status + counter */}
      <div className="filliny-flex filliny-items-center filliny-gap-2 filliny-mb-2">
        {getStatusIcon()}
        <span className="filliny-text-sm filliny-font-medium filliny-text-white">{getStatusText()}</span>
      </div>

      {/* Mini progress bar */}
      <Progress.Root
        className="filliny-relative filliny-h-1.5 filliny-w-full filliny-overflow-hidden filliny-rounded-full filliny-bg-white/10 filliny-mb-2"
        value={progressPercent}>
        <Progress.Indicator
          className={`filliny-h-full filliny-rounded-full filliny-transition-all filliny-duration-300 ${getBarColor()}`}
          style={{ width: `${progressPercent}%` }}
        />
      </Progress.Root>

      {/* Currently filling field */}
      {currentField && !isComplete && !isError && (
        <p className="filliny-text-xs filliny-text-white/60 filliny-truncate">Filling: {currentField}</p>
      )}

      {/* Recently filled fields (last 2) */}
      {recentFields.length > 0 && !isError && (
        <div className="filliny-flex filliny-flex-col filliny-gap-0.5 filliny-mt-1">
          {recentFields.slice(-2).map((label, i) => (
            <span
              key={`${label}-${i}`}
              className="filliny-flex filliny-items-center filliny-gap-1 filliny-text-xs filliny-text-green-400/70">
              <Check className="filliny-h-3 filliny-w-3 filliny-shrink-0" />
              <span className="filliny-truncate">{label}</span>
            </span>
          ))}
        </div>
      )}

      {/* Error info */}
      {isPartialSuccess && (
        <p className="filliny-text-xs filliny-text-amber-300 filliny-mt-1">
          {progress.fieldsErrored} field{progress.fieldsErrored > 1 ? 's' : ''} couldn&apos;t be filled
        </p>
      )}
      {isError && progress.fieldsErrored > 0 && (
        <p className="filliny-text-xs filliny-text-red-300 filliny-mt-1">
          {progress.fieldsErrored} field{progress.fieldsErrored > 1 ? 's' : ''} failed
        </p>
      )}
    </div>
  );
};

interface ActionButtonsProps {
  testMode: boolean;
  isFormLikelyOutOfView: boolean;
  onFillClick: (event: React.MouseEvent<HTMLButtonElement>) => Promise<void>;
  onDismiss: () => void;
  buttonRef: React.RefObject<HTMLButtonElement | null>;
}

/**
 * Pure presentation component for action buttons
 */
const ActionButtons: React.FC<ActionButtonsProps> = ({
  testMode,
  isFormLikelyOutOfView,
  onFillClick,
  onDismiss,
  buttonRef,
}) => (
  <>
    <div
      className="filliny-absolute filliny-left-1/2 filliny-top-1/2 filliny-z-[10000001] filliny-flex filliny-w-full filliny-max-w-fit filliny--translate-x-1/2 filliny--translate-y-1/2 filliny-flex-col filliny-items-center filliny-gap-3"
      style={{ pointerEvents: 'auto' }}>
      <Button ref={buttonRef} type="button" size="lg" variant="default" onClick={onFillClick}>
        <Wand2 className="filliny-h-5 filliny-w-5" />
        {testMode ? 'Test Fill Form' : 'Auto-Fill Form'}
      </Button>
      <p className="filliny-text-sm filliny-text-primary-foreground/80">
        {isFormLikelyOutOfView
          ? 'Click to scroll to form and auto-fill'
          : `Click to automatically fill out this form with ${testMode ? 'test data' : 'AI'}`}
      </p>
    </div>

    <Button
      size="icon"
      type="button"
      variant="ghost"
      className="filliny-absolute filliny-right-4 filliny-top-4 filliny-h-8 filliny-w-8 filliny-rounded-full filliny-bg-muted/30 filliny-text-primary-foreground hover:filliny-bg-muted/50"
      style={{ pointerEvents: 'auto' }}
      onClick={onDismiss}
      aria-label="Close overlay">
      <X className="filliny-h-4 filliny-w-4" />
    </Button>
  </>
);

interface OverlayContainerProps {
  overlayPosition: OverlayPosition;
  formId: string;
  isFormLikelyOutOfView: boolean;
  onScrollToForm: () => void;
  children: React.ReactNode;
}

/**
 * Pure presentation component for the overlay container.
 * Only renders the dimmed overlay when showing action buttons (pre-fill state).
 */
const OverlayContainer: React.FC<OverlayContainerProps> = ({
  overlayPosition,
  formId,
  isFormLikelyOutOfView,
  onScrollToForm,
  children,
}) => {
  const overlayRef = useRef<HTMLDivElement>(null);

  const overlayStyle = {
    position: 'fixed' as const,
    top: `${overlayPosition.top}px`,
    left: `${overlayPosition.left}px`,
    width: `${overlayPosition.width}px`,
    height: `${overlayPosition.height}px`,
    contain: 'layout style paint' as const,
    zIndex: 999999,
    transition: 'all 0.3s ease',
  };

  return (
    <div
      ref={overlayRef}
      className="filliny-pointer-events-auto filliny-fixed filliny-flex filliny-items-center filliny-justify-center filliny-transition-all filliny-duration-300 filliny-rounded-lg filliny-bg-foreground/30 filliny-backdrop-blur-md hover:filliny-bg-foreground/40"
      style={overlayStyle}
      data-highlight-overlay="true"
      data-form-id={formId}
      onClick={isFormLikelyOutOfView ? onScrollToForm : undefined}
      onKeyDown={isFormLikelyOutOfView ? e => e.key === 'Enter' && onScrollToForm() : undefined}
      role={isFormLikelyOutOfView ? 'button' : undefined}
      tabIndex={isFormLikelyOutOfView ? 0 : undefined}
      aria-label={isFormLikelyOutOfView ? 'Click to scroll to form' : undefined}>
      {children}
    </div>
  );
};

/**
 * FormsOverlay - Container component that composes logic hooks and presentation components
 *
 * Three-phase rendering:
 * 1. Pre-fill: Shows dimmed overlay over form with "Auto-Fill Form" button
 * 2. Streaming: Keeps a subtle overlay with floating progress card while fields fill gradually
 * 3. Complete/Error: Shows completion state briefly before auto-dismissing
 *
 * The overlay remains visible during streaming to maintain layout stability
 * and signal to the user that a background process is active.
 */
const FormsOverlay: React.FC<OverlayProps> = ({ formId, initialPosition, onDismiss, testMode = false }) => {
  const buttonRef = useRef<HTMLButtonElement>(null);

  // Custom hooks for logic separation
  const { formRef, scrollToForm } = useFormElement(formId);
  const { overlayPosition, isFormLikelyOutOfView } = useOverlayPosition({ formRef, initialPosition });
  const { loading, handleFillClick } = useFormFill({ formId, testMode, onDismiss });

  // During streaming: show a minimal overlay with the progress card
  // The overlay stays visible but semi-transparent so users can see fields being filled
  if (loading) {
    return (
      <>
        {/* Minimal overlay to signal active process - pointer-events none so fields remain visible */}
        <div
          className="filliny-pointer-events-none filliny-fixed filliny-rounded-lg filliny-transition-all filliny-duration-500"
          style={{
            position: 'fixed',
            top: `${overlayPosition.top}px`,
            left: `${overlayPosition.left}px`,
            width: `${overlayPosition.width}px`,
            height: `${overlayPosition.height}px`,
            zIndex: 999998,
            border: '2px solid rgba(16, 185, 129, 0.3)',
            borderRadius: '8px',
            background: 'rgba(16, 185, 129, 0.03)',
            transition: 'all 0.3s ease',
          }}
          data-highlight-overlay="true"
          data-form-id={formId}
        />
        <CompactStreamingProgress />
      </>
    );
  }

  // Pre-fill state: show dimmed overlay with action buttons
  return (
    <OverlayContainer
      overlayPosition={overlayPosition}
      formId={formId}
      isFormLikelyOutOfView={isFormLikelyOutOfView}
      onScrollToForm={scrollToForm}>
      <ActionButtons
        testMode={testMode}
        isFormLikelyOutOfView={isFormLikelyOutOfView}
        onFillClick={handleFillClick}
        onDismiss={onDismiss}
        buttonRef={buttonRef}
      />
    </OverlayContainer>
  );
};

export { FormsOverlay };
