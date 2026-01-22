import { useMutation, useQueryClient } from "@tanstack/react-query";
import { chatClient } from "@/api/chat/client";
import { queryKeys } from "@/api/query-keys";
import type { CreateShareGroupRequest } from "@/types";
import { toast } from "sonner";

export const useCreateShareGroup = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: CreateShareGroupRequest) => chatClient.createShareGroup(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.shareGroups.all });
    },
    onError: (error) => {
      console.error("Failed to create share group:", error);
      toast.error("Failed to create share group. Please try again.");
    },
  });
};
