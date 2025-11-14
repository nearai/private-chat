import { useMutation } from "@tanstack/react-query";
import type {
  ConversationCreateParams,
  ConversationUpdateParams,
} from "openai/resources/conversations/conversations.mjs";
import type { Responses } from "openai/resources/index.mjs";
import { chatClient } from "../client";

export const useConversation = () => {
  const createConversation = useMutation({
    mutationFn: (conversation: ConversationCreateParams) => chatClient.createConversation(conversation),
  });

  const updateConversation = useMutation({
    mutationFn: ({
      conversationId,
      metadata,
    }: {
      conversationId: string;
      metadata: ConversationUpdateParams["metadata"];
    }) => chatClient.updateConversation(conversationId, metadata),
  });

  const addItemsToConversation = useMutation({
    mutationFn: ({ conversationId, items }: { conversationId: string; items: Responses.ResponseInputItem[] }) =>
      chatClient.addItemsToConversation(conversationId, items),
  });

  return {
    createConversation,
    updateConversation,
    addItemsToConversation,
  };
};
