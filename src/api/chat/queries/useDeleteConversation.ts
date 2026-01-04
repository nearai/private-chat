import { type UseMutationOptions, useMutation, useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "@/api/query-keys";

import { chatClient } from "../client";

type DeleteChatParams = {
  id: string;
};

type MutationSuccessCallback = (
  data: undefined,
  variables: DeleteChatParams,
  context: unknown
) => void | Promise<void>;

type UseDeleteChatOptions = Omit<UseMutationOptions<void, Error, DeleteChatParams>, "mutationFn" | "onSuccess"> & {
  onSuccess?: MutationSuccessCallback;
};

export const useDeleteChat = (options?: UseDeleteChatOptions) => {
  const queryClient = useQueryClient();
  const { onSuccess, ...restOptions } = options || {};

  return useMutation({
    mutationFn: ({ id }: DeleteChatParams) => chatClient.deleteConversation(id),
    onSuccess: async (data, variables, context) => {
      await queryClient.invalidateQueries({ queryKey: queryKeys.conversation.all });
      if (onSuccess) {
        await onSuccess(data, variables, context);
      }
    },
    ...restOptions,
  });
};
