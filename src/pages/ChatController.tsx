import { useQueryClient } from "@tanstack/react-query";

import { useCallback, useMemo } from "react";
import { useLocation, useParams } from "react-router";
import { chatClient } from "@/api/chat/client";
import { DEFAULT_MODEL, TEMP_RESPONSE_ID } from "@/api/constants";
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
import type { ConversationUserInput } from "@/types";
import { ConversationRoles, ConversationTypes } from "@/types";
import type { ContentItem } from "@/types/openai";
import Home from "./Home";
import NewChat from "./NewChat";

export default function ChatController({ children }: { children?: React.ReactNode }) {
  const location = useLocation();
  const params = useParams<{ chatId?: string }>();
  const queryClient = useQueryClient();
  const { selectedModels } = useChatStore();
  const { addStream, removeStream, markStreamComplete } = useStreamStore();
  const updateConversation = useConversationStore((state) => state.updateConversation);
  const userSettings = useUserSettings();

  // Push response used for adding new response to the end of the conversation
  const pushResponse = useCallback(
    (conversationId: string, contentItems: ContentItem[], previous_response_id?: string) => {
      // Generate unique temp ID to prevent collisions in regenerate/branch scenarios
      const tempId = `temp-message-${crypto.randomUUID()}`;

      const updatedConversation = (draft: ConversationStoreState) => {
        if (!draft.conversation) {
          draft.conversation = {
            conversation: createEmptyConversation(conversationId),
            conversationId: conversationId,
            history: { messages: {} },
            allMessages: {},
            lastResponseId: null,
            batches: [],
          };
        }
        const userMessage: ConversationUserInput = {
          id: tempId,
          response_id: TEMP_RESPONSE_ID,
          next_response_ids: [],
          created_at: Date.now(),
          status: "pending" as const,
          role: ConversationRoles.USER,
          type: ConversationTypes.MESSAGE,
          content: contentItems,
          model: selectedModels[0] || "",
          previous_response_id: previous_response_id ?? draft.conversation.lastResponseId ?? undefined,
        };

        draft.conversation.conversation.data.push(userMessage);
        const lastResponseParentId = previous_response_id ?? draft.conversation.lastResponseId;

        // update conversation entry for rendering
        const { history, allMessages, lastResponseId, batches } = buildConversationEntry(
          draft.conversation.conversation,
          TEMP_RESPONSE_ID
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
            if (!lastResponseParent.nextResponseIds.includes(TEMP_RESPONSE_ID)) {
              lastResponseParent.nextResponseIds = [...lastResponseParent.nextResponseIds, TEMP_RESPONSE_ID];
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
      contentItems: ContentItem[],
      webSearchEnabled: boolean,
      conversationId?: string,
      previous_response_id?: string
    ) => {
      const conversationLocalId = conversationId || params.chatId;
      if (!conversationLocalId) {
        console.error("Conversation ID is required to start stream");
        return;
      }

      const model = selectedModels[0] || DEFAULT_MODEL;

      pushResponse(conversationLocalId, contentItems, previous_response_id);

      const streamPromise = chatClient.startStream({
        model,
        role: "user",
        content: contentItems,
        conversation: conversationId,
        queryClient,
        include: webSearchEnabled ? ["web_search_call.action.sources"] : [],
        tools: webSearchEnabled ? [{ type: "web_search" }] : undefined,
        previous_response_id: previous_response_id,
        systemPrompt: userSettings.data?.settings.system_prompt,
      });

      addStream(conversationLocalId, streamPromise);

      streamPromise
        .then(() => {
          markStreamComplete(conversationLocalId);
        })
        .catch((error) => {
          console.error("Stream error:", error);
          markStreamComplete(conversationLocalId);
        })
        .finally(() => {
          removeStream(conversationLocalId);
          queryClient.invalidateQueries({ queryKey: queryKeys.conversation.byId(conversationLocalId) });
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
    ]
  );

  // Determine which component to render based on route
  const renderComponent = useMemo(() => {
    if (location.pathname === APP_ROUTES.HOME) {
      return <NewChat startStream={startStream} />;
    }
    if (location.pathname.startsWith("/c/")) {
      return <Home startStream={startStream} />;
    }
    return children;
  }, [location.pathname, children, startStream]);

  return <>{renderComponent}</>;
}
