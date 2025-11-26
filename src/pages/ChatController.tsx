import { useQueryClient } from "@tanstack/react-query";
import { useCallback, useMemo, useState } from "react";
import { useLocation, useParams } from "react-router";

import { chatClient } from "@/api/chat/client";
import { DEFAULT_MODEL, TEMP_MESSAGE_ID } from "@/api/constants";
import { queryKeys } from "@/api/query-keys";
import { APP_ROUTES } from "@/pages/routes";
import { useChatStore } from "@/stores/useChatStore";
import { useSettingsStore } from "@/stores/useSettingsStore";
import { useStreamStore } from "@/stores/useStreamStore";
import type { Conversation } from "@/types";
import type { ContentItem } from "@/types/openai";
import Home from "./Home";
import NewChat from "./NewChat";

export default function ChatController({ children }: { children?: React.ReactNode }) {
  const [currentMessageId, setCurrentMessageId] = useState<string | null>(null);
  const location = useLocation();
  const params = useParams<{ chatId?: string }>();
  const queryClient = useQueryClient();
  const { selectedModels } = useChatStore();
  const { settings } = useSettingsStore();
  const { addStream, removeStream, markStreamComplete } = useStreamStore();

  const initializeCache = useCallback(
    (conversationId: string, contentItems: ContentItem[], previous_response_id?: string) => {
      const existingData = queryClient.getQueryData<Conversation>(["conversation", conversationId]);
      const lastResponseId = previous_response_id || existingData?.data.at(-1)?.response_id;
      const lastResponse = existingData?.data.find((item) => item.response_id === lastResponseId);
      if (lastResponse) {
        lastResponse.next_response_ids = [TEMP_MESSAGE_ID];
      }
      const tempId = TEMP_MESSAGE_ID;
      setCurrentMessageId(tempId);

      const userMessage = {
        id: tempId,
        response_id: tempId,
        next_response_ids: [],
        created_at: Date.now(),
        status: "pending" as const,
        role: "user" as const,
        type: "message" as const,
        content: contentItems,
        model: selectedModels[0] || "",
        previous_response_id: lastResponseId,
      };

      const initialData = existingData
        ? userMessage
          ? {
              ...existingData,
              data: [...(existingData.data ?? []), userMessage] as Conversation["data"],
            }
          : existingData
        : {
            id: conversationId,
            created_at: Date.now(),
            metadata: {
              title: "New Conversation",
            },
            data: userMessage ? ([userMessage] as Conversation["data"]) : [],
            has_more: false,
            first_id: userMessage?.id || "",
            last_id: userMessage?.id || "",
            object: "list" as const,
          };

      queryClient.setQueryData(queryKeys.conversation.byId(conversationId), initialData);
      return initialData;
    },
    [queryClient, selectedModels]
  );

  const startStream = useCallback(
    async (
      contentItems: ContentItem[],
      webSearchEnabled: boolean,
      conversationId: string,
      previous_response_id?: string
    ) => {
      if (!conversationId) {
        console.error("Conversation ID is required to start stream");
        return;
      }

      const model = selectedModels[0] || DEFAULT_MODEL;

      const initialData = initializeCache(conversationId, contentItems, previous_response_id);

      const streamPromise = chatClient.startStream({
        model,
        role: "user",
        content: contentItems,
        conversation: conversationId,
        queryClient,
        include: webSearchEnabled ? ["web_search_call.action.sources"] : [],
        tools: webSearchEnabled ? [{ type: "web_search" }] : undefined,
        previous_response_id: previous_response_id,
      });

      addStream(conversationId, streamPromise, initialData);

      streamPromise
        .then(() => {
          markStreamComplete(conversationId);
          removeStream(conversationId);
        })
        .catch((error) => {
          console.error("Stream error:", error);
          markStreamComplete(conversationId);
          removeStream(conversationId);
        });
    },
    [
      selectedModels,
      initializeCache,
      queryClient,
      addStream,
      markStreamComplete,
      removeStream,
      location.pathname,
      params.chatId,
      settings.notificationEnabled,
    ]
  );

  // Wrapper function that matches the signature expected by NewChat and Home
  // Accepts optional conversationId - if not provided, gets from route params
  const startStreamWrapper = useCallback(
    async (contentItems: ContentItem[], webSearchEnabled: boolean, conversationId?: string) => {
      // Use provided conversationId or get from route params
      const finalConversationId = conversationId || params.chatId;
      if (!finalConversationId) {
        console.error("Conversation ID not available");
        return;
      }
      return startStream(contentItems, webSearchEnabled, finalConversationId);
    },
    [startStream, params.chatId]
  );

  // Determine which component to render based on route
  const renderComponent = useMemo(() => {
    if (location.pathname === APP_ROUTES.HOME) {
      return <NewChat startStream={startStreamWrapper} />;
    }
    if (location.pathname.startsWith("/c/")) {
      return (
        <Home
          startStream={startStreamWrapper}
          currentMessageId={currentMessageId}
          setCurrentMessageId={setCurrentMessageId}
        />
      );
    }
    return children;
  }, [location.pathname, children, startStreamWrapper, currentMessageId]);

  return <>{renderComponent}</>;
}
