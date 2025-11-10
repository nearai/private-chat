import { type UseQueryOptions, useQuery } from "@tanstack/react-query";
import { queryKeys } from "@/api/query-keys";
import { useChatStore } from "@/stores/useChatStore";
import type { Model } from "@/types";
import { modelsClient } from "../client";

type UseModelsOptions = Omit<UseQueryOptions<Model[], Error>, "queryKey" | "queryFn">;

export const useModels = (options?: UseModelsOptions) => {
  const { setModels, setSelectedModels } = useChatStore();
  return useQuery({
    queryKey: queryKeys.models.all,
    queryFn: async () => {
      const models = await modelsClient.getModels();
      if (models.length > 0) {
        const selectedDefaultModel = models.find((model) => model.id === "openai/gpt-oss-120b");
        if (selectedDefaultModel) {
          setSelectedModels([selectedDefaultModel.id]);
        }
      }
      setModels(models);
      return models;
    },
    staleTime: Infinity,
    ...options,
  });
};
