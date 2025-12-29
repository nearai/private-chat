import { type UseMutationOptions, useMutation, useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "@/api/query-keys";
import type { Chat } from "@/types";
import { chatClient } from "../client";

type ConversationPinParams = {
  id: string;
};

type UsePinMutationOptions = Omit<
  UseMutationOptions<Chat, Error, ConversationPinParams>,
  "mutationFn"
>;

const createPinnedStatusMutation = (
  mutationFn: (params: ConversationPinParams) => Promise<Chat>,
  options?: UsePinMutationOptions
) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn,
    onSuccess: () => {
      queryClient.refetchQueries({ queryKey: queryKeys.conversation.all });
    },
    ...options,
  });
};

export const usePinConversationById = (options?: UsePinMutationOptions) =>
  createPinnedStatusMutation(({ id }) => chatClient.pinConversationById(id), options);

export const useUnpinConversationById = (options?: UsePinMutationOptions) =>
  createPinnedStatusMutation(({ id }) => chatClient.unpinConversationById(id), options);
