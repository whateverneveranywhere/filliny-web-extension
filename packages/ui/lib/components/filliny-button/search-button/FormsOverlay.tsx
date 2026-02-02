import { useFormElement, useOverlayPosition, useFormFill } from './hooks';
import { Button } from '../../ui';
import { X, Wand2, Loader2 } from 'lucide-react';
import { useRef } from 'react';
import type { OverlayPosition } from './types';
import type React from 'react';

interface OverlayProps {
  formId: string;
  initialPosition: OverlayPosition;
  onDismiss: () => void;
  testMode?: boolean;
}

/**
 * Pure presentation component for the loading state
 */
const LoadingState: React.FC = () => (
  <div
    className="filliny-flex filliny-flex-col filliny-items-center filliny-gap-4 filliny-text-white"
    style={{ pointerEvents: 'auto' }}>
    <div className="filliny-h-8 filliny-w-8 filliny-animate-spin">
      <Loader2 className="filliny-h-full filliny-w-full" />
    </div>
    <div className="filliny-text-center">
      <p className="filliny-text-lg filliny-font-semibold">Filling Your Form</p>
      <p className="filliny-text-sm filliny-text-white/80">AI is intelligently completing your form fields...</p>
    </div>
  </div>
);

interface ActionButtonsProps {
  loading: boolean;
  testMode: boolean;
  isFormLikelyOutOfView: boolean;
  onFillClick: (event: React.MouseEvent<HTMLButtonElement>) => Promise<void>;
  onDismiss: () => void;
  buttonRef: React.RefObject<HTMLButtonElement>;
}

/**
 * Pure presentation component for action buttons
 */
const ActionButtons: React.FC<ActionButtonsProps> = ({
  loading,
  testMode,
  isFormLikelyOutOfView,
  onFillClick,
  onDismiss,
  buttonRef,
}) => (
  <>
    <div
      className="filliny-fixed filliny-left-1/2 filliny-top-1/2 filliny-z-[10000001] filliny-flex filliny-w-full filliny-max-w-fit filliny--translate-x-1/2 filliny--translate-y-1/2 filliny-flex-col filliny-items-center filliny-gap-3"
      style={{ pointerEvents: 'auto' }}>
      <Button
        ref={buttonRef}
        loading={loading}
        disabled={loading}
        type="button"
        size="lg"
        variant="default"
        onClick={onFillClick}>
        <Wand2 className="filliny-h-5 filliny-w-5" />
        {testMode ? 'Test Fill Form' : 'Auto-Fill Form'}
      </Button>
      <p className="filliny-text-sm filliny-text-white/80">
        {isFormLikelyOutOfView
          ? 'Click to scroll to form and auto-fill'
          : `Click to automatically fill out this form with ${testMode ? 'test data' : 'AI'}`}
      </p>
    </div>

    <Button
      size="icon"
      type="button"
      variant="ghost"
      className="filliny-fixed filliny-right-4 filliny-top-4 filliny-h-8 filliny-w-8 filliny-rounded-full filliny-bg-white/10 filliny-text-white hover:filliny-bg-white/20"
      style={{ pointerEvents: 'auto' }}
      onClick={onDismiss}
      aria-label="Close overlay">
      <X className="filliny-h-4 filliny-w-4" />
    </Button>
  </>
);

interface OverlayContainerProps {
  overlayPosition: OverlayPosition;
  loading: boolean;
  formId: string;
  isFormLikelyOutOfView: boolean;
  onScrollToForm: () => void;
  children: React.ReactNode;
}

/**
 * Pure presentation component for the overlay container
 */
const OverlayContainer: React.FC<OverlayContainerProps> = ({
  overlayPosition,
  loading,
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
    pointerEvents: loading ? ('auto' as const) : ('none' as const),
    contain: 'layout style paint' as const,
    zIndex: 10000000,
    transition: 'all 0.3s ease',
  };

  return (
    <div
      ref={overlayRef}
      className={`filliny-pointer-events-auto filliny-fixed filliny-flex filliny-items-center filliny-justify-center filliny-transition-all filliny-duration-300 ${
        loading
          ? 'filliny-bg-black/40 filliny-backdrop-blur-sm'
          : 'filliny-rounded-lg filliny-bg-black/30 filliny-backdrop-blur-md hover:filliny-bg-black/40'
      } `}
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
 * This component follows separation of concerns:
 * - useFormElement: handles form element finding and scrolling
 * - useOverlayPosition: handles overlay position tracking
 * - useFormFill: handles form fill logic
 * - LoadingState, ActionButtons, OverlayContainer: pure presentation components
 */
const FormsOverlay: React.FC<OverlayProps> = ({ formId, initialPosition, onDismiss, testMode = false }) => {
  const buttonRef = useRef<HTMLButtonElement>(null);

  // Custom hooks for logic separation
  const { formRef, scrollToForm } = useFormElement(formId);
  const { overlayPosition, isFormLikelyOutOfView } = useOverlayPosition({ formRef, initialPosition });
  const { loading, handleFillClick } = useFormFill({ formId, testMode, onDismiss });

  return (
    <OverlayContainer
      overlayPosition={overlayPosition}
      loading={loading}
      formId={formId}
      isFormLikelyOutOfView={isFormLikelyOutOfView}
      onScrollToForm={scrollToForm}>
      {loading ? (
        <LoadingState />
      ) : (
        <ActionButtons
          loading={loading}
          testMode={testMode}
          isFormLikelyOutOfView={isFormLikelyOutOfView}
          onFillClick={handleFillClick}
          onDismiss={onDismiss}
          buttonRef={buttonRef}
        />
      )}
    </OverlayContainer>
  );
};

export { FormsOverlay };
