import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useParams } from "react-router";
import { useGetConversation } from "@/api/chat/queries/useGetConversation";
import { DEFAULT_MODEL } from "@/api/constants";
import MessageInput from "@/components/chat/MessageInput";
import MultiResponseMessages from "@/components/chat/messages/MultiResponseMessages";
import ResponseMessage from "@/components/chat/messages/ResponseMessage";
import UserMessage from "@/components/chat/messages/UserMessage";
import Navbar from "@/components/chat/Navbar";
import LoadingScreen from "@/components/common/LoadingScreen";
import { useScrollHandler } from "@/hooks/useScrollHandler";
import { cn, combineMessages, MessageStatus } from "@/lib";
import { LOCAL_STORAGE_KEYS } from "@/lib/constants";
import { useChatStore } from "@/stores/useChatStore";
import { useConversationStore } from "@/stores/useConversationStore";
import { useViewStore } from "@/stores/useViewStore";
import type { ConversationUserInput } from "@/types";
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
  const [inputValue, setInputValue] = useState("");
  const modelInitializedRef = useRef(false);

  const { models, selectedModels, setSelectedModels } = useChatStore();
  const selectedModelsRef = useRef(selectedModels);
  selectedModelsRef.current = selectedModels;
  const modelsRef = useRef(models);
  modelsRef.current = models;

  const { isLoading: isConversationsLoading, data: conversationData } = useGetConversation(chatId);
  const setConversationData = useConversationStore((state) => state.setConversationData);
  const conversationState = useConversationStore((state) => state.conversation);

  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const { handleScroll, scrollToBottom } = useScrollHandler(scrollContainerRef, conversationState ?? undefined, chatId);

  const handleSendMessage = useCallback(
    async (content: string, files: FileContentItem[], webSearchEnabled = false, previous_response_id?: string) => {
      const contentItems: ContentItem[] = [
        { type: "input_text", text: content },
        ...files.map(generateContentFileDataForOpenAI),
      ];

      scrollToBottom();
      await startStream(contentItems, webSearchEnabled, chatId, previous_response_id);
    },
    [chatId, scrollToBottom, startStream]
  );

  const handleEditMessage = useCallback((id: string, c: string) => console.log("Edit:", id, c), []);
  const handleDeleteMessage = useCallback((id: string) => console.log("Delete:", id), []);

  // Load welcome prompt (one-time)
  useEffect(() => {
    const welcome = localStorage.getItem(LOCAL_STORAGE_KEYS.WELCOME_PAGE_PROMPT);
    if (welcome) {
      setInputValue(welcome);
      localStorage.removeItem(LOCAL_STORAGE_KEYS.WELCOME_PAGE_PROMPT);
    }
  }, []);

  // Reset model initialization when switching conversations
  useEffect(() => {
    if (!chatId) return;
    modelInitializedRef.current = false;
  }, [chatId]);

  useEffect(() => {
    if (!chatId || !conversationData) return;
    if (conversationState?.conversationId !== chatId) setConversationData(conversationData);
  }, [chatId, conversationData, setConversationData, conversationState?.conversationId]);

  // Sync selected model with latest conversation
  useEffect(() => {
    if (!conversationData?.id || modelInitializedRef.current) return;

    if (!selectedModelsRef.current.length) {
      const lastMsg = conversationData.data.at(-1);
      const newModels = [...selectedModelsRef.current];
      const defaultModel = modelsRef.current.find((model) => model.modelId === DEFAULT_MODEL);
      let msgModel = lastMsg?.model;
      if (msgModel) {
        const findModel = modelsRef.current.find((m) => m.modelId.includes(msgModel!));
        msgModel = findModel ? findModel.modelId : defaultModel?.modelId;
      } else {
        msgModel = defaultModel?.modelId;
      }

      newModels[0] = msgModel ?? newModels[0] ?? "";
      setSelectedModels(newModels);
      console.log("sssss", newModels);
    }

    modelInitializedRef.current = true;
  }, [conversationData?.id, setSelectedModels]);

  const isMessageCompleted = useMemo(() => {
    const last = conversationData?.data?.at(-1);
    return !last || last.role !== "assistant" || last.status === "completed";
  }, [conversationData]);

  const currentMessages = useMemo(() => combineMessages(conversationData?.data ?? []), [conversationData?.data]);

  const history = conversationState?.history ?? { messages: {} };
  const allMessages = conversationState?.allMessages ?? {};
  const batches = conversationState?.batches ?? [];
  const renderedMessages = useMemo(() => {
    if (!batches.length) return [];

    return batches.map((batch, idx) => {
      const isLast = idx === currentMessages.length - 1;
      const batchMessage = history.messages[batch];

      // if (batchMessage.status === MessageStatus.CREATED || !batchMessage) {
      //   return null;
      // }
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
            regenerateResponse={startStream}
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
            regenerateResponse={startStream}
            showPreviousMessage={() => console.log("prev")}
            showNextMessage={() => console.log("next")}
            siblings={[]}
          />
        );
      }
      return messages;
    });
  }, [batches, history, allMessages, currentMessages.length, handleDeleteMessage, handleEditMessage]);

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
