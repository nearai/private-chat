import { useNavigate } from "react-router";
import { ShareIcon } from "@heroicons/react/24/outline";
import { useSharedWithMe } from "@/api/sharing/useSharedWithMe";
import { chatClient } from "@/api/chat/client";
import { useQuery } from "@tanstack/react-query";
import { cn } from "@/lib";

interface SharedConversationWithDetails {
  conversation_id: string;
  permission: "read" | "write";
  title: string;
  created_at: number;
}

export default function SharedPage() {
  const navigate = useNavigate();
  const { data: sharedWithMe, isLoading: isLoadingShares } = useSharedWithMe();

  // Fetch conversation details for each shared conversation
  const { data: conversationsWithDetails, isLoading: isLoadingDetails } = useQuery({
    queryKey: ["shared-conversations-details", sharedWithMe?.map((s) => s.conversation_id)],
    queryFn: async (): Promise<SharedConversationWithDetails[]> => {
      if (!sharedWithMe || sharedWithMe.length === 0) return [];

      const details = await Promise.all(
        sharedWithMe.map(async (shared): Promise<SharedConversationWithDetails> => {
          try {
            const conversation = await chatClient.getConversation(shared.conversation_id);
            return {
              conversation_id: shared.conversation_id,
              permission: shared.permission,
              title: conversation?.metadata?.title || shared.conversation_id,
              created_at: conversation?.created_at ?? 0,
            };
          } catch {
            return {
              conversation_id: shared.conversation_id,
              permission: shared.permission,
              title: shared.conversation_id,
              created_at: 0,
            };
          }
        })
      );

      // Sort by created_at descending (newest first)
      return details.sort((a, b) => b.created_at - a.created_at);
    },
    enabled: !!sharedWithMe && sharedWithMe.length > 0,
    staleTime: 60000, // Cache for 1 minute
  });

  const isLoading = isLoadingShares || isLoadingDetails;

  const handleOpenConversation = (conversationId: string) => {
    navigate(`/c/${conversationId}`);
  };

  if (isLoading) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="flex items-center gap-2 text-muted-foreground">
          <div className="size-5 animate-spin rounded-full border-2 border-current border-t-transparent" />
          <span>Loading shared conversations...</span>
        </div>
      </div>
    );
  }

  if (!conversationsWithDetails || conversationsWithDetails.length === 0) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-4 text-muted-foreground">
        <ShareIcon className="size-16 opacity-50" />
        <h2 className="font-medium text-xl">No shared conversations</h2>
        <p className="text-sm">Conversations shared with you will appear here.</p>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-3xl p-6">
      <div className="mb-6">
        <h1 className="font-semibold text-2xl">Shared with me</h1>
        <p className="text-muted-foreground text-sm">
          {conversationsWithDetails.length} conversation{conversationsWithDetails.length !== 1 ? "s" : ""} shared with you
        </p>
      </div>

      <div className="space-y-2">
        {conversationsWithDetails.map((conversation) => (
          <button
            key={conversation.conversation_id}
            onClick={() => handleOpenConversation(conversation.conversation_id)}
            className={cn(
              "flex w-full items-center gap-3 rounded-xl border border-border bg-card p-4 text-left transition-colors hover:bg-accent"
            )}
          >
            <ShareIcon className="size-5 shrink-0 text-muted-foreground" />
            <div className="min-w-0 flex-1">
              <div className="truncate font-medium">{conversation.title}</div>
              <div className="text-muted-foreground text-xs">
                {conversation.permission === "write" ? "Can edit" : "View only"}
              </div>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
