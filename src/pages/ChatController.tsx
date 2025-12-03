import { useQueryClient } from "@tanstack/react-query";
import { useCallback, useMemo } from "react";
import { useLocation, useParams } from "react-router";

import { chatClient } from "@/api/chat/client";
import { DEFAULT_MODEL } from "@/api/constants";
import { useUserSettings } from "@/api/users/queries/useUserSettings";
import { APP_ROUTES } from "@/pages/routes";
import { useChatStore } from "@/stores/useChatStore";
import { useSettingsStore } from "@/stores/useSettingsStore";
import { useStreamStore } from "@/stores/useStreamStore";
import type { Conversation } from "@/types";
import type { ContentItem } from "@/types/openai";
import Home from "./Home";
import NewChat from "./NewChat";

export default function ChatController({ children }: { children?: React.ReactNode }) {
  const location = useLocation();
  const params = useParams<{ chatId?: string }>();
  const queryClient = useQueryClient();
  const { selectedModels } = useChatStore();
  const { settings } = useSettingsStore();
  const { addStream, removeStream, markStreamComplete } = useStreamStore();
  const userSettings = useUserSettings();

  const initializeCache = useCallback(
    (conversationId: string, contentItems: ContentItem[]) => {
      const existingData = queryClient.getQueryData<Conversation>(["conversation", conversationId]);
      const hasUserMessage = existingData?.data?.some(
        (item) =>
          item.type === "message" &&
          item.role === "user" &&
          JSON.stringify(item.content) === JSON.stringify(contentItems)
      );
      const userMessage = hasUserMessage
        ? undefined
        : {
            id: `temp-${Date.now()}`,
            response_id: `response-${Date.now()}`,
            next_response_ids: [],
            created_at: Date.now(),
            status: "pending" as const,
            role: "user" as const,
            type: "message" as const,
            content: contentItems,
            model: selectedModels[0] || "",
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
      queryClient.setQueryData(["conversation", conversationId], initialData);
      return initialData;
    },
    [queryClient, selectedModels]
  );

  const startStream = useCallback(
    async (contentItems: ContentItem[], webSearchEnabled: boolean, conversationId: string) => {
      if (!conversationId) {
        console.error("Conversation ID is required to start stream");
        return;
      }

      const model = selectedModels[0] || DEFAULT_MODEL;

      const initialData = initializeCache(conversationId, contentItems);

      const streamPromise = chatClient.startStream({
        model,
        role: "user",
        content: contentItems,
        conversation: conversationId,
        queryClient,
        include: webSearchEnabled ? ["web_search_call.action.sources"] : [],
        tools: webSearchEnabled ? [{ type: "web_search" }] : undefined,
        systemPrompt: userSettings.data?.settings.system_prompt,
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
      userSettings,
    ]
  );

  // Wrapper function that matches the signature expected by NewChat and Home
  // Accepts optional conversationId - if not provided, gets from route params
  const startStreamWrapper = useCallback(
    async (contentItems: ContentItem[], webSearchEnabled: boolean, conversationId?: string) => {
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
      return <Home startStream={startStreamWrapper} />;
    }
    return children;
  }, [location.pathname, children, startStreamWrapper]);

  return <>{renderComponent}</>;
}
