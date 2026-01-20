import type { UnlistenFn } from "@tauri-apps/api/event";

const hasWindowBridge = () => {
  if (typeof window === "undefined") return false;
  const candidate = window as Window &
    {
      __TAURI__?: unknown;
      __TAURI_IPC__?: unknown;
      __TAURI_INTERNALS__?: unknown;
    };
  return Boolean(candidate.__TAURI__ || candidate.__TAURI_IPC__ || candidate.__TAURI_INTERNALS__);
};

export const isTauri = () =>
  hasWindowBridge() ||
  navigator?.userAgent?.includes?.("Tauri") ||
  Boolean((globalThis as typeof globalThis & { __TAURI__?: unknown }).__TAURI__);

export const initializeDesktopIntegrations = async () => {
  if (!isTauri()) return;
  // Skip update check in development mode
  if (import.meta.env.KEY === "development" || import.meta.env.DEV) return;

  try {
    const { check } = await import("@tauri-apps/plugin-updater");
    const update = await check();
    if (update?.available) {
      await update.downloadAndInstall();
      const { relaunch } = await import("@tauri-apps/plugin-process");
      await relaunch();
    }
  } catch (error) {
    console.warn("Tauri updater check failed:", error);
  }
};

export type DesktopOAuthPayload = {
  token?: string;
  sessionId?: string;
  isNewUser?: boolean;
  oauthChannel?: string | null;
};

export const getDesktopOAuthCallbackUrl = async (): Promise<string> => {
  if (!isTauri()) {
    throw new Error("Desktop OAuth callback URL requested outside of Tauri runtime.");
  }
  const { invoke } = await import("@tauri-apps/api/core");
  return invoke<string>("desktop_oauth_callback_url");
};

export const listenForDesktopOAuth = async (
  handler: (payload: DesktopOAuthPayload) => void
): Promise<UnlistenFn | null> => {
  if (!isTauri()) return null;
  const { listen } = await import("@tauri-apps/api/event");
  const unlisten = await listen<DesktopOAuthPayload>("desktop://oauth-complete", (event) => {
    handler(event.payload);
  });
  return unlisten;
};
