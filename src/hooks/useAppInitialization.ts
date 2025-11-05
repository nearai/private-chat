import { useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { useConfig } from "@/api/config/queries";
import { queryKeys } from "@/api/query-keys";
import { LOCAL_STORAGE_KEYS } from "@/lib/constants";

export const useAppInitialization = () => {
  const queryClient = useQueryClient();
  const [isInitialized, setIsInitialized] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const { isLoading: isConfigLoading } = useConfig();

  useEffect(() => {
    const initializeApp = async () => {
      if (isInitialized || isLoading) return;

      setIsLoading(true);

      try {
        const hash = window.location.hash.substring(1);
        if (hash) {
          const params = new URLSearchParams(hash);
          const oauthToken = params.get("token");
          if (oauthToken) {
            localStorage.setItem(LOCAL_STORAGE_KEYS.TOKEN, oauthToken);
            window.history.replaceState(null, "", window.location.pathname);
            queryClient.invalidateQueries({ queryKey: queryKeys.models.all });
          }
        }

        setIsInitialized(true);
      } catch (error) {
        console.error("Failed to initialize app:", error);
      } finally {
        setIsLoading(false);
      }
    };

    initializeApp();
  }, [isInitialized, isLoading, queryClient]);

  return {
    isInitialized,
    isLoading: isLoading || isConfigLoading,
  };
};
