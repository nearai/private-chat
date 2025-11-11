import { useQuery } from "@tanstack/react-query";
import { queryKeys } from "@/api/query-keys";
import { LOCAL_STORAGE_KEYS } from "@/lib/constants";
import type { ConversationInfo } from "@/types";
import { chatClient } from "../client";

export const useGetConversations = () => {
  const token = typeof window !== "undefined" ? localStorage.getItem(LOCAL_STORAGE_KEYS.TOKEN) : null;

  return useQuery({
    queryKey: queryKeys.conversation.all,
    queryFn: async () => {
      const conversations = await chatClient.getConversations();
      return conversations as unknown as ConversationInfo[];
    },
    enabled: !!token,
  });
};
