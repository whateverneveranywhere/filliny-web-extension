import { Logo } from '../../logo';
import { Button } from '../../ui';
import { highlightForms } from '../search-button/highlightForms';
import { useDOMReady } from '@/lib/utils/dom-utils';
import { cn } from '@/lib/utils';
import { animationClasses } from '@/lib/animations';
import { Wand2 } from 'lucide-react';
import type { ButtonComponentProps } from '../button-wrapper';
import type React from 'react';

const LogoButton: React.FC<ButtonComponentProps> = ({ isHovered }) => {
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
          // Hover state: white background
          'hover:!filliny-bg-white',
        )}
        onClick={() => highlightForms({ visionOnly: false })}
        disabled={!isDOMReady}>
        <div className="filliny-relative filliny-size-full filliny-flex filliny-items-center filliny-justify-center">
          {/* Logo - visible by default, hidden on hover */}
          <div
            className={cn(
              'filliny-absolute filliny-flex filliny-items-center filliny-justify-center',
              animationClasses.transition,
              isHovered ? 'filliny-opacity-0 filliny-scale-90' : 'filliny-opacity-100 filliny-scale-100',
            )}>
            <Logo width={40} height={40} />
          </div>
          {/* Wand icon - hidden by default, visible on hover */}
          <div
            className={cn(
              'filliny-absolute filliny-flex filliny-items-center filliny-justify-center',
              animationClasses.transition,
              isHovered ? 'filliny-opacity-100 filliny-scale-100' : 'filliny-opacity-0 filliny-scale-90',
            )}>
            <Wand2 className="filliny-size-8 filliny-text-black" />
          </div>
        </div>
      </Button>
    </div>
  );
};

export { LogoButton };
