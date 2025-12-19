import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useParams, useSearchParams } from "react-router";
import { useGetConversation } from "@/api/chat/queries/useGetConversation";
import { DEFAULT_MODEL } from "@/api/constants";

import MessageInput from "@/components/chat/MessageInput";
import MultiResponseMessages from "@/components/chat/messages/MultiResponseMessages";
import ResponseMessage from "@/components/chat/messages/ResponseMessage";
import UserMessage from "@/components/chat/messages/UserMessage";
import Navbar from "@/components/chat/Navbar";
import LoadingScreen from "@/components/common/LoadingScreen";
import { useScrollHandler } from "@/hooks/useScrollHandler";

import { analyzeSiblings, cn, combineMessages, MessageStatus } from "@/lib";
import { useChatStore } from "@/stores/useChatStore";
import { useConversationStore } from "@/stores/useConversationStore";
import { useMessagesSignaturesStore } from "@/stores/useMessagesSignaturesStore";
import { useViewStore } from "@/stores/useViewStore";

import { type ContentItem, type FileContentItem, generateContentFileDataForOpenAI } from "@/types/openai";
import { RESPONSE_MESSAGE_CLASSNAME } from "@/lib/constants";

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
  const [searchParams] = useSearchParams();
  const { chatId } = useParams<{ chatId: string }>();
  const isLeftSidebarOpen = useViewStore((state) => state.isLeftSidebarOpen);
  const [inputValue, setInputValue] = useState("");
  const modelInitializedRef = useRef<boolean>(false);

  const { models, selectedModels, setSelectedModels } = useChatStore();
  const selectedModelsRef = useRef(selectedModels);
  selectedModelsRef.current = selectedModels;
  const modelsRef = useRef(models);
  modelsRef.current = models;

  const { isLoading: isConversationsLoading, data: conversationData } = useGetConversation(chatId);
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

      let prevRespId = previous_response_id
      if (!prevRespId) {
        const msgs = scrollContainerRef.current?.getElementsByClassName(RESPONSE_MESSAGE_CLASSNAME);
        const lastMsg = msgs?.item(msgs.length - 1) as HTMLElement | null;
        if (lastMsg) {
          prevRespId = lastMsg.getAttribute('data-response-id') || undefined;
        }
      }
      await startStream(contentItems, webSearchEnabled, chatId, prevRespId);
      scrollToBottom();
    },
    [chatId, scrollToBottom, startStream]
  );

  useEffect(() => {
    if (!chatId) return;
    modelInitializedRef.current = false;
  }, [chatId]);

  useEffect(() => {
    if (!chatId || !conversationData) return;
    if (conversationState?.conversationId !== chatId) {
      clearAllSignatures();
      setConversationData(conversationData);
    }
  }, [chatId, clearAllSignatures, conversationData, setConversationData, conversationState?.conversationId]);

  // Sync selected model with latest conversation
  useEffect(() => {
    if (!conversationData?.id) return;
    if (modelInitializedRef.current) return;
    const isNewChat = searchParams.has("new");
    if (isNewChat) {
      modelInitializedRef.current = true;
      return;
    }

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
    modelInitializedRef.current = true;
  }, [conversationData?.id, searchParams, setSelectedModels]);

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

    return batches.map((batch, idx) => {
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
  }, [batches, history, allMessages, currentMessages.length, startStream]);

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
