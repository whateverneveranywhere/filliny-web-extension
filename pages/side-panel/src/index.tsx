import { createRoot } from "react-dom/client";
import "@src/index.css";
import "@extension/ui/lib/global.css";
import SidePanel from "@src/SidePanel";
import { ThemeProvider, Toaster } from "@extension/ui";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import "@packages/shared/src/utils/console-suppressor";

const queryClient = new QueryClient();

function init() {
  const appContainer = document.querySelector("#app-container");
  if (!appContainer) {
    throw new Error("Can not find #app-container");
  }
  const root = createRoot(appContainer);
  root.render(
    <QueryClientProvider client={queryClient}>
      <ThemeProvider defaultTheme="dark" storageKey="vite-ui-theme">
        <SidePanel />
        <Toaster />
      </ThemeProvider>
    </QueryClientProvider>,
  );
}

init();
