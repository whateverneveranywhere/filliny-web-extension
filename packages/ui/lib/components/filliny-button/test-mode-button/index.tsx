import { highlightForms } from '../search-button/highlightForms';
import { cn, iconButtonClasses } from '@/lib/utils';
import { useDOMReady } from '@/lib/utils/dom-utils';
import { TestTube } from 'lucide-react';

export const FillinyTestModeFillerButton = () => {
  const isDOMReady = useDOMReady();

  return (
    <button
      type="button"
      onClick={() => highlightForms({ visionOnly: false, testMode: true })}
      disabled={!isDOMReady}
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
      )}>
      <TestTube className="filliny-size-4 filliny-text-white" />
    </button>
  );
};
