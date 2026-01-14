import { useQuery } from "@tanstack/react-query";
import { chatClient } from "@/api/chat/client";
import { queryKeys } from "@/api/query-keys";
import type { ConversationSharesListResponse } from "@/types";

export const useConversationShares = (conversationId?: string) => {
  return useQuery<ConversationSharesListResponse>({
    queryKey: queryKeys.share.byConversationId(conversationId),
    queryFn: () => {
      if (!conversationId) {
        return Promise.resolve({ is_owner: false, shares: [] });
      }
      return chatClient.listConversationShares(conversationId);
    },
    enabled: Boolean(conversationId),
  });
};
