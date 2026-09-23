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
    queryFn: async ({ signal }) => {
      const conversations = await chatClient.getConversations(signal);
      signal.throwIfAborted();
      const normalized = conversations as unknown as ConversationInfo[];
      offlineCache.saveConversationList(normalized);
      return normalized;
    },
    enabled: !!token,
    staleTime: 1000 * 60 * 5,
    gcTime: 1000 * 60 * 10,
    networkMode: "offlineFirst",
    // Persisted data has no freshness timestamp. Show it immediately, but revalidate on mount.
    // React Query retains this data if refreshing fails, without hiding the error.
    initialData: cachedConversations ?? undefined,
    initialDataUpdatedAt: 0,
  });
};
