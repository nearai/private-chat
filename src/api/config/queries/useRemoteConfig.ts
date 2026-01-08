import { type UseQueryOptions, useQuery } from "@tanstack/react-query";
import { queryKeys } from "@/api/query-keys";
import type { RemoteConfig } from "@/types";
import { configClient } from "../client";
import { DEFAULT_MODEL } from "@/api/constants";

type NormalizedRemoteConfig = {
  default_model: string;
};

type UseRemoteConfigOptions = Omit<UseQueryOptions<NormalizedRemoteConfig, Error>, "queryKey" | "queryFn">;

const normalizeRemoteConfig = (config?: RemoteConfig | null): NormalizedRemoteConfig => ({
  default_model: config?.default_model || DEFAULT_MODEL,
});

export const useRemoteConfig = (options?: UseRemoteConfigOptions) => {
  return useQuery<NormalizedRemoteConfig, Error>({
    queryKey: queryKeys.config.remote,
    queryFn: async () => {
      const config = await configClient.getRemoteConfig();
      return normalizeRemoteConfig(config);
    },
    staleTime: Infinity,
    ...options,
  });
};
