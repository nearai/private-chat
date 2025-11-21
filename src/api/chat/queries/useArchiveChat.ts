import { type UseMutationOptions, useMutation, useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "@/api/query-keys";
import type { Chat } from "@/types";
import { chatClient } from "../client";

type ArchiveChatParams = { id: string };

type UseArchiveChatOptions = Omit<
  UseMutationOptions<Chat, Error, ArchiveChatParams>,
  "mutationFn"
>;

const createArchiveMutation = (
  mutationFn: (params: ArchiveChatParams) => Promise<Chat>,
  options?: UseArchiveChatOptions
) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn,
    onSuccess: () => {
      queryClient.refetchQueries({ queryKey: queryKeys.chat.all });
    },
    ...options,
  });
};

export const useArchiveChat = (options?: UseArchiveChatOptions) =>
  createArchiveMutation(({ id }) => chatClient.archiveChatById(id), options);

export const useUnarchiveChat = (options?: UseArchiveChatOptions) =>
  createArchiveMutation(({ id }) => chatClient.unarchiveChatById(id), options);

