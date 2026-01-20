import { chatClient } from "@/api/chat/client";
import { offlineCache } from "@/lib/offlineCache";
import type { Conversation, ConversationInfo } from "@/types";

const CONCURRENCY_LIMIT = 3;
const CHUNK_DELAY_MS = 300;
let hasStartedSync = false;

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export const resetSyncState = () => {
  hasStartedSync = false;
};

export const syncConversationsToLocalDb = async (onProgress?: (current: number, total: number) => void) => {
  if (hasStartedSync) {
    console.log("Sync already started, skipping.");
    return;
  }
  hasStartedSync = true;

  console.log("Starting missing conversation sync...");
  try {
    const conversations = (await chatClient.getConversations()) as unknown as ConversationInfo[];
    await offlineCache.saveConversationList(conversations);

    // Sort by created_at desc to sync newest first
    conversations.sort((a, b) => b.created_at - a.created_at);

    console.log(`Fetched ${conversations.length} conversations. Checking coverage...`);

    let completed = 0;
    const total = conversations.length;
    
    for (let i = 0; i < total; i += CONCURRENCY_LIMIT) {
      const chunk = conversations.slice(i, i + CONCURRENCY_LIMIT);
      
      await Promise.all(
        chunk.map(async (conv) => {
          try {
            const cached = await offlineCache.getConversationDetail(conv.id);
            if (cached) return;

            const [details, items] = await Promise.all([
              chatClient.getConversation(conv.id),
              chatClient.getConversationItems(conv.id),
            ]);
            
            const mergedConversation = { ...details, ...items } as Conversation;
            await offlineCache.saveConversationDetail(conv.id, mergedConversation);
          } catch (err) {
            console.error(`Failed to sync conversation ${conv.id}:`, err);
          }
        })
      );
      
      completed += chunk.length;
      onProgress?.(completed, total);

      // Add a small delay to avoid freezing the UI
      await delay(CHUNK_DELAY_MS);
    }
    
    console.log("Conversation sync complete.");
  } catch (error) {
    console.error("Sync failed:", error);
  }
};
