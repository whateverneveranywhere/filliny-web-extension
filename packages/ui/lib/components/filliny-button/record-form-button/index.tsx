import React, { useEffect, useState } from 'react';
import { highlightForms } from '../search-button/highlightForms';
import type { ButtonComponentProps } from '../button-wrapper';
import { Button } from '../../ui';

const RecordFormButton: React.FC<ButtonComponentProps> = () => {
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
      className="filliny-size-9 filliny-rounded-full filliny-bg-black filliny-text-white hover:filliny-bg-black"
      onClick={() => highlightForms({ visionOnly: true })}
      disabled={!isDOMReady}>
      <div className="filliny-size-4 filliny-rounded-full filliny-bg-red-500" />
    </Button>
  );
};

export { RecordFormButton };
