import { highlightForms } from '../search-button/highlightForms';
import { animationClasses } from '@/lib/animations';
import { cn } from '@/lib/utils';
import { useDOMReady } from '@/lib/utils/dom-utils';
import { Wand2 } from 'lucide-react';
import type { ButtonComponentProps } from '../button-wrapper';
import type React from 'react';

const LogoButton: React.FC<ButtonComponentProps> = () => {
  const isDOMReady = useDOMReady();

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
          'disabled:filliny-opacity-50 disabled:filliny-cursor-not-allowed',
          animationClasses.transition,
        )}
        onClick={() => highlightForms({ visionOnly: false })}
        disabled={!isDOMReady}>
        <Wand2 className="filliny-size-6 filliny-text-white" />
      </button>
    </div>
  );
};

export { LogoButton };
