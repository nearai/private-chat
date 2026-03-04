import { useQuery } from "@tanstack/react-query";
import { queryKeys } from "@/api/query-keys";
import { subscriptionsClient } from "../client";

export const usePlans = () => {
  return useQuery({
    queryKey: queryKeys.subscriptions.plans,
    queryFn: async () => {
      try {
        const { plans } = await subscriptionsClient.getPlans();
        return plans ?? [];
      } catch (error) {
        console.warn("Failed to fetch plans, returning empty list", error);
        return [];
      }
    },
    staleTime: 1000 * 60 * 60, // 1 hour
    gcTime: 1000 * 60 * 60 * 2, // 2 hours
    refetchOnWindowFocus: true,
    refetchOnReconnect: true,
  });
};
