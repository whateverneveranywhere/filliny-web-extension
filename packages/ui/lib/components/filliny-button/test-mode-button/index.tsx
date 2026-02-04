import { Button } from '../../ui';
import { highlightForms } from '../search-button/highlightForms';
import { cn, iconButtonClasses } from '@/lib/utils';
import { useDOMReady } from '@/lib/utils/dom-utils';
import { TestTube } from 'lucide-react';

export const FillinyTestModeFillerButton = () => {
  const isDOMReady = useDOMReady();

  return (
    <Button
      variant="default"
      size="icon"
      onClick={() => highlightForms({ visionOnly: false, testMode: true })}
      disabled={!isDOMReady}
      className={cn(iconButtonClasses, 'filliny-text-primary-foreground')}>
      <TestTube className="filliny-size-4" />
    </Button>
  );
};
