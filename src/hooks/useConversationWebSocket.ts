import { useCallback, useEffect, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  ConversationWebSocket,
  type ConnectionState,
  type WebSocketMessage,
} from "@/lib/websocket";
import { queryKeys } from "@/api/query-keys";
import { buildConversationEntry, useConversationStore } from "@/stores/useConversationStore";
import { TEMP_RESPONSE_ID } from "@/api/constants";
import type { ConversationItem } from "@/types";

/** How long to show typing indicator after last typing event (ms) */
const TYPING_INDICATOR_TIMEOUT = 3000;

export interface UseConversationWebSocketOptions {
  /** Conversation ID to connect to (null to disconnect) */
  conversationId: string | null;
  /** Whether the conversation is shared (WebSocket only connects for shared conversations) */
  isSharedConversation: boolean;
  /** Current user ID to filter out from typing indicators */
  currentUserId?: string;
}

export interface UseConversationWebSocketResult {
  /** Current connection state */
  connectionState: ConnectionState;
  /** Whether WebSocket is connected */
  isConnected: boolean;
  /** List of user names currently typing */
  typingUsers: string[];
}

/**
 * Hook that manages WebSocket connection for real-time conversation updates.
 *
 * Only connects when:
 * 1. There's a valid conversation ID
 * 2. The conversation is shared with other users
 *
 * Usage:
 * ```tsx
 * const { connectionState, isConnected, typingUsers } = useConversationWebSocket({
 *   conversationId: chatId,
 *   isSharedConversation: true,
 * });
 * ```
 */
