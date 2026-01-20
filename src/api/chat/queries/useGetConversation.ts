import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { queryKeys } from "@/api/query-keys";
import { chatClient } from "../client";
import { offlineCache } from "@/lib/offlineCache";
import type { Conversation } from "@/types";

export const useGetConversation = (id: string | undefined) => {
  const [cacheState, setCacheState] = useState<{
    id?: string;
    data?: Conversation;
    isLoading: boolean;
  }>({
    id,
    isLoading: !!id,
  });

  if (cacheState.id !== id) {
    setCacheState({ id, isLoading: !!id });
  }

  useEffect(() => {
    if (!id) return;

    let active = true;
    offlineCache.getConversationDetail(id).then((data) => {
      if (!active) return;
      if (data) {
        setCacheState({ id, data, isLoading: false });
      } else {
        // If no cache, simply stop loading state so query can fetch
        setCacheState((prev) => ({ ...prev, isLoading: false }));
      }
    });

    return () => {
      active = false;
    };
  }, [id]);

  return useQuery({
    queryKey: queryKeys.conversation.byId(id),
    queryFn: async () => {
      if (!id) {
        throw new Error("Conversation ID is required");
      }

      try {
        const [conversation, conversationItems] = await Promise.all([
          chatClient.getConversation(id),
          chatClient.getConversationItems(id),
        ]);

        const mergedConversation = { ...conversation, ...conversationItems } as Conversation;
        await offlineCache.saveConversationDetail(id, mergedConversation);
        return mergedConversation;
      } catch (error) {
        // If fetch fails, we can either return cached data (if we have it) or re-throw
        // Since initialData handles the "display cache first" part, this catch block handles "network failed, fallback to cache (if not already displayed)?"
        // But initialData is only for the *start*.
        const cached = await offlineCache.getConversationDetail(id);
        if (cached) {
          console.warn(`Using offline cache for conversation ${id} due to error:`, error);
          return cached;
        }
        throw error;
      }
    },
    enabled: !!id && !cacheState.isLoading,
    networkMode: "offlineFirst",
    initialData: cacheState.data,
    initialDataUpdatedAt: 0, // Force background refetch to update cache
  });
};
