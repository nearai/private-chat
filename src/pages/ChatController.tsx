import { useQueryClient } from "@tanstack/react-query";

import { useCallback, useMemo } from "react";
import { useLocation, useParams } from "react-router";
import { chatClient } from "@/api/chat/client";
import { TEMP_RESPONSE_ID } from "@/api/constants";
import { queryKeys } from "@/api/query-keys";

import { useUserSettings } from "@/api/users/queries/useUserSettings";

import { APP_ROUTES } from "@/pages/routes";
import { useChatStore } from "@/stores/useChatStore";
import {
  buildConversationEntry,
  type ConversationStoreState,
  createEmptyConversation,
  useConversationStore,
} from "@/stores/useConversationStore";
import { useStreamStore } from "@/stores/useStreamStore";
import type { ChatStartStreamOptions, ConversationUserInput } from "@/types";
import { ConversationRoles, ConversationTypes } from "@/types";
import type { ContentItem } from "@/types/openai";
import Home from "./Home";
import NewChat from "./NewChat";
import { useRemoteConfig } from "@/api/config/queries/useRemoteConfig";
import { toast } from "sonner";

export default function ChatController({ children }: { children?: React.ReactNode }) {
  const location = useLocation();
  const params = useParams<{ chatId?: string }>();
  const queryClient = useQueryClient();
  const { selectedModels } = useChatStore();
  const { addStream, removeStream, markStreamComplete, stopStream, stopAllStreams } = useStreamStore();
  const resetConversation = useConversationStore((state) => state.resetConversation);
  const updateConversation = useConversationStore((state) => state.updateConversation);
  const setConversationStatus = useConversationStore((state) => state.setConversationStatus);
  const userSettings = useUserSettings();
  const remoteConfig = useRemoteConfig();

  // Push response used for adding new response to the end of the conversation
  const pushResponse = useCallback(
    (conversationId: string, model: string, contentItems: ContentItem[], previous_response_id?: string) => {
      // Generate unique temp ID to prevent collisions in regenerate/branch scenarios
      const tempId = `temp-message-${crypto.randomUUID()}`;
      const tempRespId = TEMP_RESPONSE_ID;

      const updatedConversation = (draft: ConversationStoreState) => {
        if (!draft.conversation) {
          draft.conversation = {
            conversation: createEmptyConversation(conversationId),
            conversationId: conversationId,
            history: { messages: {} },
            allMessages: {},
            importedMessagesIdMapping: {},
            lastResponseId: null,
            batches: [],
          };
        }
        const userMessage: ConversationUserInput = {
          id: tempId,
          response_id: tempRespId,
          next_response_ids: [],
          created_at: Date.now(),
          status: "pending" as const,
          role: ConversationRoles.USER,
          type: ConversationTypes.MESSAGE,
          content: contentItems,
          model: model,
          previous_response_id: previous_response_id ?? draft.conversation.lastResponseId ?? undefined,
        };

        draft.conversation.conversation.data.push(userMessage);
        const lastResponseParentId = previous_response_id ?? draft.conversation.lastResponseId;

        // update conversation entry for rendering
        const { history, allMessages, lastResponseId, batches } = buildConversationEntry(
          draft.conversation.conversation,
          tempRespId
        );
        draft.conversation.history = history;
        draft.conversation.allMessages = allMessages;
        draft.conversation.lastResponseId = lastResponseId;
        draft.conversation.batches = batches;

        //Don't change the order
        if (lastResponseParentId) {
          const lastResponseParent = draft.conversation.history.messages[lastResponseParentId];
          if (lastResponseParent) {
            // Add tempId because we don't have responseId yet
            if (!lastResponseParent.nextResponseIds.includes(tempRespId)) {
              lastResponseParent.nextResponseIds = [...lastResponseParent.nextResponseIds, tempRespId];
            }
          }
        }

        draft.conversation.conversation.last_id = userMessage.id;
        if (!draft.conversation.conversation.first_id) {
          draft.conversation.conversation.first_id = userMessage.id;
        }
        return draft;
      };
      updateConversation(updatedConversation);
    },
    [selectedModels, updateConversation]
  );

  const startStream = useCallback(
    async (
      {
        contentItems,
        webSearchEnabled,
        conversationId,
        previous_response_id,
        currentModel,
        initiator,
      }: ChatStartStreamOptions
    ) => {
      const conversationLocalId = conversationId || params.chatId;
      if (!conversationLocalId) {
        console.error("Conversation ID is required to start stream");
        return;
      }
      
      const invalidateQueryKey = queryKeys.conversation.byId(conversationLocalId);
      const validModels = selectedModels.filter((model) => model && model.length > 0);

      const runStreamForModel = async (model: string, {
        previousResponseId,
        onResponseCreated,
      }: {
        previousResponseId?: string
        onResponseCreated?: () => void
      }) => {
        console.log(`Starting stream for model: ${model}`);
        pushResponse(conversationLocalId, model, contentItems, previousResponseId);
        const streamPromise = chatClient.startStream({
          model,
          role: "user",
          content: contentItems,
          conversation: conversationId,
          queryClient,
          include: webSearchEnabled ? ["web_search_call.action.sources"] : [],
          tools: webSearchEnabled ? [{ type: "web_search" }] : undefined,
          previous_response_id: previousResponseId,
          systemPrompt: userSettings.data?.settings.system_prompt,
          onReaderReady: (reader, abortController) => {
            addStream(conversationLocalId, streamPromise, undefined, reader, abortController);
          },
          onResponseCreated,
        });

        try {
          await streamPromise;
          markStreamComplete(conversationLocalId);
        } catch (error: any) {
          if (error?.name !== "AbortError") {
            console.error("Stream error:", error);
            toast.error(`Model ${model} failed to respond`);
          }
          markStreamComplete(conversationLocalId);
          removeStream(conversationLocalId);
          throw error;
        } finally {
          removeStream(conversationLocalId);
        }
      };

      const isNewChat = initiator === "new_chat";
      if (isNewChat && !previous_response_id && !currentModel && validModels.length > 1) {
        // Run the first model to establish the message anchor
        const firstModel = validModels[0];
        try {
          await runStreamForModel(firstModel, {
            previousResponseId: previous_response_id,
          });
        } catch (error) {
          console.error(`Stream failed for first model ${firstModel}:`, error);
        }

        let firstMessagePreviousId = previous_response_id;
        try {
          // Fetch conversation items to find the common parent ID
          const items = await chatClient.getConversationItems(conversationLocalId);
          // Find the user message we just created (should be one of the first items)
          const userMsg = items.data.find((m) => m.role === ConversationRoles.USER);
          if (userMsg) {
            firstMessagePreviousId = userMsg.previous_response_id;
          }
        } catch (error) {
          console.error("Failed to fetch conversation items to sync models:", error);
        }

        // Run the rest of the models attached to the same parent
        console.log("Starting streams for remaining models in new_chat");
        const remainingModels = validModels.slice(1);
        await Promise.all(
          remainingModels.map(async (model) => {
            try {
              await runStreamForModel(model, {
                previousResponseId: firstMessagePreviousId,
              });
            } catch (error: any) {
              toast.error(`Model ${model} failed to respond: ${error.message || error}`);
            }
          })
        );
        console.log("All new_chat model streams completed");
        resetConversation();
        queryClient.invalidateQueries({ queryKey: invalidateQueryKey });
        setConversationStatus(conversationLocalId, "ready");
        return;
      }

      if (isNewChat) {
        setConversationStatus(conversationLocalId, "ready");
      }
      if (initiator === "new_message" && !currentModel && validModels.length > 1) {
        await Promise.all(
          validModels.map(async (model) => {
            try {
              await runStreamForModel(model, {
                previousResponseId: previous_response_id,
              });
            } catch (error: any) {
              console.error(`Stream failed for model ${model}:`, error);
            }
          })
        );
        console.log("All model streams completed");
        queryClient.invalidateQueries({ queryKey: invalidateQueryKey });
        return;
      }

      const model = currentModel || validModels[0] || remoteConfig.data?.default_model;
      if (!model) {
        console.error("Model is required to start stream but none was available");
        return;
      }
      runStreamForModel(model, {
        previousResponseId: previous_response_id,
      })
        .catch((error) => {
          console.log("Stream error:", error);
        })
        .finally(() => {
          queryClient.invalidateQueries({ queryKey: invalidateQueryKey });
        });
    },
    [
      selectedModels,
      queryClient,
      pushResponse,
      addStream,
      markStreamComplete,
      removeStream,
      params.chatId,
      userSettings,
      remoteConfig.data?.default_model,
    ]
  );

  // Stop function to cancel active streams
  const handleStopStream = useCallback(() => {
    const chatId = params.chatId;
    if (chatId) {
      updateConversation((draft) => {
        if (!draft.conversation) return draft;

        const messages = draft.conversation.conversation.data ?? [];
        for (let i = messages.length - 1; i >= 0; i--) {
          const item = messages[i];
          if (
            item.type === ConversationTypes.MESSAGE &&
            item.role === ConversationRoles.ASSISTANT &&
            item.status === "pending"
          ) {
            item.status = "completed";

            if (draft.conversation.allMessages?.[item.id]) {
              draft.conversation.allMessages[item.id].status = "completed";
            }
            if (draft.conversation.history?.messages?.[item.id]) {
              draft.conversation.history.messages[item.id].status = "completed";
            }
            break;
          }
        }
        return draft;
      });

      stopStream(chatId);
    } else {
      // If no specific chat, stop all streams
      stopAllStreams();
    }
  }, [params.chatId, updateConversation, stopStream, stopAllStreams]);

  // Determine which component to render based on route
  const renderComponent = useMemo(() => {
    if (location.pathname === APP_ROUTES.HOME) {
      return <NewChat startStream={startStream} stopStream={handleStopStream} />;
    }
    if (location.pathname.startsWith("/c/")) {
      return <Home startStream={startStream} stopStream={handleStopStream} />;
    }
    return children;
  }, [location.pathname, children, startStream, handleStopStream]);

  return <>{renderComponent}</>;
}
