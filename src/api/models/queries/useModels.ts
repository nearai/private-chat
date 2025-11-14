import { type UseQueryOptions, useQuery } from "@tanstack/react-query";
import { DEFAULT_MODEL } from "@/api/constants";
import { queryKeys } from "@/api/query-keys";
import { useChatStore } from "@/stores/useChatStore";
import type { ModelV1 } from "@/types";
import { modelsClient } from "../client";

type UseModelsOptions = Omit<UseQueryOptions<ModelV1[], Error>, "queryKey" | "queryFn">;

export const useModels = (options?: UseModelsOptions) => {
  const { setModels, setSelectedModels } = useChatStore();
  return useQuery({
    queryKey: queryKeys.models.all,
    queryFn: async () => {
      const models = await modelsClient.getModels();
      if (models.length > 0) {
        const selectedDefaultModel = models.find((model) => model.modelId === DEFAULT_MODEL);
        if (selectedDefaultModel) {
          setSelectedModels([selectedDefaultModel.modelId]);
        }
      }
      setModels(models);
      return models;
    },
    staleTime: Infinity,
    ...options,
  });
};
