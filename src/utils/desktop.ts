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

  // Notification toast handled on the Rust side during setup (src-tauri/src/main.rs)
};
