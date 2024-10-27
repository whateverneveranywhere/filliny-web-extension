import React, { useEffect, useState } from 'react';
import { Eye } from 'lucide-react';
import { highlightForms } from '../search-button/highlightForms';
import type { ButtonComponentProps } from '../button-wrapper';
import { Button } from '../../ui';

const FillinyVisionButton: React.FC<ButtonComponentProps> = () => {
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
      className="filliny-size-9 filliny-overflow-hidden !filliny-rounded-full filliny-text-white"
      onClick={() => highlightForms({ visionOnly: true })}
      disabled={!isDOMReady}>
      <Eye className="filliny-size-4" />
    </Button>
  );
};

export { FillinyVisionButton };
