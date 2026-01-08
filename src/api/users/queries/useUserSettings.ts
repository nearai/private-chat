import { type UseQueryOptions, useQuery } from "@tanstack/react-query";
import { queryKeys } from "@/api/query-keys";
import type { UserSettingsResponse } from "@/types";
import { usersClient } from "../client";

type UseUserSettingsOptions = Omit<UseQueryOptions<UserSettingsResponse, Error>, "queryKey" | "queryFn">;

export const useUserSettings = (options?: UseUserSettingsOptions) => {
  return useQuery({
    queryKey: queryKeys.users.meSettings,
    queryFn: async () => await usersClient.getUserSettings(),
    staleTime: Infinity,
    ...options,
  });
};