export function useConversationWebSocket({
  conversationId,
  isSharedConversation,
  currentUserId,
}: UseConversationWebSocketOptions): UseConversationWebSocketResult {
  const [connectionState, setConnectionState] = useState<ConnectionState>("disconnected");
  const [typingUsers, setTypingUsers] = useState<Map<string, { name: string; timeout: NodeJS.Timeout }>>(new Map());
  const wsRef = useRef<ConversationWebSocket | null>(null);
  const queryClient = useQueryClient();
  const updateConversation = useConversationStore((state) => state.updateConversation);

  // Handle typing indicator from another user
  const handleTypingIndicator = useCallback((userId: string, userName?: string) => {
    // Ignore typing indicators from the current user
    if (currentUserId && userId === currentUserId) {
      return;
    }

    setTypingUsers((prev) => {
      const newMap = new Map(prev);

      // Clear existing timeout for this user
      const existing = newMap.get(userId);
      if (existing) {
        clearTimeout(existing.timeout);
      }

      // Set new timeout to auto-remove after TYPING_INDICATOR_TIMEOUT
      const timeout = setTimeout(() => {
        setTypingUsers((current) => {
          const updated = new Map(current);
          updated.delete(userId);
          return updated;
        });
      }, TYPING_INDICATOR_TIMEOUT);

      newMap.set(userId, {
        name: userName ?? userId,
        timeout,
      });

      return newMap;
    });
  }, [currentUserId]);

  // Handle new items received via WebSocket
  const handleNewItems = useCallback(
    (items: ConversationItem[]) => {
      if (!items || items.length === 0) return;

      console.debug("WebSocket handleNewItems: processing", items.length, "items", items);

      updateConversation((state) => {
        if (!state.conversation) {
          console.warn("WebSocket handleNewItems: no conversation in state");
          return state;
        }

        // Add new items to the conversation data
        const existingIds = new Set(
          state.conversation.conversation.data?.map((item) => item.id) ?? []
        );
        console.debug("WebSocket handleNewItems: existing IDs count:", existingIds.size);

        // Filter out items that already exist
        const newItems = items.filter((item) => !existingIds.has(item.id));
        console.debug("WebSocket handleNewItems: new items after filtering:", newItems.length);

        if (newItems.length === 0) {
          console.debug("WebSocket handleNewItems: all items already exist, skipping");
          return state;
        }

        // Remove any temp/optimistic messages before adding real ones
        // This prevents duplicates when the sender's optimistic message is replaced
        const existingDataWithoutTemp = (state.conversation.conversation.data ?? []).filter(
          (item) => item.response_id !== TEMP_RESPONSE_ID
        );

        // Create new conversation data with added items
        const newConversationData = [
          ...existingDataWithoutTemp,
          ...newItems,
        ];

        // Update last_id to the latest item
        const latestItem = newItems[newItems.length - 1];
        const newLastId = latestItem?.id ?? state.conversation.conversation.last_id;

        // Create updated conversation object
        const updatedConversation = {
          ...state.conversation.conversation,
          data: newConversationData,
          last_id: newLastId,
        };

        // Rebuild the history and batches
        // Don't preserve old lastResponseId - we want to navigate to the new item
        const { history, allMessages, lastResponseId, batches } = buildConversationEntry(
          updatedConversation
        );

        console.debug("WebSocket handleNewItems: successfully added", newItems.length, "items to conversation");
        console.debug("WebSocket handleNewItems: new lastResponseId:", lastResponseId);
        console.debug("WebSocket handleNewItems: batches:", batches);
        console.debug("WebSocket handleNewItems: newItems response_ids:", newItems.map(i => i.response_id));

        // Return new state object
        return {
          ...state,
          conversation: {
            ...state.conversation,
            conversation: updatedConversation,
            history,
            allMessages,
            lastResponseId,
            batches,
          },
        };
      });
    },
    [updateConversation]
  );

  // Handle incoming WebSocket messages
  const handleMessage = useCallback(
    (message: WebSocketMessage) => {
      switch (message.event_type) {
        case "new_items": {
          // New items were added to the conversation
          // Handle different response formats from OpenAI:
          // - Array directly: [{item1}, {item2}]
          // - Object with data array: { data: [{item1}, {item2}] }
          // - Object with items array: { items: [{item1}, {item2}] }
          console.debug("WebSocket new_items received:", message.items);
          let items: unknown[];
          if (Array.isArray(message.items)) {
            items = message.items;
          } else if (message.items && typeof message.items === "object") {
            // Try to extract array from common wrapper properties
            const wrapped = message.items as Record<string, unknown>;
            if (Array.isArray(wrapped.data)) {
              items = wrapped.data;
            } else if (Array.isArray(wrapped.items)) {
              items = wrapped.items;
            } else {
              // Single item object - wrap in array
              items = [message.items];
            }
          } else {
            items = [];
          }

          if (items.length > 0) {
            handleNewItems(items as ConversationItem[]);
          } else {
            console.warn("WebSocket new_items: could not extract items array:", message.items);
          }
          break;
        }

        case "response_created":
          // AI response completed - invalidate query to fetch new data
          console.log("WebSocket response_created received:", message.conversation_id, message.response_id);
          if (message.conversation_id) {
            console.log("Invalidating query for conversation:", message.conversation_id);
            queryClient.invalidateQueries({
              queryKey: queryKeys.conversation.byId(message.conversation_id),
            });
          }
          break;

        case "typing":
          // Another user is typing
          handleTypingIndicator(message.user_id, message.user_name);
          break;

        case "pong":
          // Pong response, ignore
          break;
      }
    },
    [handleTypingIndicator, handleNewItems, queryClient]
  );

  // Manage WebSocket connection
  useEffect(() => {
    // Only connect if we have a conversation ID and it's shared
    if (!conversationId || !isSharedConversation) {
      if (wsRef.current) {
        wsRef.current.disconnect();
        wsRef.current = null;
      }
      setConnectionState("disconnected");
      return;
    }

    // Create WebSocket if it doesn't exist
    if (!wsRef.current) {
      wsRef.current = new ConversationWebSocket({
        onMessage: handleMessage,
        onStateChange: setConnectionState,
      });
    }

    // Connect to the conversation
    wsRef.current.connect(conversationId);

    // Cleanup on unmount or conversation change
    return () => {
      // Don't disconnect on every effect run, only when really unmounting
      // The WebSocket handles conversation changes internally
    };
  }, [conversationId, isSharedConversation, handleMessage]);

  // Cleanup WebSocket on unmount
  useEffect(() => {
    return () => {
      if (wsRef.current) {
        wsRef.current.disconnect();
        wsRef.current = null;
      }
    };
  }, []);

  // Clear all typing timeouts when conversation changes or unmounts
  useEffect(() => {
    const currentTypingUsers = typingUsers;
    return () => {
      currentTypingUsers.forEach((user) => {
        clearTimeout(user.timeout);
      });
    };
  }, [typingUsers]);

  // Convert typingUsers map to array of names for the component
  const typingUserNames = Array.from(typingUsers.values()).map((u) => u.name);

  return {
    connectionState,
    isConnected: connectionState === "connected",
    typingUsers: typingUserNames,
  };
}
