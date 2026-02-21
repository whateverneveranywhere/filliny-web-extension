import { highlightForms } from '../search-button/highlightForms';
import { showQuotaExceededToast } from '../search-button/toastHelpers';
import { animationClasses } from '@/lib/animations';
import { cn } from '@/lib/utils';
import { useDOMReady } from '@/lib/utils/dom-utils';
import { Wand2 } from 'lucide-react';
import type { ButtonComponentProps } from '../button-wrapper';
import type React from 'react';

interface LogoButtonProps extends ButtonComponentProps {
  canFillForms?: boolean;
  disabledReason?: string | null;
}

const LogoButton: React.FC<LogoButtonProps> = ({ canFillForms = true, disabledReason = null }) => {
  const isDOMReady = useDOMReady();
  const isDisabled = !isDOMReady || !canFillForms;

  const handleClick = () => {
    if (!canFillForms) {
      if (disabledReason?.toLowerCase().includes('quota') || disabledReason?.toLowerCase().includes('limit')) {
        showQuotaExceededToast();
      } else {
        import('../search-button/toastHelpers').then(({ showInfoToast }) => {
          showInfoToast('Form Filling Unavailable', disabledReason || 'Form filling is currently unavailable.');
        });
      }
      return;
    }
    highlightForms({ visionOnly: false });
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
        title={!canFillForms ? disabledReason || 'Form filling unavailable' : 'Autofill with AI'}>
        <Wand2 className={cn('filliny-size-6', !canFillForms ? 'filliny-text-white/50' : 'filliny-text-white')} />
      </button>
    </div>
  );
};

export { LogoButton };
