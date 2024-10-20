import { createRoot } from 'react-dom/client';
import '@src/index.css';
import '@extension/ui/lib/global.css';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from '@extension/ui';
import App from './App';
const queryClient = new QueryClient();

function init() {
  const appContainer = document.querySelector('#app-container');
  if (!appContainer) {
    throw new Error('Can not find #app-container');
  }
  const root = createRoot(appContainer);

  root.render(
    <QueryClientProvider client={queryClient}>
      <App />
      <Toaster />
    </QueryClientProvider>,
  );
}

init();
