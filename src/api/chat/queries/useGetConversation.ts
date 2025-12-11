import { useQuery } from "@tanstack/react-query";
import { queryKeys } from "@/api/query-keys";

import { chatClient } from "../client";

export const useGetConversation = (id: string | undefined) => {
  return useQuery({
    queryKey: queryKeys.conversation.byId(id),
    queryFn: async () => {
      if (!id) {
        throw new Error("Conversation ID is required");
      }
      console.log("fetching conversation", id);
      const [conversation, conversationItems] = await Promise.all([
        chatClient.getConversation(id),
        chatClient.getConversationItems(id),
      ]);

      return { ...conversation, ...conversationItems };
    },
    enabled: !!id,
  });
};
