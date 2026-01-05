export const isTauri = () => Boolean((window as Window & { __TAURI__?: unknown }).__TAURI__);

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
