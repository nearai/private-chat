import { useMutation, useQueryClient } from "@tanstack/react-query";
import { chatClient } from "@/api/chat/client";
import { queryKeys } from "@/api/query-keys";

interface DeleteConversationShareParams {
  conversationId: string;
  shareId: string;
}

export const useDeleteConversationShare = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ conversationId, shareId }: DeleteConversationShareParams) =>
      chatClient.deleteConversationShare(conversationId, shareId),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.share.byConversationId(variables.conversationId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.sharing.sharedWithMe });
    },
  });
};
