import '@src/Popup.css';
import { t } from '@extension/i18n';
import { PROJECT_URL_OBJECT, useStorage } from '@extension/shared';
import { exampleThemeStorage } from '@extension/storage';
import { cn, ToggleButton, withPageWrapper } from '@extension/ui';

const notificationOptions = {
  type: 'basic',
  iconUrl: chrome.runtime.getURL('icon-34.png'),
  title: 'Injecting content script error',
  message: 'You cannot inject script here!',
} as const;

const Popup = () => {
  const { isLight } = useStorage(exampleThemeStorage);
  const logo = isLight ? 'popup/logo_vertical.svg' : 'popup/logo_vertical_dark.svg';

  const goGithubSite = () => chrome.tabs.create(PROJECT_URL_OBJECT);

  const injectContentScript = async () => {
    const [tab] = await chrome.tabs.query({ currentWindow: true, active: true });

    if (tab.url!.startsWith('about:') || tab.url!.startsWith('chrome:')) {
      chrome.notifications.create('inject-error', notificationOptions);
    }

    await chrome.scripting
      .executeScript({
        target: { tabId: tab.id! },
        files: ['/content-runtime/example.iife.js', '/content-runtime/all.iife.js'],
      })
      .catch(err => {
        // Handling errors related to other paths
        if (err.message.includes('Cannot access a chrome:// URL')) {
          chrome.notifications.create('inject-error', notificationOptions);
        }
      });
  };

  return (
    <div className={cn('App', isLight ? 'filliny-bg-secondary' : 'filliny-bg-background')}>
      <header className={cn('App-header', isLight ? 'filliny-text-foreground' : 'filliny-text-foreground')}>
        <button onClick={goGithubSite}>
          <img src={chrome.runtime.getURL(logo)} className="App-logo" alt="logo" />
        </button>
        <p>
          Edit <code>pages/popup/src/Popup.tsx</code>
        </p>
        <button
          className={cn(
            'filliny-mt-4 filliny-rounded filliny-px-4 filliny-py-1 filliny-font-bold filliny-shadow hover:filliny-scale-105',
            isLight ? 'filliny-bg-primary filliny-text-primary-foreground' : 'filliny-bg-secondary filliny-text-secondary-foreground',
          )}
          onClick={injectContentScript}>
          {t('injectButton')}
        </button>
        <ToggleButton>{t('toggleTheme')}</ToggleButton>
      </header>
    </div>
  );
};

export default withPageWrapper(Popup);
