import { useMutation, useQueryClient } from "@tanstack/react-query";
import { chatClient } from "@/api/chat/client";
import { queryKeys } from "@/api/query-keys";
import type { UpdateShareGroupRequest } from "@/types";
import { toast } from "sonner";

interface UpdateShareGroupParams {
  groupId: string;
  payload: UpdateShareGroupRequest;
}

export const useUpdateShareGroup = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ groupId, payload }: UpdateShareGroupParams) => chatClient.updateShareGroup(groupId, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.shareGroups.all });
    },
    onError: (error) => {
      console.error("Failed to update share group:", error);
      toast.error("Failed to update share group. Please try again.");
    },
  });
};
