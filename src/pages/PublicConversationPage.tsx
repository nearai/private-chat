import { useEffect, useState, useMemo } from "react";
import { useParams, Link, useNavigate } from "react-router";
import { ArrowRightOnRectangleIcon, DocumentDuplicateIcon } from "@heroicons/react/24/outline";
import { chatClient } from "@/api/chat/client";
import { useCloneChat } from "@/api/chat/queries/useCloneChat";
import { cn } from "@/lib";
import type { Conversation, ConversationItemsResponse, ConversationUserInput, ConversationModelOutput } from "@/types";
import { ConversationTypes } from "@/types";
import { extractMessageContent } from "@/types/openai";
import NearAIIcon from "@/assets/icons/near-ai.svg?react";
import { LOCAL_STORAGE_KEYS } from "@/lib/constants";
import { toast } from "sonner";
import Spinner from "@/components/common/Spinner";
import { Button } from "@/components/ui/button";
import { MarkDown } from "@/components/chat/messages/MarkdownTokens";

// Helper to check if an item is a displayable message
const isMessageItem = (item: unknown): item is ConversationUserInput | ConversationModelOutput => {
  return (
    typeof item === "object" &&
    item !== null &&
    "type" in item &&
    (item as { type: string }).type === ConversationTypes.MESSAGE
  );
};

