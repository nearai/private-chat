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
import { MOCK_MESSAGE_RESPONSE_ID_PREFIX, RESPONSE_MESSAGE_CLASSNAME } from "@/lib/constants";
import { unwrapMockResponseID } from "@/lib/utils/mock";
import { useChatStore } from "@/stores/useChatStore";
import { useConversationStore } from "@/stores/useConversationStore";
import { useMessagesSignaturesStore } from "@/stores/useMessagesSignaturesStore";
import { useStreamStore } from "@/stores/useStreamStore";
import { useViewStore } from "@/stores/useViewStore";
import { type ContentItem, type FileContentItem, generateContentFileDataForOpenAI } from "@/types/openai";

const Home = ({
  startStream,
  stopStream,
}: {
  startStream: (
    content: ContentItem[],
    webSearchEnabled: boolean,
    conversationId?: string,
    previous_response_id?: string
  ) => Promise<void>;
  stopStream?: () => void;
}) => {
  const { t } = useTranslation("translation", { useSuspense: false });
  const [searchParams, setSearchParams] = useSearchParams();
  const { chatId } = useParams<{ chatId: string }>();
  const navigate = useNavigate();
  const isLeftSidebarOpen = useViewStore((state) => state.isLeftSidebarOpen);
  const [inputValue, setInputValue] = useState("");
  const modelInitializedRef = useRef<boolean>(false);
  const dataInitializedRef = useRef<boolean>(false);
  const remoteConfig = useRemoteConfig();

  // Get permission info for shared conversations
  const { data: sharesData } = useConversationShares(chatId);
  const canWrite = sharesData?.can_write ?? true; // Default to true (owner) if not loaded yet

  // Conversation is shared if it has any shares (regardless of owner status)
  // Only show author names in shared conversations
  const isSharedConversation = (sharesData?.shares?.length ?? 0) > 0;

  // Use the clone hook which invalidates conversation list queries
  const cloneChat = useCloneChat();

  const { models, selectedModels, setSelectedModels } = useChatStore();
  const activeStreams = useStreamStore((state) => state.activeStreams);
  const selectedModelsRef = useRef(selectedModels);
  selectedModelsRef.current = selectedModels;
  const modelsRef = useRef(models);
  modelsRef.current = models;

  const currentStreamIsActive = useMemo(() => {
    if (!chatId) return false;
    return activeStreams.has(chatId);
  }, [chatId, activeStreams]);

  // Enable polling for real-time sync, but disable while streaming to avoid conflicts
  const {
    isLoading: isConversationsLoading,
    data: conversationData,
    error: conversationError,
  } = useGetConversation(chatId, {
    polling: !currentStreamIsActive,
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
  const conversationState = useConversationStore((state) => state.conversation);
  const { clearAllSignatures } = useMessagesSignaturesStore();
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
        const msgs = scrollContainerRef.current?.getElementsByClassName(RESPONSE_MESSAGE_CLASSNAME);
        const lastMsg = msgs?.item(msgs.length - 1) as HTMLElement | null;
        if (lastMsg) {
          prevRespId = lastMsg.getAttribute("data-response-id") || undefined;
          if (prevRespId?.startsWith(MOCK_MESSAGE_RESPONSE_ID_PREFIX)) {
            prevRespId = unwrapMockResponseID(prevRespId);
          }
        }
      }
      await startStream(contentItems, webSearchEnabled, chatId, prevRespId);
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
    if (!chatId) return;
    modelInitializedRef.current = false;
  }, [chatId]);

  useEffect(() => {
    if (!chatId || !conversationData) return;
    if (conversationState?.conversationId !== chatId) {
      clearAllSignatures();
      dataInitializedRef.current = false;
    }
    if (dataInitializedRef.current) return;
    if (isConversationsLoading || currentStreamIsActive) return;
    if (!conversationData.data?.length) return;
    setConversationData(conversationData);
    dataInitializedRef.current = true;
  }, [
    chatId,
    isConversationsLoading,
    currentStreamIsActive,
    clearAllSignatures,
    conversationData,
    setConversationData,
    conversationState?.conversationId,
  ]);

  // Sync selected model with latest conversation
  const lastConversationMessage = conversationData?.data?.at(-1);

  useEffect(() => {
    if (!conversationData?.id) return;
    if (modelInitializedRef.current) return;
    const NEW_CHAT_KEY = "new";
    const isNewChat = searchParams.has(NEW_CHAT_KEY);
    if (isNewChat) {
      modelInitializedRef.current = true;
      setSearchParams((prev) => {
        prev.delete(NEW_CHAT_KEY);
        return prev;
      });
      return;
    }

    const lastMsg = lastConversationMessage;
    const newModels = [...selectedModelsRef.current];
    const defaultModel = modelsRef.current.find((model) => model.modelId === remoteConfig.data?.default_model);
    let msgModel = lastMsg?.model;
    if (msgModel) {
      const findModel = modelsRef.current.find((m) => m.modelId.includes(msgModel!));
      msgModel = findModel ? findModel.modelId : defaultModel?.modelId;
    } else {
      msgModel = defaultModel?.modelId;
    }

    newModels[0] = msgModel ?? newModels[0] ?? "";
    setSelectedModels(newModels);
    modelInitializedRef.current = true;
  }, [
    conversationData?.id,
    lastConversationMessage,
    searchParams,
    remoteConfig.data?.default_model,
    setSelectedModels,
    setSearchParams,
  ]);

  const isMessageCompleted = useMemo(() => {
    const last = conversationData?.data?.at(-1);
    return !last || last.role !== "assistant" || last.status === "completed";
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
  }, [batches, history, allMessages, currentMessages.length, startStream, ownerName, currentUserId, currentUserName]);

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

  return (
    <div className="flex h-full flex-col" id="chat-container">
      <Navbar />

      {isConversationsLoading && <LoadingScreen />}

      <div
        ref={scrollContainerRef}
        id="messages-container"
        onScroll={handleScroll}
        className={cn("flex-1 space-y-4 overflow-y-auto px-4 py-4 pt-8 transition-opacity delay-200 duration-500", {
          "pl-12.5": !isLeftSidebarOpen,
          "hidden opacity-0": isConversationsLoading,
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
        </div>
      ) : (
        <div className="border-border border-t bg-muted/30 px-4 py-4">
          <div className="mx-auto max-w-3xl">
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
