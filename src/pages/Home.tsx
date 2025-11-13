import { useQueryClient } from "@tanstack/react-query";
import type { Message as MessageOpenAI } from "openai/resources/conversations/conversations";
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
import type { Conversation } from "@/types";
import { type ContentItem, type FileContentItem, generateContentFileDataForOpenAI } from "@/types/openai";

const Home = ({
  startStream,
}: {
  startStream: (content: ContentItem[], webSearchEnabled: boolean, conversationId?: string) => Promise<void>;
}) => {
  const { chatId } = useParams<{ chatId: string }>();

  const queryClient = useQueryClient();
  const [inputValue, setInputValue] = useState("");
  const { selectedModels } = useChatStore();

  const { isLoading: isConversationsLoading, data: conversationData } = useGetConversation(chatId);

  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const { handleScroll, scrollToBottom } = useScrollHandler(scrollContainerRef, conversationData, chatId);
  console.log("conversationData", conversationData);
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
            id: "empty",
            role: "user",
            type: "message",
            content: contentItems,
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

  const handleRegenerateResponse = async (message: MessageOpenAI) => {
    console.log("Regenerate response", message);
  };

  const handleShowPreviousMessage = (message: MessageOpenAI) => {
    console.log("Show previous message", message);
  };

  const handleShowNextMessage = (message: MessageOpenAI) => {
    console.log("Show next message", message);
  };

  useEffect(() => {
    const welcomePagePrompt = localStorage.getItem(LOCAL_STORAGE_KEYS.WELCOME_PAGE_PROMPT);
    if (welcomePagePrompt) {
      setInputValue(welcomePagePrompt);
      localStorage.removeItem(LOCAL_STORAGE_KEYS.WELCOME_PAGE_PROMPT);
    }
  }, []);

  const currentMessages = [...(conversationData?.data ?? [])];

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
          if (
            (message.type === "reasoning" || message.type === "web_search_call") &&
            conversationData?.last_id === message.id
          ) {
            return (
              <MessageSkeleton
                key={message.id}
                message={message.type === "reasoning" ? "Reasoning..." : "Web search in progress..."}
              />
            );
          }
          if (message.type !== "message") return null;

          if (message.type === "message" && message.role === "user") {
            return (
              <UserMessage
                message={message}
                isFirstMessage={idx === 0}
                readOnly={false}
                editMessage={handleEditMessage}
                deleteMessage={handleDeleteMessage}
              />
            );
          } else if (message.content.join("") === "") {
            return <MessageSkeleton key={message.content.join("")} />;
          } else if (message.type === "message" && message.role === "assistant") {
            return (
              <ResponseMessage
                message={message}
                siblings={[]}
                isLastMessage={idx === currentMessages.length - 1}
                readOnly={false}
                webSearchEnabled={false}
                saveMessage={handleSaveMessage}
                deleteMessage={handleDeleteMessage}
                regenerateResponse={handleRegenerateResponse}
                showPreviousMessage={handleShowPreviousMessage}
                showNextMessage={handleShowNextMessage}
              />
            );
          } else {
            return null;
          }
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
