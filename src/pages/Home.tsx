import { DocumentDuplicateIcon, ExclamationTriangleIcon, LockClosedIcon } from "@heroicons/react/24/outline";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { Link, useNavigate, useParams, useSearchParams } from "react-router";
import { toast } from "sonner";
import { useCloneChat } from "@/api/chat/queries/useCloneChat";
import { useGetConversation } from "@/api/chat/queries/useGetConversation";
import { useRemoteConfig } from "@/api/config/queries/useRemoteConfig";
import { useConversationShares } from "@/api/sharing/useConversationShares";
import MessageInput from "@/components/chat/MessageInput";
import MultiResponseMessages from "@/components/chat/messages/MultiResponseMessages";
import ResponseMessage from "@/components/chat/messages/ResponseMessage";
import UserMessage from "@/components/chat/messages/UserMessage";
import Navbar from "@/components/chat/Navbar";
import LoadingScreen from "@/components/common/LoadingScreen";
import Spinner from "@/components/common/Spinner";
import { Button } from "@/components/ui/button";
import { useScrollHandler } from "@/hooks/useScrollHandler";
import { analyzeSiblings, cn, combineMessages, MessageStatus } from "@/lib";
import { unwrapMockResponseID } from "@/lib/utils/mock";
import { useChatStore } from "@/stores/useChatStore";
import { useConversationStore } from "@/stores/useConversationStore";
import { useViewStore } from "@/stores/useViewStore";
import { type ContentItem, type FileContentItem, generateContentFileDataForOpenAI } from "@/types/openai";
import { MOCK_MESSAGE_RESPONSE_ID_PREFIX, USER_MESSAGE_CLASSNAME } from "@/lib/constants";
import type { ChatStartStreamOptions } from "@/types";

