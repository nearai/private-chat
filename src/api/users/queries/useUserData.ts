import { type UseQueryOptions, useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { queryKeys } from "@/api/query-keys";
import type { User } from "@/types";
import { usersClient } from "../client";
import { LOCAL_STORAGE_KEYS } from "@/lib/constants";
import { offlineCache } from "@/lib/offlineCache";

type UseUsersOptions = Omit<UseQueryOptions<User, Error>, "queryKey" | "queryFn">;

export const useUserData = (options?: UseUsersOptions) => {
  const token = typeof window !== "undefined" ? localStorage.getItem(LOCAL_STORAGE_KEYS.TOKEN) : null;
  const [cacheState, setCacheState] = useState<{
    data?: User;
    isLoading: boolean;
  }>({
    isLoading: !!token,
  });

  useEffect(() => {
    if (!token) return;

    offlineCache.getUserData().then((data) => {
      setCacheState({
        data: data || undefined,
        isLoading: false,
      });
    });
  }, [token]);

  return useQuery({
    queryKey: queryKeys.users.userData,
    queryFn: async () => {
      if (!token) {
        throw new Error("Not authenticated");
      }
      try {
        const user = await usersClient.getUserData();
        await offlineCache.saveUserData(user);
        return user;
      } catch (error) {
        const cachedUser = await offlineCache.getUserData();
        if (cachedUser) {
          console.warn("Using offline cached user data due to error:", error);
          return cachedUser;
        }
        throw error;
      }
    },
    staleTime: Infinity,
    networkMode: "offlineFirst",
    enabled: (options?.enabled ?? true) && !!token && !cacheState.isLoading,
    initialData: cacheState.data,
    ...options,
  });
};
