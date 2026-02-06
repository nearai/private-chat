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
import { formatDate } from "@/lib/time";

// Helper to check if an item is a displayable message (excludes reasoning items)
const isMessageItem = (item: unknown): item is ConversationUserInput | ConversationModelOutput => {
  if (
    typeof item !== "object" ||
    item === null ||
    !("type" in item)
  ) {
    return false;
  }
  const itemType = (item as { type: string }).type;
  // Only include MESSAGE type items (this automatically excludes REASONING, WEB_SEARCH_CALL, etc.)
  return itemType === ConversationTypes.MESSAGE;
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

  // Organize messages into conversation groups (user message + parallel responses)
  const conversationGroups = useMemo(() => {
    type MessageItem = ConversationUserInput | ConversationModelOutput;
    const allItems: MessageItem[] = (items?.data || []).filter(isMessageItem);
    const itemsByResponseId = new Map(allItems.map((item) => [item.response_id, item]));
    
    // Group assistant messages by their previous_response_id (parent)
    const responsesByParent = new Map<string, MessageItem[]>();
    
    // Track user messages and group by content to avoid duplicates
    const userMessagesByContent = new Map<string, MessageItem>();
    const userMessageOrder: string[] = [];
    
    allItems.forEach((item) => {
      if (item.role === "user") {
        const contentArray = Array.isArray(item.content) ? item.content : [];
        const messageContent = extractMessageContent(contentArray, "input_text");
        
        // Only keep the first occurrence of each unique content
        if (!userMessagesByContent.has(messageContent)) {
          userMessagesByContent.set(messageContent, item);
          userMessageOrder.push(messageContent);
        }
      } else if (item.previous_response_id) {
        // This is an assistant response
        const parentResponseId = item.previous_response_id;
        if (!responsesByParent.has(parentResponseId)) {
          responsesByParent.set(parentResponseId, []);
        }
        responsesByParent.get(parentResponseId)!.push(item);
      }
    });
    
    // Build conversation groups maintaining order and deduplicating by content
    const groups: Array<{
      userMessage?: MessageItem;
      responses: MessageItem[];
    }> = [];
    
    // Process user messages by content (deduplicated) and collect all responses
    userMessageOrder.forEach((content) => {
      const userMsg = userMessagesByContent.get(content);
      if (!userMsg) return;
      
      // Collect all responses from all user messages with this content
      const allResponses: MessageItem[] = [];
      const seenResponseIds = new Set<string>();
      
      // Find all user messages with the same content
      allItems.forEach((item) => {
        if (item.role === "user") {
          const itemContentArray = Array.isArray(item.content) ? item.content : [];
          const itemContent = extractMessageContent(itemContentArray, "input_text");
          
          if (itemContent === content) {
            // Get responses for this user message
            const responses = responsesByParent.get(item.response_id) || [];
            responses.forEach((response) => {
              // Avoid duplicate responses
              if (!seenResponseIds.has(response.id)) {
                seenResponseIds.add(response.id);
                allResponses.push(response);
              }
            });
          }
        }
      });
      
      // Deduplicate by model - keep only the last/most recent response per model
      const responsesByModel = new Map<string, MessageItem>();
      allResponses.forEach((response) => {
        const modelKey = response.model || "";
        const existing = responsesByModel.get(modelKey);
        if (!existing || (response.created_at || 0) > (existing.created_at || 0)) {
          responsesByModel.set(modelKey, response);
        }
      });
      
      groups.push({
        userMessage: userMsg,
        responses: Array.from(responsesByModel.values()).sort((a, b) => {
          // Sort by model name, then by created_at
          if (a.model !== b.model) {
            return (a.model || "").localeCompare(b.model || "");
          }
          return (a.created_at || 0) - (b.created_at || 0);
        }),
      });
    });
    
    // Also include orphaned assistant messages (no parent user message found)
    responsesByParent.forEach((responses, parentResponseId) => {
      if (!itemsByResponseId.has(parentResponseId)) {
        // Deduplicate by model - keep only the last/most recent response per model
        const orphanedResponsesByModel = new Map<string, MessageItem>();
        responses.forEach((response) => {
          const modelKey = response.model || "";
          const existing = orphanedResponsesByModel.get(modelKey);
          if (!existing || (response.created_at || 0) > (existing.created_at || 0)) {
            orphanedResponsesByModel.set(modelKey, response);
          }
        });
        
        // Parent not found, add as orphaned responses
        groups.push({
          userMessage: undefined,
          responses: Array.from(orphanedResponsesByModel.values()).sort((a, b) => {
            if (a.model !== b.model) {
              return (a.model || "").localeCompare(b.model || "");
            }
            return (a.created_at || 0) - (b.created_at || 0);
          }),
        });
      }
    });
    
    return groups;
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
        <div className="mx-auto max-w-6xl px-4 py-6">
          {conversationGroups.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
              <DocumentDuplicateIcon className="mb-4 size-12 opacity-50" />
              <p>This conversation is empty</p>
            </div>
          ) : (
            <div className="space-y-6">
              {conversationGroups.map((group, groupIdx) => {
                const hasMultipleResponses = group.responses.length > 1;
                
                return (
                  <div key={groupIdx} className="space-y-4">
                    {/* User message */}
                    {group.userMessage && (() => {
                      const userMsg = group.userMessage!;
                      const contentArray = Array.isArray(userMsg.content) ? userMsg.content : [];
                      const messageContent = extractMessageContent(contentArray, "input_text");
                      const authorName = (userMsg as ConversationUserInput).metadata?.author_name;
                      
                      return (
                        <div className="flex w-full flex-col items-end">
                          <div className="max-w-[85%] rounded-xl bg-card px-4 py-2">
                            {authorName && (
                              <div className="mb-1.5 font-medium text-primary text-xs">
                                {authorName}
                              </div>
                            )}
                            {messageContent ? (
                              <div className={cn("markdown-prose w-full min-w-full", "chat-user")}>
                                <div className="markdown-content wrap-break-word text-foreground">
                                  <MarkDown messageContent={messageContent} batchId={userMsg.id} />
                                </div>
                              </div>
                            ) : (
                              <div className="text-muted-foreground text-sm">Empty message</div>
                            )}
                            {userMsg.created_at && (
                              <div className="mt-2 text-right text-muted-foreground text-xs" title={formatDate(userMsg.created_at)}>
                                {formatDate(userMsg.created_at)}
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })()}

                    {/* Assistant responses - display in parallel if multiple */}
                    {group.responses.length > 0 && (
                      <div className={cn(
                        "w-full",
                        hasMultipleResponses && "grid",
                        hasMultipleResponses && group.responses.length === 2 && "grid-cols-1 gap-4 sm:grid-cols-2",
                        hasMultipleResponses && group.responses.length >= 3 && "grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 lg:gap-4"
                      )}>
                        {group.responses.map((response) => {
                          const contentArray = Array.isArray(response.content) ? response.content : [];
                          const messageContent = extractMessageContent(contentArray, "output_text");
                          
                          return (
                            <div
                              key={response.id}
                              className={cn(
                                "rounded-2xl border border-border/50 bg-background p-5 shadow-sm transition-shadow hover:shadow-md",
                                !hasMultipleResponses && "w-full",
                                hasMultipleResponses && "min-w-0"
                              )}
                            >
                              {/* Model name and timestamp */}
                              <div className="mb-3 flex items-center justify-between gap-2 border-border/30 border-b pb-2">
                                {response.model && (
                                  <span className="min-w-0 flex-1 truncate font-semibold text-foreground text-sm" title={response.model}>
                                    {response.model}
                                  </span>
                                )}
                                {response.created_at && (
                                  <span className="flex-shrink-0 whitespace-nowrap text-muted-foreground text-xs" title={formatDate(response.created_at)}>
                                    {formatDate(response.created_at)}
                                  </span>
                                )}
                              </div>

                              {/* Message content */}
                              {messageContent ? (
                                <div className={cn("markdown-prose w-full min-w-full", "chat-assistant")}>
                                  <div className="markdown-content wrap-break-word">
                                    <MarkDown messageContent={messageContent} batchId={response.id} />
                                  </div>
                                </div>
                              ) : (
                                <div className="text-muted-foreground text-sm">Empty message</div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Footer - Copy & Continue CTA */}
      <footer className="border-border border-t bg-muted/30 px-4 py-4">
        <div className="mx-auto max-w-6xl">
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
