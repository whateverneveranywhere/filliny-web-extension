import React, { useState, useEffect, useRef } from 'react';
import { handleFormClick } from './handleFormClick';
import { X, Wand2, Loader2 } from 'lucide-react';
import { disableOtherButtons, showLoadingIndicator } from './overlayUtils';
import { Button } from '../../ui';
import type { OverlayPosition } from './types';

interface OverlayProps {
  formId: string;
  initialPosition: OverlayPosition;
  onDismiss: () => void;
  testMode?: boolean;
}

const FormsOverlay: React.FC<OverlayProps> = ({ formId, initialPosition, onDismiss, testMode = false }) => {
  const [loading, setLoading] = useState(false);
  const [overlayPosition, setOverlayPosition] = useState<OverlayPosition>(initialPosition);
  const overlayRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const form = document.querySelector(`[data-form-id="${formId}"]`);
    if (!form) return;

    let rafId: number;
    let isUpdating = false;

    const updateOverlayPosition = () => {
      if (!form || isUpdating) return;
      isUpdating = true;

      const formRect = form.getBoundingClientRect();
      const viewportHeight = window.innerHeight;

      // Calculate the visible portion of the form
      const formTop = formRect.top;
      const formBottom = formRect.bottom;

      // Check if form is at least partially visible
      const isFormVisible = formBottom > 0 && formTop < viewportHeight;

      if (isFormVisible) {
        const visibleTop = Math.max(0, formTop);
        const visibleBottom = Math.min(viewportHeight, formBottom);
        const visibleHeight = Math.max(0, visibleBottom - visibleTop);

        setOverlayPosition({
          // Use viewport-relative positioning
          top: visibleTop,
          left: formRect.left,
          width: formRect.width,
          height: visibleHeight,
        });
      }

      isUpdating = false;
    };

    const handleScroll = () => {
      if (rafId) {
        cancelAnimationFrame(rafId);
      }
      rafId = requestAnimationFrame(updateOverlayPosition);
    };

    // Update on scroll
    window.addEventListener('scroll', handleScroll, { passive: true });
    document.addEventListener('scroll', handleScroll, { passive: true, capture: true });

    // Update on resize
    const resizeObserver = new ResizeObserver(handleScroll);
    resizeObserver.observe(form);
    resizeObserver.observe(document.documentElement);

    // Update on DOM changes
    const mutationObserver = new MutationObserver(handleScroll);
    mutationObserver.observe(form, {
      attributes: true,
      childList: true,
      subtree: true,
      characterData: true,
    });

    // Initial position
    updateOverlayPosition();

    return () => {
      if (rafId) {
        cancelAnimationFrame(rafId);
      }
      window.removeEventListener('scroll', handleScroll);
      document.removeEventListener('scroll', handleScroll, { capture: true });
      resizeObserver.disconnect();
      mutationObserver.disconnect();
    };
  }, [formId]);

  const handleFillClick = async (event: React.MouseEvent<HTMLButtonElement>) => {
    if (loading) return;
    setLoading(true);
    disableOtherButtons(formId);
    showLoadingIndicator(formId);

    try {
      await handleFormClick(event, formId, testMode);
    } finally {
      setLoading(false);
      onDismiss();
    }
  };

  return (
    <div
      ref={overlayRef}
      className={`
        filliny-pointer-events-auto filliny-fixed
        filliny-z-[10000000] filliny-flex
        filliny-items-center filliny-justify-center
        filliny-transition-all filliny-duration-300
        ${
          loading
            ? 'filliny-bg-black/40 filliny-backdrop-blur-sm'
            : 'filliny-rounded-lg filliny-bg-black/30 filliny-backdrop-blur-md hover:filliny-bg-black/40'
        }
      `}
      style={{
        top: `${overlayPosition.top}px`,
        left: `${overlayPosition.left}px`,
        width: `${overlayPosition.width}px`,
        height: `${overlayPosition.height}px`,
      }}
      data-highlight-overlay="true">
      {loading ? (
        <div className="filliny-flex filliny-flex-col filliny-items-center filliny-gap-4 filliny-text-white">
          <div className="filliny-h-8 filliny-w-8 filliny-animate-spin">
            <Loader2 className="filliny-h-full filliny-w-full" />
          </div>
          <div className="filliny-text-center">
            <p className="filliny-text-lg filliny-font-semibold">Filling Your Form</p>
            <p className="filliny-text-sm filliny-text-white/80">AI is intelligently completing your form fields...</p>
          </div>
        </div>
      ) : (
        <>
          <div className="filliny-fixed filliny-left-1/2 filliny-top-1/2 filliny-z-[10000001] filliny-flex filliny-w-full filliny-max-w-fit filliny--translate-x-1/2 filliny--translate-y-1/2 filliny-flex-col filliny-items-center filliny-gap-3">
            <div className="filliny-rounded-full filliny-bg-white/10 filliny-p-1">
              <Button
                ref={buttonRef}
                loading={loading}
                disabled={loading}
                type="button"
                size="lg"
                variant="default"
                onClick={handleFillClick}>
                <Wand2 className="filliny-h-5 filliny-w-5" />
                Auto-Fill Form
              </Button>
            </div>
            <p className="filliny-text-sm filliny-text-white/80">Click to automatically fill out this form with AI</p>
          </div>

          <Button
            size="icon"
            type="button"
            variant="ghost"
            className="filliny-fixed filliny-right-4 filliny-top-4 filliny-h-8 filliny-w-8 filliny-rounded-full filliny-bg-white/10 filliny-text-white hover:filliny-bg-white/20"
            onClick={onDismiss}>
            <X className="filliny-h-4 filliny-w-4" />
          </Button>
        </>
      )}
    </div>
  );
};

export { FormsOverlay };
