import { useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";
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
import { LOCAL_STORAGE_KEYS } from "@/lib/constants";
import { useChatStore } from "@/stores/useChatStore";
import type { Conversation, ConversationModelOutput, ConversationUserInput, ConversationWebSearchCall } from "@/types";
import { ConversationRoles } from "@/types";
import { type ContentItem, type FileContentItem, generateContentFileDataForOpenAI } from "@/types/openai";

const Home = ({
  startStream,
}: {
  startStream: (content: ContentItem[], webSearchEnabled: boolean, conversationId?: string) => Promise<void>;
}) => {
  const { chatId } = useParams<{ chatId: string }>();

  const queryClient = useQueryClient();
  const [initModelSelectorFlag, setInitModelSelectorFlag] = useState(false);
  const [inputValue, setInputValue] = useState("");
  const { selectedModels, setSelectedModels } = useChatStore();

  const { isLoading: isConversationsLoading, data: conversationData } = useGetConversation(chatId);

  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const { handleScroll, scrollToBottom } = useScrollHandler(scrollContainerRef, conversationData, chatId);
  const handleSendMessage = async (content: string, files: FileContentItem[], webSearchEnabled: boolean = false) => {
    const contentItems: ContentItem[] = [
      { type: "input_text", text: content },
      ...files.map((file) => generateContentFileDataForOpenAI(file)),
    ];

    queryClient.setQueryData(queryKeys.conversation.byId(chatId), (old: Conversation) => {
      return {
        ...old,
        data: [
          ...(old.data ?? []),
          {
            id: `temp-${Date.now()}`,
            response_id: `response-${Date.now()}`,
            next_response_ids: [],
            created_at: Date.now(),
            status: "pending" as const,
            role: ConversationRoles.USER,
            type: "message" as const,
            content: contentItems,
            model: selectedModels[0] || "",
          },
        ],
      };
    });
    scrollToBottom();

    startStream(contentItems, webSearchEnabled, chatId);
  };

  const handleEditMessage = (messageId: string, content: string) => {
    console.log("Edit message:", messageId, content);
  };

  const handleSaveMessage = (messageId: string, content: string) => {
    console.log("Save message:", messageId, content);
  };

  const handleDeleteMessage = (messageId: string) => {
    console.log("Delete message:", messageId);
  };

  const handleRegenerateResponse = async (message: ConversationModelOutput) => {
    console.log("Regenerate response", message);
  };

  const handleShowPreviousMessage = (message: ConversationModelOutput) => {
    console.log("Show previous message", message);
  };

  const handleShowNextMessage = (message: ConversationModelOutput) => {
    console.log("Show next message", message);
  };

  useEffect(() => {
    const welcomePagePrompt = localStorage.getItem(LOCAL_STORAGE_KEYS.WELCOME_PAGE_PROMPT);
    if (welcomePagePrompt) {
      setInputValue(welcomePagePrompt);
      localStorage.removeItem(LOCAL_STORAGE_KEYS.WELCOME_PAGE_PROMPT);
    }
  }, []);

  useEffect(() => {
    setInitModelSelectorFlag(false);
  }, [conversationData?.id]);

  useEffect(() => {
    if (!conversationData?.data) return;
    if (initModelSelectorFlag) return;
    setInitModelSelectorFlag(true);

    const newModels = [...selectedModels];
    newModels[0] = conversationData.data[conversationData.data.length - 1]?.model || newModels[0] || "";
    setSelectedModels(newModels);
  }, [initModelSelectorFlag, conversationData?.data, selectedModels]);

  const MessageStatus = {
    CREATED: "created",
    REASONING: "reasoning",
    WEB_SEARCH: "web_search",
    OUTPUT: "output",
  } as const;

  type MessageStatusType = (typeof MessageStatus)[keyof typeof MessageStatus];

  type CombinedMessage =
    | ConversationUserInput
    | {
        type: "message";
        role: "assistant";
        contentMessages: ConversationModelOutput[];
        reasoningMessages: unknown[];
        webSearchMessages: ConversationWebSearchCall[];
        currentStatus: MessageStatusType;
        id?: string;
      };

  function combineMessages(
    messages: (ConversationUserInput | ConversationModelOutput | ConversationWebSearchCall)[]
  ): CombinedMessage[] {
    if (messages.length === 0) return [];
    const combinedMessages: CombinedMessage[] = [];
    for (const message of messages) {
      if (message.type === "message" && message.role === "user") {
        combinedMessages.push(message);
      } else {
        const lastMessage = combinedMessages[combinedMessages.length - 1];
        if (
          !lastMessage ||
          (lastMessage.type === "message" && lastMessage.role === "user") ||
          !("currentStatus" in lastMessage)
        ) {
          combinedMessages.push({
            type: "message",
            role: "assistant",
            contentMessages: [],
            reasoningMessages: [],
            webSearchMessages: [],
            currentStatus: MessageStatus.CREATED,
            id: message.id,
          });
        }
        const lastCombinedMessage = combinedMessages[combinedMessages.length - 1];
        if ("currentStatus" in lastCombinedMessage) {
          switch (message.type) {
            case "web_search_call":
              lastCombinedMessage.webSearchMessages.push(message);
              lastCombinedMessage.currentStatus = MessageStatus.WEB_SEARCH;
              lastCombinedMessage.id = message.id;
              break;
            case "message":
              if (message.role === "assistant") {
                lastCombinedMessage.contentMessages.push(message);
                lastCombinedMessage.currentStatus = MessageStatus.OUTPUT;
                lastCombinedMessage.id = message.id;
              }
              break;
            default:
              break;
          }
        }
      }
    }
    return combinedMessages;
  }

  const currentMessages = combineMessages(conversationData?.data ?? []);
  if (isConversationsLoading) {
    return <LoadingScreen />;
  }

  return (
    <div className="flex h-full flex-col bg-gray-900" id="chat-container">
      <Navbar />
      <div
        ref={scrollContainerRef}
        onScroll={handleScroll}
        className="flex-1 space-y-4 overflow-y-auto px-4 py-4 pt-8 transition-opacity delay-200 duration-500"
      >
        {currentMessages.map((message, idx) => {
          if (message.type === "message" && message.role === "user") {
            return (
              <UserMessage
                key={message.id}
                message={message}
                isFirstMessage={idx === 0}
                readOnly={false}
                editMessage={handleEditMessage}
                deleteMessage={handleDeleteMessage}
              />
            );
          }

          if (message.type === "message" && message.role === "assistant" && "currentStatus" in message) {
            const isLastMessage = idx === currentMessages.length - 1;

            if (message.currentStatus === MessageStatus.WEB_SEARCH) {
              const latestWebSearch = message.webSearchMessages[message.webSearchMessages.length - 1];
              const searchQuery =
                latestWebSearch.type === "web_search_call" && latestWebSearch.action.query
                  ? `Searching for: ${latestWebSearch.action.query}`
                  : "Performing web search";
              return (
                <MessageSkeleton
                  key={message.id || `web-search-${idx}`}
                  model={latestWebSearch.model}
                  message={searchQuery}
                />
              );
            }

            if (message.currentStatus === MessageStatus.REASONING) {
              const latestReasoning = message.reasoningMessages[message.reasoningMessages.length - 1];
              let reasoningText = "Reasoning...";
              if (
                latestReasoning &&
                typeof latestReasoning === "object" &&
                latestReasoning !== null &&
                "summary" in latestReasoning
              ) {
                const summary = (latestReasoning as { summary?: unknown }).summary;
                if (Array.isArray(summary)) {
                  reasoningText =
                    summary
                      .map((s) =>
                        typeof s === "string"
                          ? s
                          : typeof s === "object" && s !== null && "text" in s
                            ? String((s as { text?: string }).text)
                            : ""
                      )
                      .join(" ") || "Reasoning...";
                } else if (typeof summary === "string") {
                  reasoningText = summary;
                }
              }
              return <MessageSkeleton key={message.id || `reasoning-${idx}`} message={`Reasoning: ${reasoningText}`} />;
            }

            if (message.contentMessages.length > 0) {
              const outputMessage = message.contentMessages[message.contentMessages.length - 1];
              if (outputMessage && outputMessage.type === "message" && outputMessage.role === "assistant") {
                const isEmpty =
                  outputMessage.content.length === 0 ||
                  !outputMessage.content.some((c) => c.type === "output_text" && c.text !== "");
                if (isEmpty) {
                  return (
                    <MessageSkeleton
                      key={outputMessage.id || `output-${idx}`}
                      model={outputMessage.model}
                      message="Generating response..."
                    />
                  );
                } else {
                  return (
                    <ResponseMessage
                      key={message.id || outputMessage.id}
                      message={outputMessage}
                      siblings={[]}
                      isLastMessage={isLastMessage}
                      readOnly={false}
                      webSearchEnabled={message.webSearchMessages.length > 0}
                      saveMessage={handleSaveMessage}
                      deleteMessage={handleDeleteMessage}
                      regenerateResponse={handleRegenerateResponse}
                      showPreviousMessage={handleShowPreviousMessage}
                      showNextMessage={handleShowNextMessage}
                    />
                  );
                }
              }
            }

            if (message.currentStatus === MessageStatus.CREATED) {
              return <MessageSkeleton key={message.id || `created-${idx}`} message="Starting..." />;
            }

            return null;
          }

          return null;
        })}
      </div>

      <MessageInput
        onSubmit={handleSendMessage}
        prompt={inputValue}
        setPrompt={setInputValue}
        selectedModels={selectedModels}
      />
    </div>
  );
};

export default Home;
