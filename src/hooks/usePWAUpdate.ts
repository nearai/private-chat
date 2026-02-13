import { useEffect, useState, useRef } from "react";
import { registerSW } from "virtual:pwa-register";

export interface PWAUpdateState {
  needRefresh: boolean;
  updateSW: (reloadPage?: boolean) => Promise<void>;
  dismissUpdate: () => void;
}

export function usePWAUpdate(): PWAUpdateState {
  const [needRefresh, setNeedRefresh] = useState(false);
  const [updateSW, setUpdateSW] = useState<((reloadPage?: boolean) => Promise<void>) | null>(null);
  const isUpdatingRef = useRef(false);

  useEffect(() => {
    const updateServiceWorker = registerSW({
      immediate: true,
      onNeedRefresh() {
        // Only set needRefresh if we're not already updating
        if (!isUpdatingRef.current) {
          setNeedRefresh(true);
        }
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
    if (isUpdatingRef.current || !updateSW) {
      return;
    }

    try {
      isUpdatingRef.current = true;
      setNeedRefresh(false);

      await updateSW(reloadPage);
      
      if (!reloadPage) {
        isUpdatingRef.current = false;
      }

    } catch (error) {
      console.error("Failed to update service worker:", error);
      isUpdatingRef.current = false;
      setNeedRefresh(true);
      
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