export default function PublicConversationPage() {
  const { chatId } = useParams<{ chatId: string }>();
  const navigate = useNavigate();
  const [conversation, setConversation] = useState<Conversation | null>(null);
  const [items, setItems] = useState<ConversationItemsResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const isLoggedIn = typeof window !== "undefined" && Boolean(localStorage.getItem(LOCAL_STORAGE_KEYS.TOKEN));

  // Use the clone hook which invalidates conversation list queries
  const cloneChat = useCloneChat();

  useEffect(() => {
    if (!chatId) {
      setError("Invalid conversation link");
      setIsLoading(false);
      return;
    }

    const fetchPublicConversation = async () => {
      try {
        const [conv, convItems] = await Promise.all([
          chatClient.getConversation(chatId, { requiresAuth: false }),
          chatClient.getConversationItems(chatId, { requiresAuth: false }),
        ]);
        setConversation(conv);
        setItems(convItems);
      } catch (err) {
        console.error("Failed to fetch public conversation:", err);
        if (typeof err === "object" && err !== null && "detail" in err) {
          setError((err as { detail: string }).detail);
        } else if (err instanceof Error) {
          setError(err.message);
        } else {
          setError("This conversation is not publicly accessible");
        }
      } finally {
        setIsLoading(false);
      }
    };

    fetchPublicConversation();
  }, [chatId]);

  const handleCopyAndContinue = async () => {
    if (!chatId || !isLoggedIn) {
      // Redirect to login with return URL
      navigate(`/auth?redirect=/c/${chatId}`);
      return;
    }

    try {
      const clonedChat = await cloneChat.mutateAsync({ id: chatId });
      toast.success("Conversation copied to your account");
      // Navigate to the cloned conversation
      if (clonedChat && typeof clonedChat === "object" && "id" in clonedChat) {
        navigate(`/c/${clonedChat.id}`);
      }
    } catch (err) {
      console.error("Failed to clone conversation:", err);
      toast.error("Failed to copy conversation");
    }
  };

  const title = useMemo(() => {
    return conversation?.metadata?.title || "Shared Conversation";
  }, [conversation]);

  // Filter to only message items (user and assistant messages)
  const messages = useMemo(() => {
    return (items?.data || [])
      .filter(isMessageItem)
      .map((item) => {
        const contentArray = Array.isArray(item.content) ? item.content : [];
        const messageContent = extractMessageContent(
          contentArray,
          item.role === "user" ? "input_text" : "output_text"
        );
        return {
          id: item.id,
          role: item.role,
          content: item.content,
          messageContent,
          status: item.status,
          created_at: item.created_at,
        };
      });
  }, [items]);

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <div className="flex items-center gap-3 text-muted-foreground">
          <div className="size-6 animate-spin rounded-full border-2 border-current border-t-transparent" />
          <span className="text-lg">Loading conversation...</span>
        </div>
      </div>
    );
  }

  if (error || !conversation) {
    return (
      <div className="flex h-screen flex-col items-center justify-center gap-6 bg-background p-6">
        <div className="flex flex-col items-center gap-4 text-center">
          <div className="flex size-16 items-center justify-center rounded-full bg-destructive/10">
            <ArrowRightOnRectangleIcon className="size-8 text-destructive" />
          </div>
          <h1 className="font-semibold text-2xl">Unable to access conversation</h1>
          <p className="max-w-md text-muted-foreground">
            {error || "This conversation is not publicly accessible. Please sign in to continue."}
          </p>
        </div>
        <Link
          to={chatId ? `/auth?redirect=/c/${chatId}` : "/auth"}
          className="rounded-xl bg-primary px-6 py-3 font-medium text-primary-foreground transition-colors hover:bg-primary/90"
        >
          Sign in to NEAR AI Chat
        </Link>
      </div>
    );
  }

  return (
    <div className="flex h-screen flex-col bg-background">
      {/* Header */}
      <header className="flex items-center justify-between border-border border-b px-4 py-3">
        <div className="flex items-center gap-3">
          <NearAIIcon className="h-8" />
          <div className="h-6 w-px bg-border" />
          <span className="text-muted-foreground text-sm">Public conversation</span>
        </div>
        <div className="flex items-center gap-2">
          {isLoggedIn ? (
            <Link
              to="/"
              className="rounded-lg bg-secondary px-4 py-2 font-medium text-sm transition-colors hover:bg-secondary/80"
            >
              Go to my chats
            </Link>
          ) : (
            <Link
              to={`/auth?redirect=/c/${chatId}`}
              className="rounded-lg bg-primary px-4 py-2 font-medium text-primary-foreground text-sm transition-colors hover:bg-primary/90"
            >
              Sign in
            </Link>
          )}
        </div>
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
              <DocumentDuplicateIcon className="mb-4 size-12 opacity-50" />
              <p>This conversation is empty</p>
            </div>
          ) : (
            <div className="space-y-4">
              {messages.map((message) => (
                <div
                  key={message.id}
                  className={cn(
                    "w-full",
                    message.role === "user" ? "flex flex-col items-end" : ""
                  )}
                >
                  <div
                    className={cn(
                      "rounded-xl px-4 py-2",
                      message.role === "user"
                        ? "max-w-[90%] bg-card"
                        : "w-full"
                    )}
                  >
                    {message.messageContent ? (
                      <div className={cn("markdown-prose w-full min-w-full", `chat-${message.role}`)}>
                        <div className="markdown-content wrap-break-word">
                          <MarkDown messageContent={message.messageContent} batchId={message.id} />
                        </div>
                      </div>
                    ) : (
                      <div className="text-muted-foreground text-sm">Empty message</div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Footer - Copy & Continue CTA */}
      <footer className="border-border border-t bg-muted/30 px-4 py-4">
        <div className="mx-auto max-w-3xl">
          <div className="flex flex-col items-center gap-3 sm:flex-row sm:justify-between">
            <div className="text-center sm:text-left">
              <p className="font-medium text-sm">Want to continue this conversation?</p>
              <p className="text-muted-foreground text-xs">
                {isLoggedIn
                  ? "Copy this conversation to your account and continue where it left off"
                  : "Sign in to copy this conversation and continue where it left off"}
              </p>
            </div>
            <Button
              onClick={handleCopyAndContinue}
              disabled={cloneChat.isPending}
              className="rounded-xl px-6"
            >
              {cloneChat.isPending ? (
                <Spinner className="size-4" />
              ) : (
                <>
                  <DocumentDuplicateIcon className="mr-2 size-4" />
                  {isLoggedIn ? "Copy & Continue" : "Sign in to Continue"}
                </>
              )}
            </Button>
          </div>
        </div>
      </footer>
    </div>
  );
}
