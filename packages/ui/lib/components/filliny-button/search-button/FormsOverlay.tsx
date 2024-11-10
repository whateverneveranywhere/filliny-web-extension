import React, { useState, useEffect } from 'react';
import { handleFormClick } from './handleFormClick';
import { X } from 'lucide-react';
import { disableOtherButtons, getFormPosition, showLoadingIndicator } from './overlayUtils';
import { Button } from '../../ui';
import type { OverlayPosition } from './types';

interface OverlayProps {
  formId: string;
  initialPosition: OverlayPosition;
  onDismiss: () => void;
}

const FormsOverlay: React.FC<OverlayProps> = ({ formId, initialPosition, onDismiss }) => {
  const [loading, setLoading] = useState(false);
  const [overlayPosition, setOverlayPosition] = useState<OverlayPosition>(initialPosition);

  useEffect(() => {
    const form = document.querySelector(`[data-form-id="${formId}"]`);

    if (form) {
      const updateOverlayPosition = () => {
        const updatedPosition = getFormPosition(form as HTMLFormElement);
        setOverlayPosition(updatedPosition);
      };

      updateOverlayPosition(); // Initial position

      // Observers to update overlay position when the form changes
      const resizeObserver = new ResizeObserver(updateOverlayPosition);
      const mutationObserver = new MutationObserver(updateOverlayPosition);

      resizeObserver.observe(form);
      mutationObserver.observe(form, { attributes: true, childList: true, subtree: true });

      return () => {
        resizeObserver.disconnect();
        mutationObserver.disconnect();
      };
    }
  }, [formId]);

  const handleFillClick = async (event: React.MouseEvent<HTMLButtonElement>) => {
    if (loading) return;

    setLoading(true);
    disableOtherButtons(formId);
    showLoadingIndicator(formId);

    try {
      await handleFormClick(event, formId);
    } finally {
      setLoading(false);
      onDismiss();
    }
  };

  return (
    <div
      className="filliny-pointer-events-auto filliny-absolute filliny-z-[10000000] filliny-flex filliny-items-center filliny-justify-center filliny-rounded-lg filliny-bg-black/20 filliny-backdrop-blur-sm"
      style={{
        top: `${overlayPosition.top}px`,
        left: `${overlayPosition.left}px`,
        width: `${overlayPosition.width}px`,
        height: `${overlayPosition.height}px`,
      }}
      data-highlight-overlay="true">
      <Button loading={loading} disabled={loading} type="button" variant="default" onClick={handleFillClick}>
        {loading ? 'Filling...' : 'Fill it out'}
      </Button>

      {!loading && (
        <Button
          size="icon"
          type="button"
          variant="destructive"
          className="filliny-absolute filliny-right-2.5 filliny-top-2.5 filliny-flex !filliny-size-8 !filliny-rounded-full"
          onClick={onDismiss}>
          <X />
        </Button>
      )}
    </div>
  );
};

export { FormsOverlay };
