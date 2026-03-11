import { useFormElement, useOverlayPosition, useFormFill } from './hooks';
import { useFormFillStore, StreamingPhase } from './stores';
import { Button } from '../../ui';
import { X, Wand2, Loader2 } from 'lucide-react';
import { useRef, useEffect } from 'react';
import type { OverlayPosition } from '@extension/shared';
import type React from 'react';

interface OverlayProps {
  formId: string;
  initialPosition: OverlayPosition;
  onDismiss: () => void;
  testMode?: boolean;
}

interface ActionButtonsProps {
  testMode: boolean;
  isFormLikelyOutOfView: boolean;
  isFilling: boolean;
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
  isFilling,
  onFillClick,
  onDismiss,
  buttonRef,
}) => (
  <>
    <div
      className="filliny-absolute filliny-left-1/2 filliny-top-1/2 filliny-z-[10000001] filliny-flex filliny-w-full filliny-max-w-fit filliny--translate-x-1/2 filliny--translate-y-1/2 filliny-flex-col filliny-items-center filliny-gap-3"
      style={{ pointerEvents: 'auto' }}>
      <Button ref={buttonRef} type="button" size="lg" variant="default" onClick={onFillClick} disabled={isFilling}>
        {isFilling ? (
          <Loader2 className="filliny-h-5 filliny-w-5 filliny-animate-spin" />
        ) : (
          <Wand2 className="filliny-h-5 filliny-w-5" />
        )}
        {isFilling ? 'Filling...' : testMode ? 'Test Fill Form' : 'Auto-Fill Form'}
      </Button>
      <p className="filliny-text-sm filliny-text-primary-foreground/80">
        {isFilling
          ? 'Please wait while the form is being filled'
          : isFormLikelyOutOfView
            ? 'Click to scroll to form and auto-fill'
            : `Click to automatically fill out this form with ${testMode ? 'test data' : 'AI'}`}
      </p>
    </div>

    {!isFilling && (
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
    )}
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
 * Renders the dimmed overlay with action buttons (pre-fill state).
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
    transition: 'background-color 0.3s ease, backdrop-filter 0.3s ease',
  };

  return (
    <div
      ref={overlayRef}
      className="filliny-pointer-events-auto filliny-fixed filliny-flex filliny-items-center filliny-justify-center filliny-rounded-lg filliny-bg-foreground/30 filliny-backdrop-blur-md hover:filliny-bg-foreground/40"
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
 * FormsOverlay - Dimmed overlay shown over detected forms with an "Auto-Fill Form" button.
 *
 * When the fill button is clicked, the overlay stays visible with a loading spinner.
 * It auto-dismisses when filling completes or encounters an error.
 */
const FormsOverlay: React.FC<OverlayProps> = ({ formId, initialPosition, onDismiss, testMode = false }) => {
  const buttonRef = useRef<HTMLButtonElement>(null);

  const { formRef, scrollToForm } = useFormElement(formId);
  const { overlayPosition, isFormLikelyOutOfView } = useOverlayPosition({ formRef, initialPosition });
  const { handleFillClick } = useFormFill({ formId, testMode, onDismiss });

  const phase = useFormFillStore(state => state.phase);
  const isFilling = phase === StreamingPhase.STREAMING || phase === StreamingPhase.FINALIZING;

  // Auto-dismiss overlay when filling completes or errors
  useEffect(() => {
    if (phase !== StreamingPhase.COMPLETE && phase !== StreamingPhase.ERROR) {
      return;
    }
    const timer = setTimeout(onDismiss, 500);
    return () => clearTimeout(timer);
  }, [phase, onDismiss]);

  return (
    <OverlayContainer
      overlayPosition={overlayPosition}
      formId={formId}
      isFormLikelyOutOfView={isFormLikelyOutOfView}
      onScrollToForm={scrollToForm}>
      <ActionButtons
        testMode={testMode}
        isFormLikelyOutOfView={isFormLikelyOutOfView}
        isFilling={isFilling}
        onFillClick={handleFillClick}
        onDismiss={onDismiss}
        buttonRef={buttonRef}
      />
    </OverlayContainer>
  );
};

export { FormsOverlay };
