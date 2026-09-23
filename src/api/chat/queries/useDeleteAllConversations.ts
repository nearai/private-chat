import { useIsMutating, useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router";
import { toast } from "sonner";
import { queryKeys } from "@/api/query-keys";
import { offlineCache } from "@/lib/offlineCache";
import { APP_ROUTES } from "@/pages/routes";
import { useConversationStore } from "@/stores/useConversationStore";
import { useDeleteChatsStore } from "@/stores/useDeleteChatsStore";
import { useExportStore } from "@/stores/useExportStore";
import { useMessagesSignaturesStore } from "@/stores/useMessagesSignaturesStore";
import type { ConversationInfo } from "@/types";
import { chatClient } from "../client";

const mutationKey = ["deleteAllConversations"];

export function useDeleteAllConversations() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const { progress, isStopping, stop } = useDeleteChatsStore();
  const isDeleting = useIsMutating({ mutationKey }) > 0;
  const mutation = useMutation({
    mutationKey,
    retry: false,
    // Fail offline immediately instead of queuing a destructive operation for reconnection.
    networkMode: "always",
    mutationFn: async () => {
      if (useExportStore.getState().progress) {
        throw new Error("Finish exporting your chats before deleting them.");
      }
      const state = useDeleteChatsStore.getState();
      const controller = state.begin();
      try {
        return await chatClient.deleteAllConversations(state.setProgress, controller.signal);
      } finally {
        state.finish(controller);
      }
    },
    onSuccess: async ({ deletedIds, failedIds, stopped }) => {
      const deleted = new Set(deletedIds);
      const allDeleted = !stopped && failedIds.length === 0;
      await queryClient.cancelQueries({ queryKey: queryKeys.conversation.all });
      await Promise.all(deletedIds.map((id) =>
        queryClient.cancelQueries({ queryKey: queryKeys.conversation.byId(id) })
      ));
      for (const id of deletedIds) {
        offlineCache.clearConversationDetail(id);
        queryClient.removeQueries({ queryKey: queryKeys.conversation.byId(id) });
        queryClient.removeQueries({ queryKey: queryKeys.share.byConversationId(id) });
      }
      const previous = queryClient.getQueryData<ConversationInfo[]>(queryKeys.conversation.all)
        ?? offlineCache.getConversationList() ?? [];
      const remaining = allDeleted ? [] : previous.filter((conversation) => !deleted.has(conversation.id));
      offlineCache.saveConversationList(remaining);
      queryClient.setQueryData(queryKeys.conversation.all, remaining);

      const current = useConversationStore.getState().conversation;
      if (current && (allDeleted || deleted.has(current.conversationId))) {
        useConversationStore.getState().resetConversation();
        navigate(APP_ROUTES.HOME, { replace: true });
      }
      if (stopped) {
        toast.info(`Deletion stopped. ${deletedIds.length} chats deleted. Undeleted chats were kept.${failedIds.length > 0 ? ` ${failedIds.length} chats could not be deleted.` : ""}`);
      } else if (allDeleted) {
        offlineCache.clearConversationDetails();
        useMessagesSignaturesStore.getState().clearAllSignatures();
        useExportStore.getState().dismissResult();
        toast.success("All chats deleted.");
      } else {
        toast.error(`Deleted ${deletedIds.length} chats. ${failedIds.length} could not be deleted. Please try again.`);
      }
      await queryClient.invalidateQueries({ queryKey: queryKeys.conversation.all });
    },
    onError: () => {
      toast.error("Could not delete your chats. Please check your connection and try again.");
    },
  });
  return { ...mutation, isDeleting, isStopping, progress, stop };
}
