import { useMutation, useQueryClient } from "@tanstack/react-query";
import { chatClient } from "@/api/chat/client";
import { queryKeys } from "@/api/query-keys";
import type { CreateConversationShareRequest } from "@/types";

interface CreateConversationShareParams {
  conversationId: string;
  payload: CreateConversationShareRequest;
}

export const useCreateConversationShare = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ conversationId, payload }: CreateConversationShareParams) =>
      chatClient.createConversationShare(conversationId, payload),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.share.byConversationId(variables.conversationId) });
    },
  });
};
