import { useQuery } from "@tanstack/react-query";
import { queryKeys } from "@/api/query-keys";
import type { ConversationInfo } from "@/types";
import { chatClient } from "../client";
import { offlineCache } from "@/lib/offlineCache";
import { LOCAL_STORAGE_KEYS } from "@/lib/constants";

export const useGetConversations = () => {
  const token = typeof window !== "undefined" ? localStorage.getItem(LOCAL_STORAGE_KEYS.TOKEN) : null;
  const cachedConversations = offlineCache.getConversationList();

  return useQuery({
    queryKey: queryKeys.conversation.all,
    queryFn: async () => {
      try {
        const conversations = await chatClient.getConversations();
        const normalized = conversations as unknown as ConversationInfo[];
        offlineCache.saveConversationList(normalized);
        return normalized;
      } catch (error) {
        const cached = offlineCache.getConversationList();
        if (cached) {
          console.warn("Using offline conversation list cache due to error:", error);
          return cached;
        }
        throw error;
      }
    },
    enabled: !!token,
    staleTime: 1000 * 60 * 5,
    gcTime: 1000 * 60 * 10,
    networkMode: "offlineFirst",
    initialData: cachedConversations ?? undefined,
  });
};
