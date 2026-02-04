import { t } from '@extension/i18n';
import { ToggleButton } from '@extension/ui';
import { useEffect } from 'react';

export default function App() {
  useEffect(() => {
    console.log('[CEB] Content ui example loaded');
  }, []);

  return (
    <div className="filliny-flex filliny-items-center filliny-justify-between filliny-gap-2 filliny-rounded filliny-bg-muted filliny-px-2 filliny-py-1">
      <div className="filliny-flex filliny-gap-1 filliny-text-xs filliny-text-muted-foreground">
        Edit <strong className="filliny-text-foreground">pages/content-ui/src/matches/example/App.tsx</strong> and save
        to reload.
      </div>
      <ToggleButton className={'filliny-mt-0'}>{t('toggleTheme')}</ToggleButton>
    </div>
  );
}
