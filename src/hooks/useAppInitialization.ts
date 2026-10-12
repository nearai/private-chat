import { useEffect, useState } from "react";
import { useConfig } from "@/api/config/queries";
import { clearHashCallbackCredentials, getHashCallbackCredentials } from "@/lib/authCallback";
import { useUserStore } from "@/stores/useUserStore";
import { initializeDesktopIntegrations } from "@/utils/desktop";

export const useAppInitialization = () => {
  const { setSession } = useUserStore();
  const [isInitialized, setIsInitialized] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const { isLoading: isConfigLoading } = useConfig();

  useEffect(() => {
    const initializeApp = async () => {
      if (isInitialized || isLoading) return;

      setIsLoading(true);

      try {
        const { token: oauthToken, sessionId } = getHashCallbackCredentials();
        if (oauthToken) {
          await setSession(oauthToken, sessionId);
          clearHashCallbackCredentials();
        }
        await initializeDesktopIntegrations();

        setIsInitialized(true);
      } catch (error) {
        console.error("Failed to initialize app:", error);
      } finally {
        setIsLoading(false);
      }
    };

    initializeApp();
  }, [isInitialized, isLoading, setSession]);

  return {
    isInitialized,
    isLoading: isLoading || isConfigLoading,
  };
};
