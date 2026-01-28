import { useQuery } from "@tanstack/react-query";
import { chatClient } from "@/api/chat/client";
import { queryKeys } from "@/api/query-keys";
import type { ShareGroup } from "@/types";

export const useShareGroups = () => {
  return useQuery<ShareGroup[]>({
    queryKey: queryKeys.shareGroups.all,
    queryFn: () => chatClient.listShareGroups(),
  });
};
