import { useUserStore } from "@/stores/useUserStore";
import { type UseQueryOptions, useQuery } from "@tanstack/react-query";
import { queryKeys } from "@/api/query-keys";
import type { User } from "@/types";
import { usersClient } from "../client";
import { offlineCache } from "@/lib/offlineCache";

type UseUsersOptions = Omit<UseQueryOptions<User, Error>, "queryKey" | "queryFn">;

export const useUserData = (options?: UseUsersOptions) => {
  const token = useUserStore((state) => state.token);
  const isOnline = typeof navigator === "undefined" || navigator.onLine !== false;
  const cachedUser = offlineCache.getUserData();

  return useQuery({
    queryKey: queryKeys.users.userData,
    queryFn: async () => {
      if (!token) {
        throw new Error("Not authenticated");
      }
      try {
        const user = await usersClient.getUserData();
        offlineCache.saveUserData(user);
        return user;
      } catch (error) {
        if (cachedUser) {
          console.warn("Using offline cached user data due to error:", error);
          return cachedUser;
        }
        throw error;
      }
    },
    staleTime: Infinity,
    networkMode: "offlineFirst",
    enabled: (options?.enabled ?? true) && !!token && isOnline,
    initialData: cachedUser ?? undefined,
    ...options,
  });
};
