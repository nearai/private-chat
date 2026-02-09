/// <reference types="vite-plugin-svgr/client" />
/// <reference types="vite-plugin-pwa/client" />
/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_CHAT_API_URL: string;
  readonly VITE_CLOUD_API_URL?: string;
  readonly VITE_PUBLIC_POSTHOG_KEY: string;
  readonly VITE_PUBLIC_POSTHOG_HOST: string;
  readonly VITE_DESKTOP_OAUTH_CALLBACK_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

interface ProjectInfo {
  version: string;
  buildTime: string;
}

declare const __PROJECT__: ProjectInfo;
