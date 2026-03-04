import { useQuery } from "@tanstack/react-query";
import { queryKeys } from "@/api/query-keys";
import { subscriptionsClient } from "../client";

export const useSubscriptions = (includeInactive = false) => {
  return useQuery({
    queryKey: [...queryKeys.subscriptions.list, includeInactive],
    queryFn: async () => {
      try {
        const { subscriptions } = await subscriptionsClient.getSubscriptions(includeInactive);
        return subscriptions ?? [];
      } catch (error) {
        console.warn("Failed to fetch subscriptions, returning empty list", error);
        return [];
      }
    },
    staleTime: 1000 * 60 * 5, // 5 minutes
    gcTime: 1000 * 60 * 10, // Keep cached for 10 minutes
    refetchOnWindowFocus: true,
    refetchOnReconnect: true,
  });
};
