import React, { useEffect, useState } from 'react';

import { highlightForms } from '../search-button/highlightForms';
import { Button } from '../../ui';
import { TestTube } from 'lucide-react';

export function FillinyTestModeFillerButton() {
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
      className="!filliny-size-8 filliny-overflow-hidden !filliny-rounded-full !filliny-p-1"
      onClick={() => highlightForms({ visionOnly: false, testMode: true })}
      disabled={!isDOMReady}>
      <TestTube className="filliny-h-4 filliny-w-4" />
    </Button>
  );
}
