import { type UseQueryOptions, useQuery } from "@tanstack/react-query";
import { queryKeys } from "@/api/query-keys";
import type { User } from "@/types";
import { usersClient } from "../client";

type UseUsersOptions = Omit<UseQueryOptions<User, Error>, "queryKey" | "queryFn">;

export const useUserData = (options?: UseUsersOptions) => {
  return useQuery({
    queryKey: queryKeys.users.userData,
    queryFn: async () => await usersClient.getUserData(),
    staleTime: Infinity,
    ...options,
  });
};
