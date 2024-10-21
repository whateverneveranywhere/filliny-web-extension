import React, { useEffect, useState } from 'react';

import { highlightForms } from '../search-button/highlightForms';
import type { ButtonComponentProps } from '../button-wrapper';
import { Button } from '../../ui';
import { Logo } from '../../Logo';

const LogoButton: React.FC<ButtonComponentProps> = () => {
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
      className="filliny-size-16 filliny-rounded-full"
      onClick={() => highlightForms({ visionOnly: false })}
      disabled={!isDOMReady}>
      <Logo width={70} height={70} />
    </Button>
  );
};

export { LogoButton };
