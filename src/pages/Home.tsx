import Bolt from "@heroicons/react/24/outline/BoltIcon";
import { useQueryClient } from "@tanstack/react-query";
import Fuse from "fuse.js";
import type { Message as MessageOpenAI } from "openai/resources/conversations/conversations";
import type React from "react";
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router";

import { useConversation } from "@/api/chat/queries/useConversation";
import { useGetConversation } from "@/api/chat/queries/useGetConversation";
import { useResponse } from "@/api/chat/queries/useResponse";
import { queryKeys } from "@/api/query-keys";
import NearAIIcon from "@/assets/icons/near-icon-green.svg?react";
import type { Prompt } from "@/components/chat/ChatPlaceholder";
import MessageInput from "@/components/chat/MessageInput";
import MessageSkeleton from "@/components/chat/MessageSkeleton";
import ResponseMessage from "@/components/chat/messages/ResponseMessage";
import UserMessage from "@/components/chat/messages/UserMessage";
import Navbar from "@/components/chat/Navbar";
import LoadingScreen from "@/components/common/LoadingScreen";
import { LOCAL_STORAGE_KEYS } from "@/lib/constants";
import { allPrompts } from "@/pages/welcome/data";
import { useChatStore } from "@/stores/useChatStore";
import type { Conversation } from "@/types";
import { type FileContentItem, generateContentFileDataForOpenAI } from "@/types/openai";

