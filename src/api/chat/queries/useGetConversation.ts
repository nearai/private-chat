import { useQuery } from "@tanstack/react-query";
import { queryKeys } from "@/api/query-keys";
import { chatClient } from "../client";
import { offlineCache } from "@/lib/offlineCache";
import type { Conversation } from "@/types";

// Polling interval in milliseconds (5 seconds)
const POLLING_INTERVAL = 5000;

interface UseGetConversationOptions {
  /** Enable polling for real-time updates (default: false) */
  polling?: boolean;
  /** Custom polling interval in milliseconds (default: 5000) */
  pollingInterval?: number;
}

export const useGetConversation = (
  id: string | undefined,
  options: UseGetConversationOptions = {}
) => {
  const { polling = false, pollingInterval = POLLING_INTERVAL } = options;
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
        if (typeof error === 'object' && error !== null && 'error' in error) {
          const err = (error as { error: string }).error;
          if (err === 'Conversation not found') {
            // Do not use offline cache for not found conversations
            throw Error(err);
          }
        }

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
    // Enable polling when the option is set and the document is visible
    refetchInterval: polling ? pollingInterval : false,
    // Only poll when the window is focused to save resources
    refetchIntervalInBackground: false,
    ...options,
  });
};
