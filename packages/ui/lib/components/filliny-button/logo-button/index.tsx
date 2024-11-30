import React, { useEffect, useState } from 'react';
import { highlightForms } from '../search-button/highlightForms';
import type { ButtonComponentProps } from '../button-wrapper';
import { Button } from '../../ui';
import { Logo } from '../../Logo';
import { Wand2 } from 'lucide-react';

const LogoButton: React.FC<ButtonComponentProps> = ({ isHovered }) => {
  const [isDOMReady, setIsDOMReady] = useState(false);

  useEffect(() => {
    const handleLoad = () => {
      setIsDOMReady(true);
    };

    const handleUnload = () => {
      setIsDOMReady(false);
    };

    if (document.readyState === 'complete') {
      setIsDOMReady(true);
    } else {
      window.addEventListener('load', handleLoad);
      window.addEventListener('beforeunload', handleUnload);
    }

    return () => {
      window.removeEventListener('load', handleLoad);
      window.removeEventListener('beforeunload', handleUnload);
    };
  }, []);

  return (
    <Button
      variant={'default'}
      size={'icon'}
      className="!filliny-size-16 !filliny-rounded-full !filliny-p-0 filliny-transition-all"
      onClick={() => highlightForms({ visionOnly: false })}
      disabled={!isDOMReady}>
      <div className="filliny-relative">
        <div
          className={`filliny-transition-opacity filliny-duration-300 ${isHovered ? 'filliny-opacity-0' : 'filliny-opacity-100'}`}>
          <Logo width={300} height={300} />
        </div>
        <div
          className={`filliny-absolute filliny-inset-0 filliny-flex filliny-items-center filliny-justify-center filliny-transition-opacity filliny-duration-300 ${
            isHovered ? 'filliny-opacity-100' : 'filliny-opacity-0'
          }`}>
          <Wand2 className="filliny-h-8 filliny-w-8" />
        </div>
      </div>
    </Button>
  );
};

export { LogoButton };
