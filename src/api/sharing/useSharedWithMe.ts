import { useQuery } from "@tanstack/react-query";
import { chatClient } from "@/api/chat/client";
import { queryKeys } from "@/api/query-keys";

export interface SharedConversationInfo {
  conversation_id: string;
  permission: "read" | "write";
}

export function useSharedWithMe() {
  return useQuery<SharedConversationInfo[]>({
    queryKey: queryKeys.sharing.sharedWithMe,
    queryFn: () => chatClient.listSharedWithMe(),
    staleTime: 30000, // Consider data fresh for 30 seconds
  });
}
