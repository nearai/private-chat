import { useQuery } from "@tanstack/react-query";
import { queryKeys } from "@/api/query-keys";
import { usersClient } from "../client";

export const usePlans = () => {
  return useQuery({
    queryKey: queryKeys.subscriptions.plans,
    queryFn: async () => {
      try {
        return await usersClient.getPlans();
      } catch (error) {
        console.warn("Failed to fetch plans, returning empty list", error);
        return [];
      }
    },
    staleTime: 1000 * 60 * 60,
    gcTime: 1000 * 60 * 60 * 2,
    refetchOnWindowFocus: true,
    refetchOnReconnect: true,
  });
};
