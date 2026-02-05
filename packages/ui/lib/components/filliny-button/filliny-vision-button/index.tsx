import { highlightForms } from '../search-button/highlightForms';
import { cn, iconButtonClasses } from '@/lib/utils';
import { useDOMReady } from '@/lib/utils/dom-utils';
import { Eye } from 'lucide-react';
import type { ButtonComponentProps } from '../button-wrapper';
import type React from 'react';

const FillinyVisionButton: React.FC<ButtonComponentProps> = () => {
  const isDOMReady = useDOMReady();

  return (
    <button
      type="button"
      className={cn(
        'filliny-flex filliny-items-center filliny-justify-center',
        iconButtonClasses,
        // Gray glass design - very intense blur, nearly opaque
        'filliny-bg-zinc-800/90 filliny-backdrop-blur-3xl',
        'filliny-text-white',
        'filliny-border filliny-border-white/10',
        // Hover - subtle bg change only, icon stays white, scale up
        'hover:filliny-bg-zinc-700/95 hover:filliny-border-white/15 hover:filliny-scale-125',
        'disabled:filliny-opacity-50 disabled:filliny-cursor-not-allowed',
        'filliny-transition-all filliny-duration-200',
      )}
      onClick={() => highlightForms({ visionOnly: true })}
      disabled={!isDOMReady}>
      <Eye className="filliny-size-4 filliny-text-white" />
    </button>
  );
};

export { FillinyVisionButton };