const Home: React.FC = () => {
  const { chatId } = useParams<{ chatId: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [inputValue, setInputValue] = useState("");
  const { updateMessage, currentChat, selectedModels } = useChatStore();

  const { createConversation, updateConversation } = useConversation();

  const { isLoading: isConversationsLoading, data: conversationData } = useGetConversation(chatId);

  const scrollContainerRef = useRef<HTMLDivElement>(null);

  const { generateChatTitle, startStream } = useResponse();
  const [filteredPrompts, setFilteredPrompts] = useState<Prompt[]>([]);

  const sortedPrompts = useMemo(() => [...(allPrompts ?? [])].sort(() => Math.random() - 0.5), []);

  useEffect(() => {
    if (inputValue.length > 500) {
      setFilteredPrompts([]);
    } else {
      const fuse = new Fuse(sortedPrompts, {
        keys: ["content", "title"],
        threshold: 0.5,
      });

      const newFilteredPrompts =
        inputValue.trim() && fuse ? fuse.search(inputValue.trim()).map((result) => result.item) : sortedPrompts;

      setFilteredPrompts((prev) => {
        if (prev.length !== newFilteredPrompts.length) {
          return newFilteredPrompts;
        }

        const prevContents = prev.map((p) => p.content).join(",");
        const newContents = newFilteredPrompts.map((p) => p.content).join(",");
        if (prevContents !== newContents) {
          return newFilteredPrompts;
        }
        return prev;
      });
    }
  }, [inputValue, sortedPrompts]);

  const [autoScroll, setAutoScroll] = useState(true);

  const scrollToBottom = useCallback(() => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollTop = scrollContainerRef.current.scrollHeight;
    }
  }, []);

  const handleScroll = useCallback(() => {
    if (!scrollContainerRef.current) return;

    const { scrollHeight, scrollTop, clientHeight } = scrollContainerRef.current;
    const isAtBottom = scrollHeight - scrollTop <= clientHeight + 5;

    setAutoScroll(isAtBottom);
  }, []);

  const handleSendMessage = async (content: string, files: FileContentItem[], webSearchEnabled: boolean = false) => {
    const contentItems = [
      { type: "input_text", text: content },
      ...files.map((file) => generateContentFileDataForOpenAI(file)),
    ];

    const systemPrompt = localStorage.getItem(LOCAL_STORAGE_KEYS.SYSTEM_PROMPT) || undefined;

    if (!chatId) {
      const newConversation = await createConversation.mutateAsync(
        {
          items: [],
          metadata: {
            title: "Basic Conversation",
          },
        },
        {
          onSuccess: async (data) => {
            await navigate(`/c/${data.id}`);
            queryClient.setQueryData(["conversation", data.id], (old: Conversation) => {
              return {
                ...old,
                id: data.id,
                created_at: data.created_at,
                metadata: data.metadata,
                object: data.object,
                data: [
                  {
                    id: "empty", // TODO: update user prompt id  asap
                    role: "user",
                    type: "message",
                    content: contentItems,
                  },
                ],
              };
            });
            await generateChatTitle.mutateAsync(
              {
                prompt: content,
                model: "openai/gpt-oss-120b",
              },
              {
                onSuccess: async (data) => {
                  const responseItem = data.output.find((item) => item.type === "message");
                  const messageContent = responseItem?.content.find((item) => item.type === "output_text")?.text;
                  await updateConversation.mutateAsync({
                    conversationId: newConversation.id,
                    metadata: {
                      title: messageContent || "",
                    },
                  });
                  queryClient.invalidateQueries({
                    queryKey: queryKeys.conversation.all,
                  });
                },
              }
            );
            scrollToBottom();
            await startStream.mutateAsync({
              model: selectedModels[0],
              conversation: data.id,
              role: "user",
              systemPrompt,
              content: contentItems,
              queryClient: queryClient,
              tools: webSearchEnabled ? [{ type: "web_search" }] : [],
              include: webSearchEnabled ? ["web_search_call.action.sources"] : [],
            });
          },
        }
      );
    } else {
      queryClient.setQueryData(["conversation", chatId], (old: Conversation) => {
        return {
          ...old,
          data: [
            {
              id: "empty",
              role: "user",
              type: "message",
              content: contentItems,
            },
            ...(old.data ?? []),
          ],
        };
      });
      scrollToBottom();
      await startStream.mutateAsync({
        model: selectedModels[0],
        conversation: chatId,
        role: "user",
        content: contentItems,
        systemPrompt,
        queryClient: queryClient,
        tools: webSearchEnabled ? [{ type: "web_search" }] : [],
        include: webSearchEnabled ? ["web_search_call.action.sources"] : [],
      });
    }
  };

  const handleEditMessage = (messageId: string, content: string) => {
    console.log("Edit message:", messageId, content);
    updateMessage(messageId, { content });
  };

  const handleSaveMessage = (messageId: string, content: string) => {
    console.log("Save message:", messageId, content);
    updateMessage(messageId, { content });
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

  useLayoutEffect(() => {
    if (!chatId || !scrollContainerRef.current) return;

    const frameId = requestAnimationFrame(() => {
      scrollToBottom();
    });
    return () => cancelAnimationFrame(frameId);
  }, [chatId, scrollToBottom]);

  const currentMessages = [...(conversationData?.data ?? [])];

  useEffect(() => {
    if (!conversationData || !scrollContainerRef.current) return;

    requestAnimationFrame(() => {
      if (!scrollContainerRef.current) return;

      const { scrollHeight, scrollTop, clientHeight } = scrollContainerRef.current;
      const isAtBottom = scrollHeight - scrollTop <= clientHeight + 5;

      if (isAtBottom) {
        setAutoScroll(true);
        scrollToBottom();
      } else if (autoScroll) {
        scrollToBottom();
      }
    });
  }, [scrollToBottom, autoScroll, conversationData]);

  if (isConversationsLoading) {
    return <LoadingScreen />;
  }

  if (!chatId) {
    return (
      <div id="chat-container" className="relative flex h-full grow-1 flex-col bg-gray-900">
        <Navbar />
        <div className="flex h-full grow-1 flex-col items-center justify-center">
          <div className="flex w-full flex-col items-center justify-center">
            <div className="flex w-fit max-w-2xl flex-col items-center justify-center gap-3 px-2 pb-3 sm:gap-3.5">
              <h1 className="flex max-w-2xl items-center gap-2 text-center text-3xl text-white sm:text-3xl">
                <NearAIIcon className="h-6" /> AI
              </h1>
              <p className="text-center text-base text-white dark:text-gray-300">
                Chat with your personal assistant without worrying about leaking private information.
              </p>
            </div>
            <MessageInput
              messages={currentChat?.chat.messages}
              onSubmit={handleSendMessage}
              selectedModels={selectedModels}
              showUserProfile={false}
              fullWidth={false}
              prompt={inputValue}
              setPrompt={setInputValue}
            />
            <div className="mx-auto mt-2 w-full max-w-2xl font-primary">
              <div className="mx-5">
                <div className="mb-1 flex items-center gap-1 font-medium text-gray-400 text-xs dark:text-gray-400">
                  <Bolt className="h-4 w-4" />
                  Suggested
                </div>
                <div className="h-40 w-full">
                  <div role="list" className="scrollbar-none max-h-40 items-start overflow-auto">
                    {filteredPrompts.map((prompt, idx) => (
                      <button
                        key={prompt.content}
                        role="listitem"
                        className="waterfall group flex w-full flex-1 shrink-0 flex-col justify-between rounded-xl bg-transparent px-3 py-2 font-normal text-base transition hover:bg-black/5 dark:hover:bg-white/5"
                        style={{ animationDelay: `${idx * 60}ms` }}
                        onClick={() => setInputValue(prompt.content)}
                      >
                        <div className="flex flex-col text-left">
                          {prompt.title && prompt.title[0] !== "" ? (
                            <>
                              <div className="line-clamp-1 font-medium text-white transition dark:text-gray-300 dark:group-hover:text-gray-200">
                                {prompt.title[0]}
                              </div>
                              <div className="line-clamp-1 font-normal text-gray-400 text-xs dark:text-gray-400">
                                {prompt.title[1]}
                              </div>
                            </>
                          ) : (
                            <>
                              <div className="line-clamp-1 font-medium transition dark:text-gray-300 dark:group-hover:text-gray-200">
                                {prompt.content}
                              </div>
                              <div className="line-clamp-1 font-normal text-gray-600 text-xs dark:text-gray-400">
                                Prompt
                              </div>
                            </>
                          )}
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
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
        messages={currentChat?.chat.messages}
        onSubmit={handleSendMessage}
        prompt={inputValue}
        setPrompt={setInputValue}
        selectedModels={selectedModels}
      />
    </div>
  );
};

export default Home;
