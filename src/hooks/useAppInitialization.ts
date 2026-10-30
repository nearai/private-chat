import { useEffect, useState } from "react";
import { useConfig } from "@/api/config/queries";
import { initializeDesktopIntegrations } from "@/utils/desktop";

export const useAppInitialization = () => {
  const [isInitialized, setIsInitialized] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const { isLoading: isConfigLoading } = useConfig();

  useEffect(() => {
    const initializeApp = async () => {
      if (isInitialized || isLoading) return;

      setIsLoading(true);

      try {
        await initializeDesktopIntegrations();
        setIsInitialized(true);
      } catch (error) {
        console.error("Failed to initialize app:", error);
      } finally {
        setIsLoading(false);
      }
    };

    initializeApp();
  }, [isInitialized, isLoading]);

  return {
    isInitialized,
    isLoading: isLoading || isConfigLoading,
  };
};
