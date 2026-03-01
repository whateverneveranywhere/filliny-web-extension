import { highlightForms } from '../search-button/highlightForms';
import { showQuotaExceededToast } from '../search-button/toastHelpers';
import { animationClasses } from '@/lib/animations';
import { cn } from '@/lib/utils';
import { useDOMReady } from '@/lib/utils/dom-utils';
import { Loader2, Wand2 } from 'lucide-react';
import { useState, useCallback } from 'react';
import type { ButtonComponentProps } from '../button-wrapper';
import type React from 'react';

interface LogoButtonProps extends ButtonComponentProps {
  canFillForms?: boolean;
  disabledReason?: string | null;
  hasFields?: boolean;
  isFilling?: boolean;
}

const LogoButton: React.FC<LogoButtonProps> = ({
  canFillForms = true,
  disabledReason = null,
  hasFields = true,
  isFilling = false,
}) => {
  const isDOMReady = useDOMReady();
  const [isLoading, setIsLoading] = useState(false);
  const isDisabled = !isDOMReady || !canFillForms || !hasFields || isLoading || isFilling;

  const handleClick = useCallback(async () => {
    if (!canFillForms) {
      if (disabledReason?.toLowerCase().includes('quota') || disabledReason?.toLowerCase().includes('limit')) {
        showQuotaExceededToast();
      } else {
        const { showInfoToast } = await import('../search-button/toastHelpers');
        showInfoToast('Form Filling Unavailable', disabledReason || 'Form filling is currently unavailable.');
      }
      return;
    }

    setIsLoading(true);
    try {
      await highlightForms({ visionOnly: false });
    } finally {
      setIsLoading(false);
    }
  }, [canFillForms, disabledReason]);

  const getTitle = () => {
    if (isFilling) return 'AI is filling in your form fields...';
    if (isLoading) return 'Scanning page for fillable fields — this may take a moment...';
    if (!canFillForms) {
      if (disabledReason?.toLowerCase().includes('token')) {
        return 'Token limit reached — your tokens will refresh on your next billing cycle. Consider upgrading your plan for more tokens.';
      }
      if (disabledReason?.toLowerCase().includes('free forms') || disabledReason?.toLowerCase().includes('quota')) {
        return "You've used all your free form fills this period — upgrade to Pro for unlimited AI-powered form filling.";
      }
      return disabledReason || 'Form filling is temporarily unavailable — please try again in a moment.';
    }
    if (!hasFields)
      return "No forms detected — this page doesn't appear to have fillable forms. Try navigating to a page with a sign-up, contact, or application form.";
    return 'Click to auto-fill all form fields on this page with AI';
  };

  return (
    <div className={cn(animationClasses.transitionFast, 'hover:filliny-scale-105 active:filliny-scale-95')}>
      <button
        type="button"
        className={cn(
          'filliny-flex filliny-items-center filliny-justify-center',
          // Size - much larger main button (prominent CTA)
          'filliny-size-14 filliny-rounded-full filliny-p-0',
          // Gray glass design - very intense blur, nearly opaque
          'filliny-bg-zinc-800/90 filliny-backdrop-blur-3xl',
          'filliny-text-white',
          'filliny-border filliny-border-white/10',
          'filliny-shadow-lg filliny-overflow-hidden',
          // Hover state - subtle bg change only, icon stays white
          'hover:filliny-bg-zinc-700/95 hover:filliny-border-white/15',
          'hover:filliny-shadow-xl',
          // Disabled: no opacity change, just cursor + muted border
          'disabled:filliny-cursor-not-allowed disabled:hover:filliny-scale-100',
          animationClasses.transition,
        )}
        onClick={handleClick}
        disabled={isDisabled}
        title={getTitle()}>
        {isLoading || isFilling ? (
          <Loader2 className="filliny-size-6 filliny-animate-spin filliny-text-white" />
        ) : (
          <Wand2 className={cn('filliny-size-6', isDisabled ? 'filliny-text-white/50' : 'filliny-text-white')} />
        )}
      </button>
    </div>
  );
};

export { LogoButton };
