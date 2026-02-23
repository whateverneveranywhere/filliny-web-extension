import { ButtonWrapper } from './button-wrapper';
import { DragButton } from './drag-button';
import { FillinyVisionButton } from './filliny-vision-button';
import { LogoButton } from './logo-button';
import { FieldFillManager } from './search-button/components/FieldFillManager';
import { FillinyTestModeFillerButton } from './test-mode-button';
import { useStorage } from '@extension/shared';
import { positionStorage, fieldButtonsStorage } from '@extension/storage';
import { useState, useEffect, useCallback, useRef } from 'react';
import type { ButtonComponentProps } from './button-wrapper';

interface ButtonConfig {
  Component: React.FC<ButtonComponentProps>;
  tooltipContent: string;
}

interface Position {
  x: number;
  y: number;
}

const MIN_Y = 20;
const BOTTOM_PADDING = 150;
const DRAG_ACTIVATION_DISTANCE = 8;

const buttonComponents: ButtonConfig[] = [
  {
    Component: FillinyVisionButton,
    tooltipContent: 'Highlight all fillable fields on this page',
  },
  {
    Component: FillinyTestModeFillerButton,
    tooltipContent: 'Fill form with test data (dev mode)',
  },
  {
    Component: DragButton,
    tooltipContent: 'Drag to reposition',
  },
];

const clampY = (y: number) => Math.min(Math.max(y, MIN_Y), window.innerHeight - BOTTOM_PADDING);

const DraggableButton = ({
  position,
  canFillForms,
  disabledReason,
  hasFields,
  onDragEnd,
}: {
  position: Position;
  canFillForms: boolean;
  disabledReason?: string | null;
  hasFields: boolean;
  onDragEnd: (newY: number) => void;
}) => {
  const [isHovered, setIsHovered] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [dragDeltaY, setDragDeltaY] = useState(0);

  // Refs for drag state to avoid stale closures in pointer handlers
  const startYRef = useRef(0);
  const draggingRef = useRef(false);
  const activatedRef = useRef(false);

  const handlePointerDown = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    e.currentTarget.setPointerCapture(e.pointerId);
    startYRef.current = e.clientY;
    draggingRef.current = false;
    activatedRef.current = false;
    setDragDeltaY(0);
    e.preventDefault();
  }, []);

  const handlePointerMove = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    if (!e.currentTarget.hasPointerCapture(e.pointerId)) return;
    const dy = e.clientY - startYRef.current;

    // Require minimum distance before activating drag (prevents accidental drags on click)
    if (!activatedRef.current) {
      if (Math.abs(dy) < DRAG_ACTIVATION_DISTANCE) return;
      activatedRef.current = true;
      draggingRef.current = true;
      setIsDragging(true);
    }

    setDragDeltaY(dy);
  }, []);

  const handlePointerUp = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      if (e.currentTarget.hasPointerCapture(e.pointerId)) {
        e.currentTarget.releasePointerCapture(e.pointerId);
      }

      if (draggingRef.current) {
        const dy = e.clientY - startYRef.current;
        onDragEnd(clampY(position.y + dy));
      }

      draggingRef.current = false;
      activatedRef.current = false;
      setIsDragging(false);
      setDragDeltaY(0);
    },
    [position.y, onDragEnd],
  );

  // Safety net: if pointer capture is lost unexpectedly, reset drag state
  const handleLostPointerCapture = useCallback(() => {
    if (draggingRef.current) {
      draggingRef.current = false;
      activatedRef.current = false;
      setIsDragging(false);
      setDragDeltaY(0);
    }
  }, []);

  const transformStyle = isDragging ? `translate3d(0, ${dragDeltaY}px, 0)` : undefined;

  const style: React.CSSProperties = {
    position: 'fixed',
    top: position.y,
    right: 10,
    transform: transformStyle,
    touchAction: 'none',
    zIndex: 2147483647,
    fontSize: '16px',
    lineHeight: '1.5',
    boxSizing: 'border-box',
  };

  const handleMouseEnter = useCallback(() => setIsHovered(true), []);
  const handleMouseLeave = useCallback(() => setIsHovered(false), []);

  const getLogoTooltip = () => {
    if (!canFillForms) {
      if (disabledReason?.toLowerCase().includes('token')) {
        return 'Token limit reached — your tokens will refresh on your next billing cycle. Upgrade for more tokens.';
      }
      if (disabledReason?.toLowerCase().includes('free forms') || disabledReason?.toLowerCase().includes('quota')) {
        return "You've used all your free form fills — upgrade to Pro for unlimited AI-powered form filling.";
      }
      return disabledReason || 'Form filling is temporarily unavailable — please try again in a moment.';
    }
    if (!hasFields) return 'No forms detected on this page — navigate to a page with a form to start filling.';
    return 'Click to auto-fill all detected form fields with AI';
  };

  return (
    <div
      style={style}
      className="filliny-group filliny-flex filliny-transform-gpu filliny-cursor-pointer filliny-items-center"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}>
      <div className="filliny-flex filliny-flex-row filliny-items-center filliny-gap-1">
        {/* Secondary buttons - appear to the LEFT of main button */}
        {buttonComponents.map((button, index) => {
          if (button.Component === DragButton) {
            return (
              <ButtonWrapper
                key={index}
                isHovered={isHovered}
                isDragging={isDragging}
                tooltipContent={button.tooltipContent}>
                <div
                  className="filliny-cursor-grab active:filliny-cursor-grabbing"
                  onPointerDown={handlePointerDown}
                  onPointerMove={handlePointerMove}
                  onPointerUp={handlePointerUp}
                  onLostPointerCapture={handleLostPointerCapture}>
                  <button.Component isHovered={isHovered} isDragging={isDragging} />
                </div>
              </ButtonWrapper>
            );
          }
          return (
            <ButtonWrapper
              key={index}
              isHovered={isHovered}
              isDragging={isDragging}
              tooltipContent={button.tooltipContent}>
              <button.Component isHovered={isHovered} isDragging={isDragging} />
            </ButtonWrapper>
          );
        })}
        {/* Main logo button - stays on the RIGHT with tooltip */}
        <div className="filliny-z-[9999999]">
          <ButtonWrapper isHovered={true} isDragging={false} tooltipContent={getLogoTooltip()}>
            <LogoButton
              isHovered={isHovered}
              isDragging={isDragging}
              canFillForms={canFillForms}
              disabledReason={disabledReason}
              hasFields={hasFields}
            />
          </ButtonWrapper>
        </div>
      </div>
    </div>
  );
};

