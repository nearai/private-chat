import { useQuery } from "@tanstack/react-query";
import { queryKeys } from "@/api/query-keys";
import { useStreamStore } from "@/stores/useStreamStore";
import type { Conversation } from "@/types";
import { chatClient } from "../client";

export const useGetConversation = (id: string | undefined) => {
  const { isStreamActive } = useStreamStore();

  return useQuery({
    queryKey: queryKeys.conversation.byId(id),
    queryFn: async () => {
      if (!id) {
        throw new Error("Conversation ID is required");
      }
      const [conversation, conversationItems] = await Promise.all([
        chatClient.getConversation(id),
        chatClient.getConversationItems(id),
      ]);

      const mergedConversation: Conversation = {
        id: conversation.id,
        created_at: conversation.created_at,
        metadata: conversation.metadata,
        object: conversation.object,
        data: conversationItems.data.filter(
          (item) =>
            item.type === "message" &&
            ((item.role === "assistant" &&
              item.content.some((content) => content.type === "output_text" && content.text !== "")) ||
              item.role === "user")
        ),
        has_more: conversationItems.has_more,
        last_id: conversationItems.last_id,
      };

      return mergedConversation;
    },
    enabled: !!id && !isStreamActive(id),
  });
};
