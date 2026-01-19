import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useParams, useSearchParams } from "react-router";
import { useGetConversation } from "@/api/chat/queries/useGetConversation";

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
import { useViewStore } from "@/stores/useViewStore";

import { type ContentItem, type FileContentItem, generateContentFileDataForOpenAI } from "@/types/openai";
import { MOCK_MESSAGE_RESPONSE_ID_PREFIX, USER_MESSAGE_CLASSNAME } from "@/lib/constants";
import { unwrapMockResponseID } from "@/lib/utils/mock";
import { useRemoteConfig } from "@/api/config/queries/useRemoteConfig";
import type { ChatStartStreamOptions } from "@/types";
import { useTranslation } from "react-i18next";

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
  const isLeftSidebarOpen = useViewStore((state) => state.isLeftSidebarOpen);
  const [inputValue, setInputValue] = useState("");
  const [modelsInitialized, setModelsInitialized] = useState(false);
  const dataInitializedRef = useRef<boolean>(false);
  const remoteConfig = useRemoteConfig();

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

  const { isLoading: isConversationsLoading, data: conversationData } = useGetConversation(conversationIsReady ? chatId : undefined);
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
        previous_response_id: prevRespId,
        initiator: "new_message",
      });
      scrollToBottom();
    },
    [chatId, scrollToBottom, startStream]
  );

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
    if (conversationData.data.length > 2) {
      dataInitializedRef.current = true;
    }
    setModelsInitialized(false);
  }, [
    chatId,
    conversationState?.conversationId,
    isConversationsLoading,
    currentStreamIsActive,
    conversationIsReady,
    conversationData,
    setConversationData,
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
  
    return batches.filter((batch) => {
      const batchMessage = history.messages[batch];
      return !!batchMessage;
    }).map((batch, idx) => {
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
          {t('AI can make mistakes. Verify information before relying on it.')}
        </p>
      </div>
    </div>
  );
};

export default Home;