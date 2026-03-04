import { useQuery } from "@tanstack/react-query";
import { queryKeys } from "@/api/query-keys";
import { usersClient } from "../client";

export const useSubscriptions = (includeInactive = false) => {
  return useQuery({
    queryKey: [...queryKeys.subscriptions.list, includeInactive],
    queryFn: async () => {
      try {
        return await usersClient.getSubscriptions(includeInactive);
      } catch (error) {
        console.warn("Failed to fetch subscriptions, returning empty list", error);
        return [];
      }
    },
    staleTime: 1000 * 60 * 5,
    gcTime: 1000 * 60 * 10,
    refetchOnWindowFocus: true,
    refetchOnReconnect: true,
  });
};
