import { useQueryClient } from "@tanstack/react-query";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useParams } from "react-router";
import { useGetConversation } from "@/api/chat/queries/useGetConversation";
import { queryKeys } from "@/api/query-keys";
import MessageInput from "@/components/chat/MessageInput";
import MultiResponseMessages from "@/components/chat/messages/MultiResponseMessages";
import ResponseMessage from "@/components/chat/messages/ResponseMessage";
import UserMessage from "@/components/chat/messages/UserMessage";
import Navbar from "@/components/chat/Navbar";
import LoadingScreen from "@/components/common/LoadingScreen";
import { useScrollHandler } from "@/hooks/useScrollHandler";
import { cn, combineMessages, combineMessagesById, extractBatchFromHistory, MessageStatus } from "@/lib";
import { LOCAL_STORAGE_KEYS } from "@/lib/constants";
import { useChatStore } from "@/stores/useChatStore";
import { useViewStore } from "@/stores/useViewStore";
import type { Conversation, ConversationUserInput } from "@/types";
import { ConversationRoles } from "@/types";
import { type ContentItem, type FileContentItem, generateContentFileDataForOpenAI } from "@/types/openai";

const Home = ({
  startStream,
}: {
  startStream: (
    content: ContentItem[],
    webSearchEnabled: boolean,
    conversationId?: string,
    previous_response_id?: string
  ) => Promise<void>;
}) => {
  const { chatId } = useParams<{ chatId: string }>();
  const isLeftSidebarOpen = useViewStore((state) => state.isLeftSidebarOpen);
  const queryClient = useQueryClient();

  const [inputValue, setInputValue] = useState("");
  const [modelInitialized, setModelInitialized] = useState(false);
  const [currentMessageId] = useState<string | null>(null);
  const { selectedModels, setSelectedModels } = useChatStore();
  const selectedModelsRef = useRef(selectedModels);

  selectedModelsRef.current = selectedModels;

  const { isLoading: isConversationsLoading, data: conversationData } = useGetConversation(chatId);

  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const { handleScroll, scrollToBottom } = useScrollHandler(scrollContainerRef, conversationData, chatId);

  const handleSendMessage = useCallback(
    async (content: string, files: FileContentItem[], webSearchEnabled = false, previous_response_id?: string) => {
      const contentItems: ContentItem[] = [
        { type: "input_text", text: content },
        ...files.map(generateContentFileDataForOpenAI),
      ];

      // Optimistic update
      queryClient.setQueryData(queryKeys.conversation.byId(chatId), (old: Conversation) => ({
        ...old,
        data: [
          ...(old.data ?? []),
          {
            id: `temp-${Date.now()}`,
            response_id: `response-${Date.now()}`,
            next_response_ids: [],
            created_at: Date.now(),
            status: "pending",
            role: ConversationRoles.USER,
            type: "message",
            content: contentItems,
            model: selectedModels[0] ?? "",
          },
        ],
      }));

      scrollToBottom();
      startStream(contentItems, webSearchEnabled, chatId, previous_response_id);
    },
    [chatId, queryClient, scrollToBottom, startStream, selectedModels]
  );

  /* simple stubs */
  const handleEditMessage = useCallback((id: string, c: string) => console.log("Edit:", id, c), []);
  const handleDeleteMessage = useCallback((id: string) => console.log("Delete:", id), []);
  // const handleSaveMessage = useCallback((id: string, c: string) => console.log("Save:", id, c), []);
  // const handleRegenerateResponse = useCallback(async (m: ConversationModelOutput) => console.log("Regen:", m), []);
  // const handleShowPrev = useCallback((b: string) => console.log("Prev:", b), []);
  // const handleShowNext = useCallback((b: string) => console.log("Next:", b), []);

  // Load welcome prompt (one-time)
  useEffect(() => {
    const welcome = localStorage.getItem(LOCAL_STORAGE_KEYS.WELCOME_PAGE_PROMPT);
    if (welcome) {
      setInputValue(welcome);
      localStorage.removeItem(LOCAL_STORAGE_KEYS.WELCOME_PAGE_PROMPT);
    }
  }, []);

  // Reset model initialization when switching conversations
  useEffect(() => setModelInitialized(false), [conversationData?.id]);

  // Sync selected model with latest conversation
  useEffect(() => {
    if (!conversationData?.data || modelInitialized) return;

    const lastMsg = conversationData.data.at(-1);
    const newModels = [...selectedModelsRef.current];
    newModels[0] = lastMsg?.model ?? newModels[0] ?? "";

    setSelectedModels(newModels);
    setModelInitialized(true);
  }, [conversationData?.data, modelInitialized, setSelectedModels]);

  const isMessageCompleted = useMemo(() => {
    const last = conversationData?.data?.at(-1);
    return !last || last.role !== "assistant" || last.status === "completed";
  }, [conversationData]);

  const currentMessages = useMemo(() => combineMessages(conversationData?.data ?? []), [conversationData?.data]);

  // get initial current id as the deepest node
  const { history, allMessages, currentId } = useMemo(() => {
    console.log("combineMessagesById", conversationData?.data, Date.now());
    return combineMessagesById(conversationData?.data ?? []);
  }, [conversationData?.data]);

  const batches = useMemo(() => {
    console.log("extractBatchFromHistory", history, currentId ?? currentMessageId, Date.now());
    return extractBatchFromHistory(history, currentId ?? currentMessageId);
  }, [history, currentId, currentMessageId]);

  const renderedMessages = useMemo(() => {
    return batches.map((batch, idx) => {
      const isLast = idx === currentMessages.length - 1;
      const batchMessage = history.messages[batch];

      if (batchMessage.status === MessageStatus.CREATED || !batchMessage) {
        return null;
      }
      if (batchMessage.status === MessageStatus.INPUT && batchMessage.userPromptId !== null) {
        return (
          <UserMessage
            key={batchMessage.userPromptId}
            message={allMessages[batchMessage.userPromptId] as ConversationUserInput}
            isFirstMessage={idx === 0}
            readOnly={false}
            editMessage={handleEditMessage}
            deleteMessage={handleDeleteMessage}
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
            message={allMessages[batchMessage.userPromptId] as ConversationUserInput}
            isFirstMessage={idx === 0}
            readOnly={false}
            editMessage={handleEditMessage}
            deleteMessage={handleDeleteMessage}
          />
        );
      }

      if (batchMessage.parentResponseId && history.messages[batchMessage.parentResponseId].nextResponseIds.length > 1) {
        messages.push(
          <MultiResponseMessages
            key={batchMessage.parentResponseId}
            history={history}
            allMessages={allMessages}
            batchId={batch}
            currentBatchBundle={batches}
            isLastMessage={isLast}
            readOnly={false}
            regenerateResponse={() => console.log("regen")}
            showPreviousMessage={() => console.log("prev")}
            showNextMessage={() => console.log("next")}
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
            regenerateResponse={() => console.log("regen")}
            showPreviousMessage={() => console.log("prev")}
            showNextMessage={() => console.log("next")}
            siblings={[]}
          />
        );
      }
      return messages;
    });
  }, [batches, history, allMessages, currentMessages.length, handleDeleteMessage, handleEditMessage]);

  console.log("h", history, allMessages, batches, renderedMessages);
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

      <MessageInput
        onSubmit={handleSendMessage}
        prompt={inputValue}
        setPrompt={setInputValue}
        selectedModels={selectedModels}
        isMessageCompleted={isMessageCompleted}
      />
    </div>
  );
};

export default Home;
