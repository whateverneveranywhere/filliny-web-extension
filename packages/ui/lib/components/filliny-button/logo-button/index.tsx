import { Button } from '../../ui';
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
      <Button
        variant={'default'}
        size={'icon'}
        className={cn(
          '!filliny-size-14 !filliny-rounded-full !filliny-p-0 filliny-overflow-hidden filliny-shadow-lg',
          animationClasses.transition,
          // Default state: full black background
          '!filliny-bg-black',
          // Hover state: white background (only when this button is directly hovered)
          'hover:!filliny-bg-white',
          // Wand icon color changes on direct hover
          '[&:hover_.filliny-wand-icon]:filliny-text-black [&:not(:hover)_.filliny-wand-icon]:filliny-text-white',
        )}
        onClick={() => highlightForms({ visionOnly: false })}
        disabled={!isDOMReady}>
        <div className="filliny-relative filliny-size-full filliny-flex filliny-items-center filliny-justify-center">
          {/* Wand icon - always visible, color changes on direct button hover */}
          <div className="filliny-flex filliny-items-center filliny-justify-center">
            <Wand2 className={cn('filliny-wand-icon filliny-size-8', animationClasses.transition)} />
          </div>
        </div>
      </Button>
    </div>
  );
};

export { LogoButton };
