import { type UseQueryOptions, useQuery } from "@tanstack/react-query";
import { queryKeys } from "@/api/query-keys";
import { useChatStore } from "@/stores/useChatStore";
import type { ModelV1 } from "@/types";
import { modelsClient } from "../client";

type UseModelsOptions = Omit<UseQueryOptions<ModelV1[], Error>, "queryKey" | "queryFn"> & {
  defaultModel?: string;
}

export const useModels = (options?: UseModelsOptions) => {
  const { setModels, setSelectedModels } = useChatStore();
  return useQuery({
    queryKey: queryKeys.models.all,
    queryFn: async () => {
      const models = await modelsClient.getModels();
      const filteredModels = models.filter((model) => model.public);
      if (filteredModels.length > 0) {
        if (options?.defaultModel) {
          const selectedDefaultModel = filteredModels.find((model) => model.modelId === options.defaultModel);
          if (selectedDefaultModel) {
            setSelectedModels([selectedDefaultModel.modelId]);
          }
        }
      }
      setModels(filteredModels);
      return filteredModels;
    },
    staleTime: Infinity,
    ...options,
  });
};
