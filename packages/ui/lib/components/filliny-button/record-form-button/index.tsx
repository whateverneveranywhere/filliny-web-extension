import { Button } from '../../ui';
import { highlightForms } from '../search-button/highlightForms';
import { useDOMReady } from '@/lib/utils/dom-utils';
import type { ButtonComponentProps } from '../button-wrapper';
import type React from 'react';

const RecordFormButton: React.FC<ButtonComponentProps> = () => {
  const isDOMReady = useDOMReady();

  return (
    <Button
      variant={'default'}
      size={'icon'}
      className="filliny-size-9 filliny-rounded-full filliny-bg-primary filliny-text-primary-foreground hover:filliny-bg-primary/90"
      onClick={() => highlightForms({ visionOnly: true })}
      disabled={!isDOMReady}>
      <div className="filliny-size-4 filliny-rounded-full filliny-bg-destructive" />
    </Button>
  );
};

export { RecordFormButton };
