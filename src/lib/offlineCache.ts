import type { Conversation, ConversationInfo, User } from "@/types";
import { LOCAL_STORAGE_KEYS, OFFLINE_CACHE_KEYS } from "./constants";
import type { ExtendedMessageSignature } from "@/stores/useMessagesSignaturesStore";
import { db } from "./db";

const detailKey = (conversationId: string) => `${OFFLINE_CACHE_KEYS.CONVERSATION_DETAIL_PREFIX}${conversationId}`;

export const offlineCache = {
  async saveConversationList(conversations: ConversationInfo[]) {
    await db.set(OFFLINE_CACHE_KEYS.CONVERSATION_LIST, conversations);
  },
  async getConversationList(): Promise<ConversationInfo[] | null> {
    return db.get<ConversationInfo[]>(OFFLINE_CACHE_KEYS.CONVERSATION_LIST);
  },
  async saveConversationDetail(conversationId: string, conversation: Conversation) {
    await db.set(detailKey(conversationId), conversation);
  },
  async getConversationDetail(conversationId: string): Promise<Conversation | null> {
    return db.get<Conversation>(detailKey(conversationId));
  },
  async clearConversationList() {
    await db.del(OFFLINE_CACHE_KEYS.CONVERSATION_LIST);
  },
  async clearConversationDetails() {
    try {
      const keys = await db.getAllKeys();
      const detailKeys = keys.filter((key) => key.startsWith(OFFLINE_CACHE_KEYS.CONVERSATION_DETAIL_PREFIX));
      await Promise.all(detailKeys.map((key) => db.del(key)));
    } catch (error) {
      console.warn("Failed to clear offline conversation cache:", error);
    }
  },
  async saveUserData(user: User) {
    await db.set(LOCAL_STORAGE_KEYS.USER_DATA, user);
  },
  async getUserData(): Promise<User | null> {
    return db.get<User>(LOCAL_STORAGE_KEYS.USER_DATA);
  },
  async clearUserData() {
    await db.del(LOCAL_STORAGE_KEYS.USER_DATA);
  },
  async saveMessageSignatures(signatures: Record<string, ExtendedMessageSignature>) {
    await db.set(LOCAL_STORAGE_KEYS.SIGNATURES, signatures);
  },
  async getMessageSignatures(): Promise<Record<string, ExtendedMessageSignature> | null> {
    return db.get<Record<string, ExtendedMessageSignature>>(LOCAL_STORAGE_KEYS.SIGNATURES);
  },
  async clearMessageSignatures() {
    await db.del(LOCAL_STORAGE_KEYS.SIGNATURES);
  },
  async clearAll() {
    await this.clearConversationList();
    await this.clearConversationDetails();
    await this.clearUserData();
    await this.clearMessageSignatures();
  },
};
