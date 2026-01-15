import { useNavigate } from "react-router";
import { ExclamationTriangleIcon, ShareIcon } from "@heroicons/react/24/outline";
import { useSharedWithMe } from "@/api/sharing/useSharedWithMe";
import { chatClient } from "@/api/chat/client";
import { useQuery } from "@tanstack/react-query";
import { cn } from "@/lib";

interface SharedConversationWithDetails {
  conversation_id: string;
  permission: "read" | "write";
  title: string;
  created_at: number;
  error?: string;
}

export default function SharedPage() {
  const navigate = useNavigate();
  const { data: sharedWithMe, isLoading: isLoadingShares } = useSharedWithMe();

  // Fetch conversation details for each shared conversation
  const { data: conversationsWithDetails, isLoading: isLoadingDetails } = useQuery({
    queryKey: ["shared-conversations-details", sharedWithMe?.map((s) => s.conversation_id)],
    queryFn: async (): Promise<SharedConversationWithDetails[]> => {
      if (!sharedWithMe || sharedWithMe.length === 0) return [];

      const results = await Promise.allSettled(
        sharedWithMe.map(async (shared) => {
          const conversation = await chatClient.getConversation(shared.conversation_id);
          return {
            conversation_id: shared.conversation_id,
            permission: shared.permission,
            title: conversation?.metadata?.title || "Untitled",
            created_at: conversation?.created_at ?? 0,
          };
        })
      );

      const details: SharedConversationWithDetails[] = results.map((result, index) => {
        const shared = sharedWithMe[index];
        if (result.status === "fulfilled") {
          return result.value;
        }
        // Handle rejected promises - conversation may be deleted or inaccessible
        const errorMessage = result.reason instanceof Error
          ? result.reason.message
          : String(result.reason);
        const isNotFound = errorMessage.toLowerCase().includes("not found") || errorMessage.includes("404");
        const isAccessDenied = errorMessage.toLowerCase().includes("access denied") || errorMessage.includes("403");

        return {
          conversation_id: shared.conversation_id,
          permission: shared.permission,
          title: isNotFound ? "Conversation deleted" : isAccessDenied ? "Access revoked" : "Unable to load",
          created_at: 0,
          error: isNotFound ? "deleted" : isAccessDenied ? "access_denied" : "error",
        };
      });

      // Sort by created_at descending (newest first), errors go to bottom
      return details.sort((a, b) => {
        if (a.error && !b.error) return 1;
        if (!a.error && b.error) return -1;
        return b.created_at - a.created_at;
      });
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
            onClick={() => !conversation.error && handleOpenConversation(conversation.conversation_id)}
            disabled={!!conversation.error}
            className={cn(
              "flex w-full items-center gap-3 rounded-xl border border-border bg-card p-4 text-left transition-colors",
              conversation.error
                ? "cursor-not-allowed opacity-60"
                : "hover:bg-accent"
            )}
          >
            {conversation.error ? (
              <ExclamationTriangleIcon className="size-5 shrink-0 text-destructive" />
            ) : (
              <ShareIcon className="size-5 shrink-0 text-muted-foreground" />
            )}
            <div className="min-w-0 flex-1">
              <div className={cn("truncate font-medium", conversation.error && "text-muted-foreground")}>
                {conversation.title}
              </div>
              <div className="text-muted-foreground text-xs">
                {conversation.error
                  ? conversation.error === "deleted"
                    ? "This conversation no longer exists"
                    : conversation.error === "access_denied"
                      ? "Your access has been revoked"
                      : "Failed to load conversation"
                  : conversation.permission === "write"
                    ? "Can edit"
                    : "View only"}
              </div>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
