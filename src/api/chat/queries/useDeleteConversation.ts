import { type UseMutationOptions, useMutation, useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "@/api/query-keys";

import { chatClient } from "../client";

type DeleteChatParams = {
  id: string;
};

type UseDeleteChatOptions = Omit<UseMutationOptions<void, Error, DeleteChatParams>, "mutationFn">;

export const useDeleteChat = (options?: UseDeleteChatOptions) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id }: DeleteChatParams) => chatClient.deleteConversation(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.conversation.all });
    },
    ...options,
  });
};
