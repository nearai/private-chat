import { DocumentDuplicateIcon, ExclamationTriangleIcon, LockClosedIcon } from "@heroicons/react/24/outline";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { Link, useNavigate, useParams, useSearchParams } from "react-router";
import { toast } from "sonner";
import { useCloneChat } from "@/api/chat/queries/useCloneChat";
import { useConversation } from "@/api/chat/queries/useConversation";
import { useGetConversation } from "@/api/chat/queries/useGetConversation";
import { useRemoteConfig } from "@/api/config/queries/useRemoteConfig";
import { useConversationShares } from "@/api/sharing/useConversationShares";
import { useUserData } from "@/api/users/queries/useUserData";
import MessageInput from "@/components/chat/MessageInput";
import MultiResponseMessages from "@/components/chat/messages/MultiResponseMessages";
import ResponseMessage from "@/components/chat/messages/ResponseMessage";
import UserMessage from "@/components/chat/messages/UserMessage";
import Navbar from "@/components/chat/Navbar";
import { OfflineBanner } from "@/components/chat/OfflineBanner";
import { TypingIndicator } from "@/components/chat/TypingIndicator";
import LoadingScreen from "@/components/common/LoadingScreen";
import Spinner from "@/components/common/Spinner";
import { Button } from "@/components/ui/button";
import { useConversationWebSocket } from "@/hooks/useConversationWebSocket";
import { useScrollHandler } from "@/hooks/useScrollHandler";
import { analyzeSiblings, cn, MessageStatus } from "@/lib";
import { MOCK_MESSAGE_RESPONSE_ID_PREFIX, RESPONSE_MESSAGE_CLASSNAME } from "@/lib/constants";
import { unwrapMockResponseID } from "@/lib/utils/mock";
import { useChatStore } from "@/stores/useChatStore";
import { buildConversationEntry, useConversationStore } from "@/stores/useConversationStore";
import { TEMP_RESPONSE_ID } from "@/api/constants";
import { ConversationRoles, ConversationTypes } from "@/types";
import type { ChatStartStreamOptions } from "@/types";
import { useMessagesSignaturesStore } from "@/stores/useMessagesSignaturesStore";
import { useStreamStore } from "@/stores/useStreamStore";
import { useViewStore } from "@/stores/useViewStore";
import type { ResponseInputItem } from "openai/resources/responses/responses.mjs";
import { type ContentItem, type FileContentItem, generateContentFileDataForOpenAI } from "@/types/openai";

