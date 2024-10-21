import React, { useEffect, useState } from 'react';
import { handleFormClick } from './handleFormClick';
import { X } from 'lucide-react';
import { disableOtherButtons, showLoadingIndicator } from './overlayUtils';
import { Button } from '../../ui';

interface OverlayProps {
  formId: string;
  onDismiss: () => void;
}

const FormsOverlay: React.FC<OverlayProps> = ({ formId, onDismiss }) => {
  const [loading, setLoading] = useState(false);

  const handleFillClick = async (event: React.MouseEvent<HTMLButtonElement>) => {
    if (loading) {
      return;
    }

    setLoading(true);
    disableOtherButtons(formId);
    showLoadingIndicator(formId);
    await handleFormClick(event, formId);
    setLoading(false);
    onDismiss(); // Call onDismiss to clean up overlays
  };

  useEffect(() => {
    if (loading) {
      showLoadingIndicator(formId);
    }
  }, [loading, formId]);

  return (
    <div
      className="filliny-pointer-events-auto filliny-absolute filliny-inset-0 filliny-z-[10000000] filliny-flex filliny-items-center filliny-justify-center filliny-rounded-lg filliny-p-5"
      style={{
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        backdropFilter: 'blur(1px)',
        WebkitBackdropFilter: 'blur(1px)',
      }}
      data-highlight-overlay="true">
      <Button
        loading={loading}
        disabled={loading}
        type="button"
        variant="default"
        className="filliny-bg-black filliny-text-white"
        onClick={handleFillClick}
        onMouseOver={e => {
          e.currentTarget.classList.add('filliny-bg-gray-200', 'filliny-scale-105');
        }}
        onMouseOut={e => {
          e.currentTarget.classList.remove('filliny-bg-gray-200', 'filliny-scale-105');
        }}
        onFocus={e => {
          e.currentTarget.classList.add('filliny-bg-gray-200', 'filliny-scale-105');
        }}
        onBlur={e => {
          e.currentTarget.classList.remove('filliny-bg-gray-200', 'filliny-scale-105');
        }}>
        {loading ? 'Filling...' : 'Fill it out'}
      </Button>
      {!loading && (
        <Button
          size="icon"
          type="button"
          variant="ghost"
          className="filliny-pointer-events-auto filliny-absolute filliny-right-2.5 filliny-top-2.5 filliny-flex filliny-h-8 filliny-w-8 filliny-cursor-pointer filliny-items-center filliny-justify-center filliny-rounded-full filliny-border-none filliny-bg-red-600 filliny-p-0 filliny-text-lg filliny-leading-5 filliny-text-white filliny-shadow-lg filliny-transition-transform hover:filliny-scale-110 hover:filliny-bg-red-700"
          onClick={onDismiss}
          onMouseOver={e => {
            e.currentTarget.classList.add('filliny-bg-red-700', 'filliny-scale-110');
          }}
          onMouseOut={e => {
            e.currentTarget.classList.remove('filliny-bg-red-700', 'filliny-scale-110');
          }}
          onFocus={e => {
            e.currentTarget.classList.add('filliny-bg-red-700', 'filliny-scale-110');
          }}
          onBlur={e => {
            e.currentTarget.classList.remove('filliny-bg-red-700', 'filliny-scale-110');
          }}>
          <X className="filliny-size-2 filliny-text-white" />
        </Button>
      )}
    </div>
  );
};

export { FormsOverlay };
