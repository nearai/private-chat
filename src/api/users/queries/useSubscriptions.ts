import { useQuery } from "@tanstack/react-query";
import { queryKeys } from "@/api/query-keys";
import { LOCAL_STORAGE_KEYS } from "@/lib/constants";
import { usersClient } from "../client";

export const useSubscriptions = (includeInactive = false) => {
  // Only fetch when authenticated. This hook is reached on public routes
  // (e.g. shared chats) via root-mounted dialogs; firing an authenticated
  // request there is wasteful and can trip a 401 logout for anonymous users.
  const hasToken = !!localStorage.getItem(LOCAL_STORAGE_KEYS.TOKEN);
  return useQuery({
    queryKey: [...queryKeys.subscriptions.list, includeInactive],
    queryFn: () => usersClient.getSubscriptions(includeInactive),
    enabled: hasToken,
    staleTime: 1000 * 60 * 5,
    gcTime: 1000 * 60 * 10,
    refetchOnWindowFocus: true,
    refetchOnReconnect: true,
  });
};