const Home = ({
  startStream,
  stopStream,
}: {
  startStream: (options: ChatStartStreamOptions) => Promise<void>;
  stopStream?: () => void;
}) => {
  const { t } = useTranslation("translation", { useSuspense: false });
  const [searchParams, setSearchParams] = useSearchParams();
  const { chatId } = useParams<{ chatId: string }>();
  const navigate = useNavigate();
  const isLeftSidebarOpen = useViewStore((state) => state.isLeftSidebarOpen);
  const [inputValue, setInputValue] = useState("");
  const [modelsInitialized, setModelsInitialized] = useState(false);
  const dataInitializedRef = useRef<boolean>(false);
  const remoteConfig = useRemoteConfig();

  // Get current user info for author attribution
  const { data: userData } = useUserData();
  const currentUserId = userData?.user?.id;
  const currentUserName = userData?.user?.name;

  // Get permission info for shared conversations
  const { data: sharesData } = useConversationShares(chatId);
  const canWrite = sharesData?.can_write ?? true; // Default to true (owner) if not loaded yet
  const ownerName = sharesData?.owner?.name;
  const ownerId = sharesData?.owner?.user_id;
  // Conversation is shared if:
  // 1. Owner has created shares (shares.length > 0), OR
  // 2. Current user is NOT the owner (they're a recipient of a share)
  const isSharedConversation =
    (sharesData?.shares?.length ?? 0) > 0 ||
    (ownerId !== undefined && currentUserId !== undefined && ownerId !== currentUserId);

  // Use the clone hook which invalidates conversation list queries
  const cloneChat = useCloneChat();

  // Hook for adding items without AI response
  const { addItemsToConversation } = useConversation();

  const { models, selectedModels, setSelectedModels, chatOnlyMode } = useChatStore();
  const _activeStreams = useStreamStore((state) => state.activeStreams);
  const selectedModelsRef = useRef(selectedModels);
  selectedModelsRef.current = selectedModels;
  const modelsRef = useRef(models);
  modelsRef.current = models;

  const conversationState = useConversationStore((state) => state.conversation);
  const conversationInitStatus = useConversationStore((state) => state.conversationInitStatus);
  const conversationStreamStatus = useConversationStore((state) => state.conversationStreamStatus);
  const conversationIsReady = useMemo(() => {
    if (!chatId) return true;
    if (!conversationInitStatus.has(chatId)) return true;
    return conversationInitStatus.get(chatId) === "ready";
  }, [chatId, conversationInitStatus]);

  const currentStreamIsActive = useMemo(() => {
    if (!chatId) return false;
    if (!conversationIsReady) return true;
    if (!conversationStreamStatus.has(chatId)) return false;
    return conversationStreamStatus.get(chatId) === "streaming";
  }, [chatId, conversationIsReady, conversationStreamStatus]);

  // Enable polling for real-time sync, but disable while streaming to avoid conflicts
  const {
    isLoading: isConversationsLoading,
    data: conversationData,
    error: conversationError,
  } = useGetConversation(conversationIsReady ? chatId : undefined, {
    polling: !currentStreamIsActive,
  });

  // WebSocket connection for real-time updates in shared conversations
  // Only connects when the conversation is shared
  const { typingUsers, connectionState } = useConversationWebSocket({
    conversationId: chatId ?? null,
    isSharedConversation,
    currentUserId,
  });

  // Parse error type for proper display
  const errorInfo = useMemo(() => {
    if (!conversationError) return null;

    const errorMessage = conversationError instanceof Error ? conversationError.message : String(conversationError);

    // Check for specific error types
    const isAccessDenied =
      errorMessage.toLowerCase().includes("access denied") ||
      errorMessage.toLowerCase().includes("forbidden") ||
      errorMessage.includes("403");
    const isNotFound = errorMessage.toLowerCase().includes("not found") || errorMessage.includes("404");

    if (isAccessDenied) {
      return {
        type: "access_denied" as const,
        title: "Access Denied",
        message: "You don't have permission to view this conversation.",
        icon: LockClosedIcon,
      };
    }
    if (isNotFound) {
      return {
        type: "not_found" as const,
        title: "Conversation Not Found",
        message: "This conversation doesn't exist or has been deleted.",
        icon: ExclamationTriangleIcon,
      };
    }
    return {
      type: "unknown" as const,
      title: "Unable to Load Conversation",
      message: errorMessage || "An unexpected error occurred while loading this conversation.",
      icon: ExclamationTriangleIcon,
    };
  }, [conversationError]);
  const setConversationData = useConversationStore((state) => state.setConversationData);
  const updateConversation = useConversationStore((state) => state.updateConversation);
  const { clearAllSignatures: _clearAllSignatures } = useMessagesSignaturesStore();
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const { handleScroll, scrollToBottom } = useScrollHandler(scrollContainerRef, conversationState ?? undefined, chatId);
  const handleSendMessage = useCallback(
    async (content: string, files: FileContentItem[], webSearchEnabled = false, options?: { forceAIMode?: boolean; forceChatMode?: boolean }) => {
      const { forceAIMode = false, forceChatMode = false } = options ?? {};
      const contentItems: ContentItem[] = [
        { type: "input_text", text: content },
        ...files.map(generateContentFileDataForOpenAI),
      ];

      // Compute previous_response_id from DOM or store
      let prevRespId: string | undefined;
      // First try to get from DOM (handles navigating to previous branches)
      const msgs = scrollContainerRef.current?.getElementsByClassName(RESPONSE_MESSAGE_CLASSNAME);
      const lastMsg = msgs?.item(msgs.length - 1) as HTMLElement | null;
      if (lastMsg) {
        prevRespId = lastMsg.getAttribute("data-response-id") || undefined;
        if (prevRespId?.startsWith(MOCK_MESSAGE_RESPONSE_ID_PREFIX)) {
          prevRespId = unwrapMockResponseID(prevRespId);
        }
      }
      // Fall back to store's lastResponseId (more reliable, especially for chat-only mode)
      if (!prevRespId || prevRespId === "temp-response-id") {
        prevRespId = conversationState?.lastResponseId ?? undefined;
      }

      // Determine if we should use chat-only mode
      // Use chat mode if: forceChatMode OR (chatOnlyMode AND NOT forceAIMode)
      const useChatMode = forceChatMode || (chatOnlyMode && !forceAIMode);

      // In chat-only mode, add items without triggering AI response
      if (useChatMode && isSharedConversation && chatId) {
        try {
          // Build a message item compatible with ResponseInputItem
          const messageItem = {
            type: "message",
            role: "user",
            content: contentItems.map((item) => {
              if (item.type === "input_text") {
                return { type: "input_text", text: item.text ?? "" };
              }
              if (item.type === "input_image") {
                return { type: "input_image", image_url: item.image_url ?? "", detail: "auto" };
              }
              if (item.type === "input_file") {
                return { type: "input_file", file_id: item.file_id ?? "" };
              }
              if (item.type === "input_audio") {
                return { type: "input_audio", data: item.audio_file_id ?? "", format: "wav" };
              }
              // Fallback for any other types
              return { type: "input_text", text: "" };
            }),
          } as ResponseInputItem;

          // Add optimistic message to store BEFORE API call for instant feedback
          const tempId = `temp-message-${crypto.randomUUID()}`;
          updateConversation((draft) => {
            if (!draft.conversation) return draft;

            const optimisticMessage = {
              id: tempId,
              response_id: TEMP_RESPONSE_ID,
              next_response_ids: [],
              created_at: Date.now(),
              status: "pending" as const,
              role: ConversationRoles.USER,
              type: ConversationTypes.MESSAGE,
              content: contentItems,
              previous_response_id: prevRespId,
            };

            draft.conversation.conversation.data.push(optimisticMessage);

            // Rebuild history and batches to include the new message
            const { history, allMessages, lastResponseId, batches } = buildConversationEntry(
              draft.conversation.conversation,
              TEMP_RESPONSE_ID
            );
            draft.conversation.history = history;
            draft.conversation.allMessages = allMessages;
            draft.conversation.lastResponseId = lastResponseId;
            draft.conversation.batches = batches;

            // Link to parent
            if (prevRespId) {
              const parent = draft.conversation.history.messages[prevRespId];
              if (parent && !parent.nextResponseIds.includes(TEMP_RESPONSE_ID)) {
                parent.nextResponseIds = [...parent.nextResponseIds, TEMP_RESPONSE_ID];
              }
            }

            return draft;
          });

          scrollToBottom();

          console.debug("Chat-only mode: sending message", messageItem, "prevRespId:", prevRespId);
          const result = await addItemsToConversation.mutateAsync({
            conversationId: chatId,
            items: [messageItem],
            previousResponseId: prevRespId,
          });
          console.debug("Chat-only mode: message sent successfully", result);
        } catch (error) {
          console.error("Failed to add chat message:", error);
          toast.error("Failed to send message");
        }
        return;
      }

      await startStream({
        contentItems,
        webSearchEnabled,
        conversationId: chatId,
        previous_response_id: prevRespId,
        initiator: "new_message",
      });
      scrollToBottom();
    },
    [chatId, scrollToBottom, startStream, chatOnlyMode, isSharedConversation, addItemsToConversation, conversationState?.lastResponseId, updateConversation]
  );

  const handleCopyAndContinue = useCallback(async () => {
    if (!chatId) return;

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
  }, [chatId, cloneChat, navigate]);

  useEffect(() => {
    if (!chatId || !conversationData) return;
    if (conversationState?.conversationId !== chatId) {
      dataInitializedRef.current = false;
    }
    
    if (dataInitializedRef.current) return;
    if (isConversationsLoading || currentStreamIsActive) return;
    if (!conversationIsReady) return;
    if (!conversationData.data?.length) return;
    setConversationData(conversationData);
    dataInitializedRef.current = true;
  }, [
    chatId, 
    isConversationsLoading, 
    currentStreamIsActive, 
    conversationData, 
    setConversationData, 
    conversationState?.conversationId, 
    conversationIsReady
  ]);

  // Sync store with query data when it changes (for real-time updates)
  // This runs AFTER initial load, when query refetches due to invalidation
  useEffect(() => {
    // Only run if already initialized and not streaming
    if (!dataInitializedRef.current) return;
    if (!chatId || !conversationData) return;
    if (currentStreamIsActive) return;
    if (conversationState?.conversationId !== chatId) return;

    // Check if query data has more items than store data
    const queryDataLength = conversationData.data?.length ?? 0;
    const storeDataLength = conversationState?.conversation?.data?.length ?? 0;

    // Check if store has temp messages that need to be replaced with real ones
    const hasTempMessages = conversationState?.lastResponseId === TEMP_RESPONSE_ID;

    if (queryDataLength > storeDataLength || (hasTempMessages && queryDataLength >= storeDataLength)) {
      console.log("Syncing store with new query data:", queryDataLength, "vs", storeDataLength, "hasTempMessages:", hasTempMessages);
      setConversationData(conversationData);
    }
  }, [
    chatId,
    conversationData,
    currentStreamIsActive,
    setConversationData,
    conversationState?.conversationId,
    conversationState?.conversation?.data?.length,
    conversationState?.lastResponseId,
  ]);

  const isMessageCompleted = useMemo(() => {
    const last = conversationData?.data?.at(-1);
    return !last || last.role !== "assistant" || last.status === "completed";
  }, [conversationData?.data]);

  const history = conversationState?.history ?? { messages: {} };
  const allMessages = conversationState?.allMessages ?? {};
  const treeBatches = conversationState?.batches ?? [];

  // For shared conversations, show ALL messages chronologically instead of tree-based batches
  // This ensures human-to-human chat messages don't get hidden in branches
  // Use store data (includes optimistic messages) rather than query data
  const storeMessages = conversationState?.conversation?.data;
  const batches = useMemo(() => {
    if (!isSharedConversation || !storeMessages?.length) {
      return treeBatches;
    }

    // Get all unique response_ids in chronological order (by first message appearance)
    const seenResponseIds = new Set<string>();
    const chronologicalBatches: string[] = [];

    for (const msg of storeMessages) {
      if (msg.response_id && !seenResponseIds.has(msg.response_id)) {
        seenResponseIds.add(msg.response_id);
        chronologicalBatches.push(msg.response_id);
      }
    }

    return chronologicalBatches;
  }, [isSharedConversation, storeMessages, treeBatches]);

  const renderedMessages = useMemo(() => {
    if (!batches.length) return [];

    return batches
      .filter((batch) => {
        const batchMessage = history.messages[batch];
        return !!batchMessage;
      })
      .map((batch, idx) => {
        const isLast = idx === batches.length - 1;
        const batchMessage = history.messages[batch];
        if (!batchMessage) return null;

        // For shared conversations, skip sibling detection - show all messages chronologically
        // This prevents optimistic messages from briefly showing as alternatives
        const { inputSiblings, responseSiblings } = isSharedConversation
          ? { inputSiblings: [], responseSiblings: [] }
          : analyzeSiblings(batch, history, allMessages);

        if (batchMessage.status === MessageStatus.INPUT && batchMessage.userPromptId !== null) {
          return (
            <UserMessage
              key={batchMessage.userPromptId}
              history={history}
              allMessages={allMessages}
              batchId={batch}
              regenerateResponse={startStream}
              siblings={inputSiblings.length > 1 ? inputSiblings : undefined}
              ownerName={ownerName}
              currentUserId={currentUserId}
              currentUserName={currentUserName}
            />
          );
        }
        if (
          !batchMessage.outputMessagesIds.length &&
          !batchMessage.reasoningMessagesIds.length &&
          !batchMessage.webSearchMessagesIds.length
        ) {
          return null;
        }
        const messages = [];

        if (batchMessage.userPromptId) {
          messages.push(
            <UserMessage
              key={batchMessage.userPromptId}
              history={history}
              allMessages={allMessages}
              batchId={batch}
              regenerateResponse={startStream}
              siblings={inputSiblings.length > 1 ? inputSiblings : undefined}
              ownerName={ownerName}
              currentUserId={currentUserId}
              currentUserName={currentUserName}
            />
          );
        }

        // Show MultiResponseMessages if there are multiple responses for the same input
        // This can happen even when there are input siblings
        if (responseSiblings.length > 1) {
          messages.push(
            <MultiResponseMessages
              key={batchMessage.parentResponseId}
              history={history}
              allMessages={allMessages}
              batchId={batch}
              currentBatchBundle={batches}
              isLastMessage={isLast}
              readOnly={false}
              regenerateResponse={startStream}
              responseSiblings={responseSiblings}
            />
          );
        } else {
          messages.push(
            <ResponseMessage
              key={batchMessage.responseId}
              history={history}
              allMessages={allMessages}
              batchId={batch}
              isLastMessage={isLast}
              readOnly={false}
              regenerateResponse={startStream}
              siblings={[]}
            />
          );
        }
        return messages;
      });
  }, [batches, history, allMessages, isSharedConversation, startStream, ownerName, currentUserId, currentUserName]);

  const lastBatchMessages = useMemo(() => {
    if (!batches.length) return [];
    const lastBatchId = batches[batches.length - 1];
    const lastBatchMessage = history.messages[lastBatchId];
    if (!lastBatchMessage) return [];
    const parentResponseId = lastBatchMessage.parentResponseId;
    if (!parentResponseId) return [];
    const parent = history.messages[parentResponseId];
    if (!parent) return [];
    if (!parent.nextResponseIds?.length) return [];
    return parent.nextResponseIds.map((respId) => {
      const batch = Object.values(history.messages).find((msg) => msg.responseId === respId);
      return batch?.userPromptId ? allMessages[batch.userPromptId] : null;
    }).filter((resp) => resp !== null).sort((a, b) => {
      if (!a || !b) return 0;
      return a.created_at - b.created_at;
    }) as typeof allMessages[string][];
  }, [history, batches, allMessages]);

  useEffect(() => {
    if (!chatId) return;

    const NEW_CHAT_KEY = "new";
    const isNewChat = searchParams.has(NEW_CHAT_KEY);
    if (isNewChat) {
      setModelsInitialized(true);
      setSearchParams((prev) => {
        prev.delete(NEW_CHAT_KEY);
        return prev;
      });
      return;
    }

    if (modelsInitialized) return;
    const newModels: string[] = [];
    const defaultModel = modelsRef.current.find((model) => model.modelId === remoteConfig.data?.default_model);
    lastBatchMessages.forEach((msg) => {
      const msgModel = msg?.model;
      if (!msgModel) return;
      if (modelsRef.current.find((m) => m.modelId.includes(msgModel))) {
        if (newModels.includes(msgModel)) return;
        newModels.push(msgModel);
      }
    });

    if (lastBatchMessages.length > 0) {
      setModelsInitialized(true);
    }

    if (newModels.length === 0 && defaultModel) {
      newModels.push(defaultModel.modelId);
    }
    if (newModels.length > 0) {
      const currentModels = selectedModelsRef.current;
      const isModelsSame =
        currentModels.length === newModels.length &&
        currentModels.every((model, index) => model === newModels[index]);
      if (!isModelsSame) {
        setSelectedModels(newModels);
      }
    }
  }, [
    chatId,
    modelsInitialized,
    lastBatchMessages,
    searchParams,
    remoteConfig.data?.default_model,
    setSelectedModels,
    setSearchParams,
  ]);

  const isLoading = isConversationsLoading || !conversationIsReady;

  // Show error UI if there's an error loading the conversation
  if (errorInfo && chatId) {
    const ErrorIcon = errorInfo.icon;
    return (
      <div className="flex h-full flex-col" id="chat-container">
        <Navbar isSharedConversation={isSharedConversation} connectionState={connectionState} />
        <div className="flex flex-1 flex-col items-center justify-center gap-6 p-6">
          <div className="flex flex-col items-center gap-4 text-center">
            <div className="flex size-16 items-center justify-center rounded-full bg-destructive/10">
              <ErrorIcon className="size-8 text-destructive" />
            </div>
            <h1 className="font-semibold text-2xl">{errorInfo.title}</h1>
            <p className="max-w-md text-muted-foreground">{errorInfo.message}</p>
          </div>
          <div className="flex gap-3">
            <Link
              to="/"
              className="rounded-xl bg-secondary px-6 py-3 font-medium transition-colors hover:bg-secondary/80"
            >
              Go to Home
            </Link>
          </div>
        </div>
      </div>
    );
  }
  return (
    <div className="flex h-full flex-col" id="chat-container">
      <Navbar isSharedConversation={isSharedConversation} connectionState={connectionState} />
      <OfflineBanner connectionState={connectionState} isSharedConversation={isSharedConversation} />

      {isLoading && <LoadingScreen />}

      <div
        ref={scrollContainerRef}
        id="messages-container"
        onScroll={handleScroll}
        className={cn("flex-1 space-y-4 overflow-y-auto px-4 py-4 pt-8 transition-opacity delay-200 duration-500", {
          "pl-12.5": !isLeftSidebarOpen,
          "hidden opacity-0": isLoading,
        })}
      >
        {renderedMessages}
      </div>

      {/* Show MessageInput for users with write access, or Copy & Continue for read-only */}
      {canWrite ? (
        <div className="flex flex-col items-center">
          {/* Typing indicator for shared conversations */}
          {isSharedConversation && typingUsers.length > 0 && (
            <TypingIndicator typingUsers={typingUsers} className="w-full max-w-3xl" />
          )}
          <MessageInput
            onSubmit={handleSendMessage}
            prompt={inputValue}
            setPrompt={setInputValue}
            selectedModels={selectedModels}
            isMessageCompleted={isMessageCompleted}
            stopStream={stopStream}
            isConversationStreamActive={currentStreamIsActive}
            allMessages={allMessages}
            autoFocusKey={chatId ?? "home"}
            isSharedConversation={isSharedConversation}
            conversationId={chatId}
          />
          <p className="px-4 pb-4 text-muted-foreground text-xs">
            {t("AI can make mistakes. Verify information before relying on it.")}
          </p>
        </div>
      ) : (
        <div className="border-border border-t bg-muted/30 px-4 py-4">
          <div className="mx-auto max-w-3xl">
            {ownerName && (
              <p className="mb-2 text-center text-muted-foreground text-xs sm:text-left">
                Shared by {ownerName}
              </p>
            )}
            <div className="flex flex-col items-center gap-3 sm:flex-row sm:justify-between">
              <div className="text-center sm:text-left">
                <p className="font-medium text-sm">Want to continue this conversation?</p>
                <p className="text-muted-foreground text-xs">
                  Copy this conversation to your account and continue where it left off
                </p>
              </div>
              <Button onClick={handleCopyAndContinue} disabled={cloneChat.isPending} className="rounded-xl px-6">
                {cloneChat.isPending ? (
                  <Spinner className="size-4" />
                ) : (
                  <>
                    <DocumentDuplicateIcon className="mr-2 size-4" />
                    Copy & Continue
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Home;
