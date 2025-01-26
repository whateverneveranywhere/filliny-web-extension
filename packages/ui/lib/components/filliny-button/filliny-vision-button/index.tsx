import React from 'react';
import { Eye } from 'lucide-react';
import { highlightForms } from '../search-button/highlightForms';
import type { ButtonComponentProps } from '../button-wrapper';
import { Button } from '../../ui';
import { useDOMReady } from '@/lib/utils/dom-utils';

const FillinyVisionButton: React.FC<ButtonComponentProps> = () => {
  const isDOMReady = useDOMReady();

  return (
    <Button
      variant={'default'}
      size={'icon'}
      className="filliny-size-10 filliny-min-h-10 filliny-min-w-10 filliny-overflow-hidden !filliny-rounded-full filliny-text-white"
      onClick={() => highlightForms({ visionOnly: true })}
      disabled={!isDOMReady}>
      <Eye className="filliny-size-4" />
    </Button>
  );
};

export { FillinyVisionButton };
