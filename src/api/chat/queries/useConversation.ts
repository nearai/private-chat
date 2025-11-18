import { useMutation, useQueryClient } from "@tanstack/react-query";
import type {
  ConversationCreateParams,
  ConversationUpdateParams,
} from "openai/resources/conversations/conversations.mjs";
import type { Responses } from "openai/resources/index.mjs";
import { chatClient } from "../client";

export const useConversation = () => {
  const queryClient = useQueryClient();

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

  const reloadConversations = async ({
    onSuccess,
    onError,
    onSettled,
  }: {
    onSuccess?: () => void;
    onError?: (error: unknown) => void;
    onSettled?: () => void;
  } = {}) => {
    try {
      await queryClient.invalidateQueries({
        queryKey: ["conversations"],
      });
      onSuccess?.();
    } catch (err) {
      onError?.(err);
    } finally {
      onSettled?.();
    }
  };

  const isReloadingConversations = queryClient.isFetching({ queryKey: ["conversations"] }) > 0;

  return {
    createConversation,
    updateConversation,
    addItemsToConversation,
    isReloadingConversations,
    reloadConversations,
  };
};
