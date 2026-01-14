import { useEffect, useState } from "react";
import { useParams, Link } from "react-router";
import { ShareIcon, ExclamationTriangleIcon } from "@heroicons/react/24/outline";
import { chatClient } from "@/api/chat/client";
import { cn } from "@/lib";
import type { Conversation, ConversationItemsResponse, ConversationUserInput, ConversationModelOutput } from "@/types";
import { ConversationTypes } from "@/types";
import NearAIIcon from "@/assets/icons/near-ai.svg?react";
import { LOCAL_STORAGE_KEYS } from "@/lib/constants";

// Helper to check if an item is a displayable message
const isMessageItem = (item: unknown): item is ConversationUserInput | ConversationModelOutput => {
  return (
    typeof item === "object" &&
    item !== null &&
    "type" in item &&
    (item as { type: string }).type === ConversationTypes.MESSAGE
  );
};

export default function PublicSharedPage() {
  const { token } = useParams<{ token: string }>();
  const [conversation, setConversation] = useState<Conversation | null>(null);
  const [items, setItems] = useState<ConversationItemsResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const isLoggedIn = typeof window !== "undefined" && Boolean(localStorage.getItem(LOCAL_STORAGE_KEYS.TOKEN));

  useEffect(() => {
    if (!token) {
      setError("Invalid share link");
      setIsLoading(false);
      return;
    }

    const fetchSharedConversation = async () => {
      try {
        const [conv, convItems] = await Promise.all([
          chatClient.getPublicSharedConversation(token),
          chatClient.getPublicSharedConversationItems(token),
        ]);
        setConversation(conv);
        setItems(convItems);
      } catch (err) {
        console.error("Failed to fetch shared conversation:", err);
        if (typeof err === "object" && err !== null && "detail" in err) {
          setError((err as { detail: string }).detail);
        } else if (err instanceof Error) {
          setError(err.message);
        } else {
          setError("This shared link is invalid or has expired");
        }
      } finally {
        setIsLoading(false);
      }
    };

    fetchSharedConversation();
  }, [token]);

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <div className="flex items-center gap-3 text-muted-foreground">
          <div className="size-6 animate-spin rounded-full border-2 border-current border-t-transparent" />
          <span className="text-lg">Loading shared conversation...</span>
        </div>
      </div>
    );
  }

  if (error || !conversation) {
    return (
      <div className="flex h-screen flex-col items-center justify-center gap-6 bg-background p-6">
        <div className="flex flex-col items-center gap-4 text-center">
          <div className="flex size-16 items-center justify-center rounded-full bg-destructive/10">
            <ExclamationTriangleIcon className="size-8 text-destructive" />
          </div>
          <h1 className="font-semibold text-2xl">Unable to access conversation</h1>
          <p className="max-w-md text-muted-foreground">
            {error || "This shared link is invalid or has expired."}
          </p>
        </div>
        <Link
          to="/"
          className="rounded-xl bg-primary px-6 py-3 font-medium text-primary-foreground transition-colors hover:bg-primary/90"
        >
          Go to NEAR AI Chat
        </Link>
      </div>
    );
  }

  const title = conversation.metadata?.title || "Shared Conversation";

  // Filter to only message items (user and assistant messages)
  const messages = (items?.data || [])
    .filter(isMessageItem)
    .map((item) => ({
      id: item.id,
      role: item.role,
      content: item.content,
      status: item.status,
      created_at: item.created_at,
    }));

  return (
    <div className="flex h-screen flex-col bg-background">
      {/* Header */}
      <header className="flex items-center justify-between border-border border-b px-4 py-3">
        <div className="flex items-center gap-3">
          <NearAIIcon className="h-8" />
          <div className="h-6 w-px bg-border" />
          <div className="flex items-center gap-2">
            <ShareIcon className="size-4 text-muted-foreground" />
            <span className="text-muted-foreground text-sm">Shared conversation</span>
          </div>
        </div>
        {!isLoggedIn && (
          <Link
            to="/auth"
            className="rounded-lg bg-primary px-4 py-2 font-medium text-primary-foreground text-sm transition-colors hover:bg-primary/90"
          >
            Sign in
          </Link>
        )}
        {isLoggedIn && (
          <Link
            to="/"
            className="rounded-lg bg-secondary px-4 py-2 font-medium text-sm transition-colors hover:bg-secondary/80"
          >
            Go to my chats
          </Link>
        )}
      </header>

      {/* Title */}
      <div className="border-border border-b px-6 py-4">
        <h1 className="font-semibold text-xl">{title}</h1>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto">
        <div className="mx-auto max-w-3xl px-4 py-6">
          {messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
              <ShareIcon className="mb-4 size-12 opacity-50" />
              <p>This conversation is empty</p>
            </div>
          ) : (
            <div className="space-y-6">
              {messages.map((message) => (
                <div
                  key={message.id}
                  className={cn(
                    "rounded-2xl p-4",
                    message.role === "user"
                      ? "ml-auto max-w-[85%] bg-primary text-primary-foreground"
                      : "bg-muted"
                  )}
                >
                  {message.role !== "user" && (
                    <div className="mb-2 font-medium text-muted-foreground text-xs">
                      Assistant
                    </div>
                  )}
                  <div className="whitespace-pre-wrap text-sm">
                    {Array.isArray(message.content)
                      ? message.content
                          .filter((c) => c.type === "input_text" || c.type === "output_text")
                          .map((c) => ("text" in c ? c.text : ""))
                          .join("\n")
                      : typeof message.content === "string"
                        ? message.content
                        : ""}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Footer */}
      <footer className="border-border border-t px-4 py-3 text-center text-muted-foreground text-xs">
        Powered by <a href="https://near.ai" className="font-medium hover:underline">NEAR AI</a>
      </footer>
    </div>
  );
}
