import { ExclamationTriangleIcon, ShareIcon } from "@heroicons/react/24/outline";
import { useMemo } from "react";
import { useNavigate } from "react-router";
import { useSharedWithMe } from "@/api/sharing/useSharedWithMe";
import { cn } from "@/lib";

export default function SharedPage() {
  const navigate = useNavigate();
  const { data: sharedConversations, isLoading } = useSharedWithMe();

  // Sort conversations: valid ones by created_at descending, errors at bottom
  const sortedConversations = useMemo(() => {
    if (!sharedConversations) return [];

    return [...sharedConversations].sort((a, b) => {
      if (a.error && !b.error) return 1;
      if (!a.error && b.error) return -1;
      return (b.created_at ?? 0) - (a.created_at ?? 0);
    });
  }, [sharedConversations]);

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

  if (!sortedConversations.length) {
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
          {sortedConversations.length} conversation{sortedConversations.length !== 1 ? "s" : ""} shared with you
        </p>
      </div>

      <div className="space-y-2">
        {sortedConversations.map((conversation) => {
          const hasError = !!conversation.error;
          const displayTitle = conversation.title || "Untitled";

          return (
            <button
              key={conversation.conversation_id}
              onClick={() => !hasError && handleOpenConversation(conversation.conversation_id)}
              disabled={hasError}
              className={cn(
                "flex w-full items-center gap-3 rounded-xl border border-border bg-card p-4 text-left transition-colors",
                hasError ? "cursor-not-allowed opacity-60" : "hover:bg-accent"
              )}
            >
              {hasError ? (
                <ExclamationTriangleIcon className="size-5 shrink-0 text-destructive" />
              ) : (
                <ShareIcon className="size-5 shrink-0 text-muted-foreground" />
              )}
              <div className="min-w-0 flex-1">
                <div className={cn("truncate font-medium", hasError && "text-muted-foreground")}>{displayTitle}</div>
                <div className="text-muted-foreground text-xs">
                  {hasError
                    ? "Failed to load conversation details"
                    : conversation.permission === "write"
                      ? "Can edit"
                      : "View only"}
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
