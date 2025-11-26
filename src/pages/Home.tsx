import { useQueryClient } from "@tanstack/react-query";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useParams } from "react-router";
import { useGetConversation } from "@/api/chat/queries/useGetConversation";
import { queryKeys } from "@/api/query-keys";
import MessageInput from "@/components/chat/MessageInput";
import MessageSkeleton from "@/components/chat/MessageSkeleton";
import ResponseMessage from "@/components/chat/messages/ResponseMessage";
import UserMessage from "@/components/chat/messages/UserMessage";
import Navbar from "@/components/chat/Navbar";
import LoadingScreen from "@/components/common/LoadingScreen";
import { useScrollHandler } from "@/hooks/useScrollHandler";
import { cn, combineMessages, MessageStatus } from "@/lib";
import { LOCAL_STORAGE_KEYS } from "@/lib/constants";
import { useChatStore } from "@/stores/useChatStore";
import { useViewStore } from "@/stores/useViewStore";

import type { Conversation, ConversationModelOutput } from "@/types";

import { ConversationRoles } from "@/types";
import { type ContentItem, type FileContentItem, generateContentFileDataForOpenAI } from "@/types/openai";

const Home = ({
  startStream,
}: {
  startStream: (content: ContentItem[], webSearchEnabled: boolean, conversationId?: string) => Promise<void>;
}) => {
  const { chatId } = useParams<{ chatId: string }>();
  const isLeftSidebarOpen = useViewStore((state) => state.isLeftSidebarOpen);
  const queryClient = useQueryClient();

  const [inputValue, setInputValue] = useState("");
  const [modelInitialized, setModelInitialized] = useState(false);

  const { selectedModels, setSelectedModels } = useChatStore();
  const selectedModelsRef = useRef(selectedModels);

  selectedModelsRef.current = selectedModels;

  const { isLoading: isConversationsLoading, data: conversationData } = useGetConversation(chatId);

  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const { handleScroll, scrollToBottom } = useScrollHandler(scrollContainerRef, conversationData, chatId);

  const handleSendMessage = useCallback(
    async (content: string, files: FileContentItem[], webSearchEnabled = false) => {
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
      startStream(contentItems, webSearchEnabled, chatId);
    },
    [chatId, queryClient, scrollToBottom, startStream, selectedModels]
  );

  /* simple stubs */
  const handleEditMessage = useCallback((id: string, c: string) => console.log("Edit:", id, c), []);
  const handleSaveMessage = useCallback((id: string, c: string) => console.log("Save:", id, c), []);
  const handleDeleteMessage = useCallback((id: string) => console.log("Delete:", id), []);
  const handleRegenerateResponse = useCallback(async (m: ConversationModelOutput) => console.log("Regen:", m), []);
  const handleShowPrev = useCallback((m: ConversationModelOutput) => console.log("Prev:", m), []);
  const handleShowNext = useCallback((m: ConversationModelOutput) => console.log("Next:", m), []);

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
  console.log(currentMessages, conversationData?.data);
  return (
    <div className="flex h-full flex-col" id="chat-container">
      <Navbar />

      {isConversationsLoading && <LoadingScreen />}

      <div
        ref={scrollContainerRef}
        onScroll={handleScroll}
        className={cn("flex-1 space-y-4 overflow-y-auto px-4 py-4 pt-8 transition-opacity delay-200 duration-500", {
          "pl-12.5": !isLeftSidebarOpen,
          "hidden opacity-0": isConversationsLoading,
        })}
      >
        {currentMessages.map((msg, idx) => {
          const isLast = idx === currentMessages.length - 1;

          if (msg.type === "message" && msg.role === "user") {
            return (
              <UserMessage
                key={msg.id}
                message={msg}
                isFirstMessage={idx === 0}
                readOnly={false}
                editMessage={handleEditMessage}
                deleteMessage={handleDeleteMessage}
              />
            );
          }

          if (msg.type === "message" && msg.role === "assistant") {
            if (msg.currentStatus === MessageStatus.WEB_SEARCH) {
              const latest = msg.webSearchMessages.at(-1);
              const q = latest?.action?.query ? `Searching for: ${latest.action.query}` : "Performing web search";
              return <MessageSkeleton key={msg.id || `search-${idx}`} model={latest?.model} message={q} />;
            }

            if (msg.currentStatus === MessageStatus.OUTPUT && msg.contentMessages.length > 0) {
              const out = msg.contentMessages.at(-1);

              const isEmpty = !out || !out.content?.some((c) => c.type === "output_text" && c.text?.trim() !== "");

              if (isEmpty) {
                return (
                  <MessageSkeleton
                    key={out?.id || `output-${idx}`}
                    model={out?.model}
                    message="Generating response..."
                  />
                );
              }

              return (
                <ResponseMessage
                  key={msg.id || out.id}
                  message={out}
                  siblings={[]}
                  isLastMessage={isLast}
                  readOnly={false}
                  webSearchEnabled={msg.webSearchMessages.length > 0}
                  saveMessage={handleSaveMessage}
                  deleteMessage={handleDeleteMessage}
                  regenerateResponse={handleRegenerateResponse}
                  showPreviousMessage={handleShowPrev}
                  showNextMessage={handleShowNext}
                />
              );
            }

            return (
              <MessageSkeleton
                key={msg.id || `created-${idx}`}
                message={msg.currentStatus === MessageStatus.REASONING ? "Reasoning..." : "Starting..."}
              />
            );
          }

          return null;
        })}

        {currentMessages.length === 1 &&
          currentMessages[0].type === "message" &&
          currentMessages[0].role === "user" && (
            <MessageSkeleton
              key={currentMessages[0].id || `created-${0}`}
              model={currentMessages[0].model}
              message="Starting..."
            />
          )}
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
