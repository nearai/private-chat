import Bolt from "@heroicons/react/24/outline/BoltIcon";
import { useQueryClient } from "@tanstack/react-query";
import Fuse from "fuse.js";
import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router";
import { useConversation } from "@/api/chat/queries/useConversation";
import { useResponse } from "@/api/chat/queries/useResponse";
import { DEFAULT_MODEL, MODEL_FOR_TITLE_GENERATION } from "@/api/constants";
import { queryKeys } from "@/api/query-keys";
import NearAIIcon from "@/assets/icons/near-ai.svg?react";
import type { Prompt } from "@/components/chat/ChatPlaceholder";
import MessageInput from "@/components/chat/MessageInput";
import Navbar from "@/components/chat/Navbar";
import { useAppInitialization } from "@/hooks/useAppInitialization";
import {
  DEFAULT_CONVERSATION_TITLE,
  FALLBACK_CONVERSATION_TITLE,
  LOCAL_STORAGE_KEYS,
  TITLE_GENERATION_DELAY,
} from "@/lib/constants";
import { useChatStore } from "@/stores/useChatStore";
import type { Conversation, ConversationInfo } from "@/types";
import { type ContentItem, type FileContentItem, generateContentFileDataForOpenAI } from "@/types/openai";
import { allPrompts } from "./welcome/data";

export default function NewChat({
  startStream,
}: {
  startStream: (content: ContentItem[], webSearchEnabled: boolean, conversationId?: string) => Promise<void>;
}) {
  const [inputValue, setInputValue] = useState("");
  const [filteredPrompts, setFilteredPrompts] = useState<Prompt[]>([]);
  const { selectedModels, models, setSelectedModels } = useChatStore();
  const modelInitializedRef = useRef(false);
  const sortedPrompts = useMemo(() => [...(allPrompts ?? [])].sort(() => Math.random() - 0.5), []);
  const { createConversation, updateConversation } = useConversation();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { generateChatTitle } = useResponse();

  const { isInitialized, isLoading: isAppLoading } = useAppInitialization();

  useEffect(() => {
    const welcomePagePrompt = localStorage.getItem(LOCAL_STORAGE_KEYS.WELCOME_PAGE_PROMPT);
    if (welcomePagePrompt && !isAppLoading && isInitialized) {
      setInputValue(welcomePagePrompt);
      localStorage.removeItem(LOCAL_STORAGE_KEYS.WELCOME_PAGE_PROMPT);
    }
  }, [isAppLoading, isInitialized]);

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

  const handleSendMessage = async (content: string, files: FileContentItem[], webSearchEnabled: boolean = false) => {
    const contentItems: ContentItem[] = [
      { type: "input_text", text: content },
      ...files.map((file) => generateContentFileDataForOpenAI(file)),
    ];

    const newConversation = await createConversation.mutateAsync(
      {
        items: [],
      },
      {
        onSuccess: async (data) => {
          await navigate(`/c/${data.id}?new`);
        },
      }
    );

    // Update conversation data
    queryClient.setQueryData(["conversation", newConversation.id], (old: Conversation) => {
      return {
        ...old,
        id: newConversation.id,
      };
    });

    // Optimistically update the conversations list
    queryClient.setQueryData<ConversationInfo[]>(queryKeys.conversation.all, (oldConversations = []) => {
      const newConversationInfo: ConversationInfo = {
        id: newConversation.id,
        created_at: newConversation.created_at,
        metadata: {
          title: DEFAULT_CONVERSATION_TITLE,
        },
      };
      return [newConversationInfo, ...oldConversations];
    });

    queryClient.invalidateQueries({
      queryKey: queryKeys.conversation.all,
    });

    await navigate(`/c/${newConversation.id}?new`);

    startStream(contentItems, webSearchEnabled, newConversation.id);

    // wait several seconds before checking title generation
    setTimeout(async () => {
      const conversation = queryClient?.getQueryData<Conversation>(["conversation", newConversation.id]);

      // Generate a new title if the title is still the default title or the fallback title
      if (
        !conversation?.metadata?.title ||
        conversation?.metadata?.title === DEFAULT_CONVERSATION_TITLE ||
        conversation?.metadata?.title === FALLBACK_CONVERSATION_TITLE
      ) {
        const title = await generateChatTitle.mutateAsync({ prompt: content, model: MODEL_FOR_TITLE_GENERATION });

        if (title) {
          // update the conversation details
          await updateConversation.mutateAsync({
            conversationId: newConversation.id,
            metadata: {
              title: title,
            },
          });

          // update the conversations list
          queryClient.setQueryData<ConversationInfo[]>(queryKeys.conversation.all, (oldConversations = []) =>
            oldConversations.map((conversation) =>
              conversation.id === newConversation.id
                ? {
                    ...conversation,
                    metadata: {
                      ...(conversation.metadata ?? {}),
                      title,
                    },
                  }
                : conversation
            )
          );
        }
      }
    }, TITLE_GENERATION_DELAY);
  };

  useEffect(() => {
    if (modelInitializedRef.current) return;
    const validSelectedModels = selectedModels.filter((modelId) => models.some((model) => model.modelId === modelId));
    if (validSelectedModels.length === 0 && models.length > 0) {
      // set default model
      const selectedDefaultModel = models.find((model) => model.modelId === DEFAULT_MODEL);
      if (selectedDefaultModel) {
        setSelectedModels([selectedDefaultModel.modelId]);
      }
    }
    modelInitializedRef.current = true;
  }, [selectedModels, models, setSelectedModels]);

  return (
    <div id="chat-container" className="relative flex h-full grow flex-col">
      <Navbar />
      <div className="flex h-full grow flex-col items-center justify-center">
        <div className="flex w-full flex-col items-center justify-center">
          <div className="flex w-fit max-w-2xl flex-col items-center justify-center gap-3 px-2 pb-3 sm:gap-3.5">
            <NearAIIcon className="h-6" />
            <p className="text-center text-base text-muted-foreground">
              Chat with your personal assistant without worrying about leaking private information.
            </p>
          </div>
          <MessageInput
            messages={[]}
            onSubmit={handleSendMessage}
            selectedModels={selectedModels}
            showUserProfile={false}
            fullWidth={false}
            prompt={inputValue}
            setPrompt={setInputValue}
          />
          <div className="mx-auto mt-2 w-full max-w-2xl font-primary">
            <div className="mx-5">
              <div className="mb-1 flex items-center gap-1 font-medium text-muted-foreground text-xs">
                <Bolt className="h-4 w-4" />
                Suggested
              </div>
              <div className="h-40 w-full">
                <div role="list" className="scrollbar-none max-h-40 items-start overflow-auto">
                  {filteredPrompts.map((prompt, idx) => (
                    <button
                      key={prompt.content}
                      role="listitem"
                      className="waterfall group flex w-full flex-1 shrink-0 flex-col justify-between rounded-xl px-3 py-2 font-normal text-base transition hover:bg-secondary/30"
                      style={{ animationDelay: `${idx * 60}ms` }}
                      onClick={() => setInputValue(prompt.content)}
                    >
                      <div className="flex flex-col text-left">
                        {prompt.title && prompt.title[0] !== "" ? (
                          <>
                            <div className="line-clamp-1 font-medium transition">{prompt.title[0]}</div>
                            <div className="line-clamp-1 font-normal text-muted-foreground text-xs">
                              {prompt.title[1]}
                            </div>
                          </>
                        ) : (
                          <>
                            <div className="line-clamp-1 font-medium transition">{prompt.content}</div>
                            <div className="line-clamp-1 font-normal text-muted-foreground text-xs">Prompt</div>
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
