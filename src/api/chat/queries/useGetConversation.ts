import { useQuery } from "@tanstack/react-query";
import { queryKeys } from "@/api/query-keys";
import { chatClient } from "../client";
import { offlineCache } from "@/lib/offlineCache";
import type { Conversation } from "@/types";

export const useGetConversation = (id: string | undefined) => {
  const cachedConversation = id ? offlineCache.getConversationDetail(id) : null;

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
        offlineCache.saveConversationDetail(id, mergedConversation);
        return mergedConversation;
      } catch (error) {
        const cached = offlineCache.getConversationDetail(id);
        if (cached) {
          console.warn(`Using offline cache for conversation ${id} due to error:`, error);
          return cached;
        }
        throw error;
      }
    },
    enabled: !!id,
    networkMode: "offlineFirst",
    initialData: cachedConversation ?? undefined,
  });
};
