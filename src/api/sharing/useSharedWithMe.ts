import { useQuery } from "@tanstack/react-query";
import { chatClient } from "@/api/chat/client";
import { queryKeys } from "@/api/query-keys";

export interface SharedConversationInfo {
  conversation_id: string;
  permission: "read" | "write";
  /** Conversation title (null if fetch failed) */
  title: string | null;
  /** Conversation created_at timestamp (null if fetch failed) */
  created_at: number | null;
  /** Error message if conversation details couldn't be fetched */
  error: string | null;
}

export function useSharedWithMe() {
  return useQuery<SharedConversationInfo[]>({
    queryKey: queryKeys.sharing.sharedWithMe,
    queryFn: () => chatClient.listSharedWithMe(),
    staleTime: 30000, // Consider data fresh for 30 seconds
  });
}