const NEW_CHAT_KEY = "new";

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
  const prevDataLengthRef = useRef<number>(0);
  const remoteConfig = useRemoteConfig();

  // Get permission info for shared conversations
  const { data: sharesData } = useConversationShares(chatId);
  const canWrite = sharesData?.can_write ?? true; // Default to true (owner) if not loaded yet

  // Show author names when conversation has multiple users:
  // - You're not the owner (it's been shared with you), OR
  // - You're the owner but have shared it with others
  const isSharedConversation = !sharesData?.is_owner || (sharesData?.shares?.length ?? 0) > 0;

  // Use the clone hook which invalidates conversation list queries
  const cloneChat = useCloneChat();

  const { models, selectedModels, setSelectedModels } = useChatStore();
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
  } = useGetConversation(
    conversationIsReady && !currentStreamIsActive ? chatId : undefined,
    {
      polling: !currentStreamIsActive,
    },
  );

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
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const { handleScroll, scrollToBottom } = useScrollHandler(scrollContainerRef, conversationState ?? undefined, chatId);
  const handleSendMessage = useCallback(
    async (content: string, files: FileContentItem[], webSearchEnabled = false, previous_response_id?: string) => {
      const contentItems: ContentItem[] = [
        { type: "input_text", text: content },
        ...files.map(generateContentFileDataForOpenAI),
      ];
      let prevRespId = previous_response_id;
      if (!prevRespId) {
        const msgs = scrollContainerRef.current?.getElementsByClassName(USER_MESSAGE_CLASSNAME);
        const lastMsg = msgs?.item(msgs.length - 1) as HTMLElement | null;
        if (lastMsg) {
          prevRespId = lastMsg.getAttribute("data-response-id") || undefined;
          if (prevRespId?.startsWith(MOCK_MESSAGE_RESPONSE_ID_PREFIX)) {
            prevRespId = unwrapMockResponseID(prevRespId);
          }
        }
      }

      await startStream({
        contentItems,
        webSearchEnabled,
        conversationId: chatId,
        previousResponseId: prevRespId,
        initiator: "new_message",
      });
      scrollToBottom();
    },
    [chatId, scrollToBottom, startStream]
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
    const isNewChat = searchParams.has(NEW_CHAT_KEY);
    if (conversationState?.conversationId !== chatId) {
      dataInitializedRef.current = false;
    }
    
    if (dataInitializedRef.current) return;
    if (isConversationsLoading || currentStreamIsActive) return;
    if (!conversationIsReady) return;
    if (!conversationData.data?.length) return;
    
    const aiMsg = conversationData.data.filter((item) => item.type === 'message' && item.role === 'assistant');
    if (isNewChat) {
      if (aiMsg.length) {
        setConversationData(conversationData);
        setSearchParams((prev) => {
          prev.delete(NEW_CHAT_KEY);
          return prev;
        });
      }
    } else {
      setConversationData(conversationData);
    }

    if (aiMsg.length) {
      dataInitializedRef.current = true;
    }
    setModelsInitialized(false);
  }, [
    chatId,
    searchParams,
    conversationState?.conversationId,
    isConversationsLoading,
    currentStreamIsActive,
    conversationIsReady,
    conversationData,
    setConversationData,
    setSearchParams
  ]);

  const isMessageCompleted = useMemo(() => {
    const last = conversationData?.data?.at(-1);
    return !last || last.role !== "assistant" || last.status === "completed" || last.status === "failed";
  }, [conversationData?.data]);

  const currentMessages = useMemo(() => combineMessages(conversationData?.data ?? []), [conversationData?.data]);
  const history = conversationState?.history ?? { messages: {} };
  const allMessages = conversationState?.allMessages ?? {};
  const batches = conversationState?.batches ?? [];
  const renderedMessages = useMemo(() => {
    if (!batches.length) return [];

    return batches
      .filter((batch) => {
        const batchMessage = history.messages[batch];
        return !!batchMessage;
      })
      .map((batch, idx) => {
        const isLast = idx === currentMessages.length - 1;
        const batchMessage = history.messages[batch];
        if (!batchMessage) return null;
        if (batchMessage.status === MessageStatus.INPUT && batchMessage.userPromptId !== null) {
          const { inputSiblings } = analyzeSiblings(batch, history, allMessages);
          return (
            <UserMessage
              key={batchMessage.userPromptId}
              history={history}
              allMessages={allMessages}
              batchId={batch}
              readOnly={!canWrite}
              regenerateResponse={startStream}
              siblings={inputSiblings.length > 1 ? inputSiblings : undefined}
              isSharedConversation={isSharedConversation}
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

        // Analyze siblings to determine if they're input variants or response variants
        const { inputSiblings, responseSiblings } = analyzeSiblings(batch, history, allMessages);

        if (batchMessage.userPromptId) {
          messages.push(
            <UserMessage
              key={batchMessage.userPromptId}
              history={history}
              allMessages={allMessages}
              batchId={batch}
              readOnly={!canWrite}
              regenerateResponse={startStream}
              siblings={inputSiblings.length > 1 ? inputSiblings : undefined}
              isSharedConversation={isSharedConversation}
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
              readOnly={!canWrite}
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
              readOnly={!canWrite}
              regenerateResponse={startStream}
              siblings={[]}
            />
          );
        }
        return messages;
      });
  }, [batches, history, allMessages, isSharedConversation, canWrite, currentMessages.length, startStream]);

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

  const renderCopyConversationButton = () => {
    if (!sharesData || sharesData.is_owner) return null;
    return (
      <div className="w-full rounded-b-xl border-border border-t bg-muted/30 p-2 sm:p-3 md:px-6">
        <div className="flex flex-col items-center gap-1 sm:flex-row sm:justify-between sm:gap-3">
          <div className="flex flex-col text-center sm:gap-1 sm:text-left">
            <p className="font-medium text-sm">Want to continue this conversation?</p>
            <p className="text-muted-foreground text-xs">
              Copy this conversation to your account and continue where it left off
            </p>
          </div>
          <Button size="small"
            onClick={handleCopyAndContinue}
            disabled={cloneChat.isPending}
            className="px-4!"
          >
            {cloneChat.isPending ? (
              <Spinner className="size-4" />
            ) : (
              <DocumentDuplicateIcon className="mr-1 size-4" />
            )}
            Copy & Continue
          </Button>
        </div>
      </div>
    );
  };

  useEffect(() => {
    if (!chatId) return;

    const NEW_CHAT_KEY = "new";
    const isNewChat = searchParams.has(NEW_CHAT_KEY);
    if (isNewChat) {
      setModelsInitialized(true);
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
  ]);

  // Show error UI if there's an error loading the conversation
  if (errorInfo && chatId) {
    const ErrorIcon = errorInfo.icon;
    return (
      <div className="flex h-full flex-col" id="chat-container">
        <Navbar />
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

  const isLoading = !conversationIsReady;
  return (
    <div className="flex h-full flex-col" id="chat-container">
      <Navbar />

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
          />
          <p className="px-4 pb-4 text-muted-foreground text-xs">
            {t("AI can make mistakes. Verify information before relying on it.")}
          </p>
          {renderCopyConversationButton()}
        </div>
      ) : renderCopyConversationButton()}
    </div>
  );
};

export default Home;
