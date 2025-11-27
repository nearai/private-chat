import { useMutation } from "@tanstack/react-query";
import { useNavigate } from "react-router";
import { LOCAL_STORAGE_KEYS } from "@/lib/constants";
import { posthogReset } from "@/lib/posthog";
import { APP_ROUTES } from "@/pages/routes";
import { useUserStore } from "@/stores/useUserStore";
import { authClient } from "../client";

export const useSignOut = () => {
  const { setUser } = useUserStore();
  const navigate = useNavigate();

  return useMutation({
    mutationFn: () => authClient.signOut(),
    onSuccess: () => {
      setUser(null);
      posthogReset();
      localStorage.removeItem(LOCAL_STORAGE_KEYS.TOKEN);
      navigate(APP_ROUTES.AUTH);
    },
  });
};
