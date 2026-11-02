import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router";
import App from "./App.tsx";
import "./styles/global.css";
import React from "react";
import { ThemeProvider } from "./components/common/ThemeProvider";
import { initI18n } from "./i18n";
import { consumeAuthCallbackCredentials } from "./lib/authCallback";
import { initCrisp } from "./lib/crisp";
import { initPosthog } from "./lib/posthog.ts";
import { cleanupLegacyPwa } from "./lib/pwaCleanup";

const authCallbackUrlSanitized = consumeAuthCallbackCredentials();
if (authCallbackUrlSanitized) {
  initPosthog();
  initCrisp();
}
initI18n(localStorage?.locale);

void cleanupLegacyPwa();

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5,
      gcTime: 1000 * 60 * 10,
      retry: false,
    },
  },
});

createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <>
      <QueryClientProvider client={queryClient}>
        <BrowserRouter>
          <ThemeProvider>
            <App />
          </ThemeProvider>
        </BrowserRouter>
        {/* <ReactQueryDevtools initialIsOpen={true} /> */}
      </QueryClientProvider>
    </>
  </React.StrictMode>
);
