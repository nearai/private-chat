import { useMutation, useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "@/api/query-keys";
import { chatClient } from "../client";

type DeleteConversationItemParams = {
  conversationId: string;
  itemId: string;
};

export const useDeleteConversationItem = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ conversationId, itemId }: DeleteConversationItemParams) =>
      chatClient.deleteConversationItem(conversationId, itemId),
    onSuccess: async (_, variables) => {
      await queryClient.invalidateQueries({ queryKey: queryKeys.conversation.byId(variables.conversationId) });
    },
  });
};
