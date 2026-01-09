import { useEffect, useState } from "react";
import { registerSW } from "virtual:pwa-register";

export interface PWAUpdateState {
  needRefresh: boolean;
  updateSW: (reloadPage?: boolean) => Promise<void>;
  dismissUpdate: () => void;
}

export function usePWAUpdate(): PWAUpdateState {
  const [needRefresh, setNeedRefresh] = useState(false);
  const [updateSW, setUpdateSW] = useState<((reloadPage?: boolean) => Promise<void>) | null>(null);

  useEffect(() => {
    const updateServiceWorker = registerSW({
      immediate: true,
      onNeedRefresh() {
        setNeedRefresh(true);
      },
      onOfflineReady() {
        console.log("PWA offline ready");
      },
      onRegistered(registration) {
        console.log("Service Worker registered:", registration);
      },
      onRegisterError(error) {
        console.error("Service Worker registration error:", error);
      },
    });

    setUpdateSW(() => updateServiceWorker);
  }, []);

  const handleUpdate = async (reloadPage = false) => {
    if (updateSW) {
      await updateSW(reloadPage);
      if (reloadPage) {
        window.location.reload();
      }
    }
  };

  const dismissUpdate = () => {
    setNeedRefresh(false);
  };

  return {
    needRefresh,
    updateSW: handleUpdate,
    dismissUpdate,
  };
}
