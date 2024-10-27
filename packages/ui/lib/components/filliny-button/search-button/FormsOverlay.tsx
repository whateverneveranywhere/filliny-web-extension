// FormsOverlay.tsx
import React, { useState } from 'react';
import { handleFormClick } from './handleFormClick';
import { X } from 'lucide-react';
import { disableOtherButtons, showLoadingIndicator } from './overlayUtils';
import { Button } from '../../ui';

interface OverlayProps {
  formId: string;
  position: {
    top: number;
    left: number;
    width: number;
    height: number;
  };
  onDismiss: () => void;
}

const FormsOverlay: React.FC<OverlayProps> = ({ formId, position, onDismiss }) => {
  const [loading, setLoading] = useState(false);

  const handleFillClick = async (event: React.MouseEvent<HTMLButtonElement>) => {
    if (loading) return;

    setLoading(true);
    disableOtherButtons(formId);
    showLoadingIndicator(formId);
    await handleFormClick(event, formId);
    setLoading(false);
    onDismiss();
  };

  return (
    <div
      className="filliny-fixed filliny-z-[10000000] filliny-flex filliny-items-center filliny-justify-center filliny-rounded-lg filliny-bg-black/50 filliny-backdrop-blur-sm"
      style={{
        top: `${position.top}px`,
        left: `${position.left}px`,
        width: `${position.width}px`,
        height: `${position.height}px`,
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
          className={
            'filliny-absolute filliny-right-2.5 filliny-top-2.5 filliny-flex !filliny-size-8 !filliny-rounded-full'
          }
          onClick={onDismiss}>
          <X />
        </Button>
      )}
    </div>
  );
};

export { FormsOverlay };
