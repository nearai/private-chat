import { type UseQueryOptions, useQuery } from "@tanstack/react-query";
import { queryKeys } from "@/api/query-keys";
// import { useChatStore } from "@/stores/useChatStore";
// import { useUserStore } from "@/stores/useUserStore";
import type { ChatInfo } from "@/types";
import { chatClient } from "../client";

type UseChatsOptions = Omit<UseQueryOptions<ChatInfo[], Error>, "queryKey" | "queryFn">;

export const useChats = (options?: UseChatsOptions) => {
  return useQuery({
    queryKey: queryKeys.chat.all,
    queryFn: async () => {
      const chats = await chatClient.getConversations(); // TODO: add pagination

      return chats as unknown as ChatInfo[];
    },

    ...options,
  });
};
