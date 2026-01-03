export const isTauri = () => Boolean((window as Window & { __TAURI__?: unknown }).__TAURI__);

export const initializeDesktopIntegrations = async () => {
  if (!isTauri()) return;

  try {
    const { checkUpdate } = await import("@tauri-apps/api/updater");
    await checkUpdate();
  } catch (error) {
    console.warn("Tauri updater check failed:", error);
  }

  try {
    const { isPermissionGranted, requestPermission, sendNotification } = await import(
      "@tauri-apps/api/notification"
    );
    let permissionGranted = await isPermissionGranted();
    if (!permissionGranted) {
      const permission = await requestPermission();
      permissionGranted = permission === "granted";
    }

    if (permissionGranted) {
      sendNotification({
        title: "Private Chat",
        body: "Private Chat is running in the background.",
      });
    }
  } catch (error) {
    console.warn("Tauri notification setup failed:", error);
  }
};
