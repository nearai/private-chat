import { type UseQueryOptions, useQuery } from "@tanstack/react-query";
import { queryKeys } from "@/api/query-keys";
import type { Config } from "@/types";
import { configClient } from "../client";

type UseConfigOptions = Omit<UseQueryOptions<Config, Error>, "queryKey" | "queryFn">;

export const useConfig = (options?: UseConfigOptions) => {
  return useQuery({
    queryKey: queryKeys.config.all,
    queryFn: () => configClient.getConfig(),
    staleTime: Infinity,
    ...options,
  });
};