interface FillinyButtonProps {
  canFillForms?: boolean;
  disabledReason?: string | null;
}

const FillinyButton: React.FC<FillinyButtonProps> = ({ canFillForms = true, disabledReason = null }) => {
  const savedPosition = useStorage(positionStorage);
  const fieldButtonSettings = useStorage(fieldButtonsStorage);
  const [position, setPosition] = useState<Position>(savedPosition);
  const [detectedFieldCount, setDetectedFieldCount] = useState<number>(0);
  const [isOverlayActive, setIsOverlayActive] = useState(false);

  // Track overlay active state to hide the button while overlay is shown
  useEffect(() => {
    const checkOverlayActive = () => {
      const hasActiveOverlay = document.querySelector('[data-filliny-overlay-active="true"]') !== null;
      setIsOverlayActive(hasActiveOverlay);
    };

    // Initial check
    checkOverlayActive();

    // Listen for custom overlay state change events
    document.addEventListener('filliny:overlayStateChanged', checkOverlayActive);

    // Also observe DOM for attribute changes as fallback
    const observer = new MutationObserver(checkOverlayActive);
    observer.observe(document.body, {
      attributes: true,
      attributeFilter: ['data-filliny-overlay-active'],
      subtree: true,
    });

    return () => {
      document.removeEventListener('filliny:overlayStateChanged', checkOverlayActive);
      observer.disconnect();
    };
  }, []);

  const handleFieldCountChange = useCallback((count: number) => {
    setDetectedFieldCount(count);
  }, []);

  // On first mount, if position was never set by user (y < MIN_Y), center vertically
  useEffect(() => {
    if (savedPosition.y < MIN_Y) {
      const centeredY = Math.round(window.innerHeight / 2 - 28); // 28 = half of button height (56px)
      const clampedY = clampY(centeredY);
      const centeredPosition = { x: 0, y: clampedY };
      setPosition(centeredPosition);
      positionStorage.setPosition(centeredPosition);
    }
    // Only run on initial mount
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Sync position state with storage when savedPosition changes
  useEffect(() => {
    if (savedPosition.y >= MIN_Y) {
      setPosition(savedPosition);
    }
  }, [savedPosition]);

  // Store preference in DOM for easy access by field buttons
  useEffect(() => {
    if (fieldButtonSettings) {
      document.body.setAttribute('data-filliny-prefer-test-mode', String(fieldButtonSettings.preferTestMode));
    }
  }, [fieldButtonSettings]);

  const handleDragEnd = useCallback(
    async (newY: number) => {
      const newPosition = { ...position, y: newY };
      setPosition(newPosition);
      await positionStorage.setPosition(newPosition);
    },
    [position],
  );

  return (
    <>
      {!isOverlayActive && (
        <DraggableButton
          position={position}
          canFillForms={canFillForms}
          disabledReason={disabledReason}
          hasFields={detectedFieldCount > 0}
          onDragEnd={handleDragEnd}
        />
      )}
      <FieldFillManager
        canFillForms={canFillForms}
        disabledReason={disabledReason}
        onFieldCountChange={handleFieldCountChange}
        showButtons={fieldButtonSettings?.enabled}
      />
    </>
  );
};

export { FillinyButton };
