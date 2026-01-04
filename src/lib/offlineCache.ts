import type { Conversation, ConversationInfo, User } from "@/types";
import { LOCAL_STORAGE_KEYS, OFFLINE_CACHE_KEYS } from "./constants";

const hasStorage = () => typeof window !== "undefined" && typeof window.localStorage !== "undefined";

const detailKey = (conversationId: string) => `${OFFLINE_CACHE_KEYS.CONVERSATION_DETAIL_PREFIX}${conversationId}`;

const safelyParse = <T>(value: string | null): T | null => {
  if (!value) return null;
  try {
    return JSON.parse(value) as T;
  } catch (error) {
    console.warn("Failed to parse offline cache value:", error);
    return null;
  }
};

const safelyStore = (key: string, value: unknown) => {
  if (!hasStorage()) return;
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch (error) {
    console.warn("Failed to persist offline cache value:", error);
  }
};

const removeItem = (key: string) => {
  if (!hasStorage()) return;
  try {
    window.localStorage.removeItem(key);
  } catch (error) {
    console.warn("Failed to remove offline cache value:", error);
  }
};

export const offlineCache = {
  saveConversationList(conversations: ConversationInfo[]) {
    safelyStore(OFFLINE_CACHE_KEYS.CONVERSATION_LIST, conversations);
  },
  getConversationList(): ConversationInfo[] | null {
    if (!hasStorage()) return null;
    return safelyParse<ConversationInfo[]>(window.localStorage.getItem(OFFLINE_CACHE_KEYS.CONVERSATION_LIST));
  },
  saveConversationDetail(conversationId: string, conversation: Conversation) {
    safelyStore(detailKey(conversationId), conversation);
  },
  getConversationDetail(conversationId: string): Conversation | null {
    if (!hasStorage()) return null;
    return safelyParse<Conversation>(window.localStorage.getItem(detailKey(conversationId)));
  },
  clearConversationList() {
    removeItem(OFFLINE_CACHE_KEYS.CONVERSATION_LIST);
  },
  clearConversationDetails() {
    if (!hasStorage()) return;
    try {
      Object.keys(window.localStorage).forEach((key) => {
        if (key.startsWith(OFFLINE_CACHE_KEYS.CONVERSATION_DETAIL_PREFIX)) {
          window.localStorage.removeItem(key);
        }
      });
    } catch (error) {
      console.warn("Failed to clear offline conversation cache:", error);
    }
  },
  saveUserData(user: User) {
    safelyStore(LOCAL_STORAGE_KEYS.USER_DATA, user);
  },
  getUserData(): User | null {
    if (!hasStorage()) return null;
    return safelyParse<User>(window.localStorage.getItem(LOCAL_STORAGE_KEYS.USER_DATA));
  },
  clearUserData() {
    removeItem(LOCAL_STORAGE_KEYS.USER_DATA);
  },
  clearAll() {
    this.clearConversationList();
    this.clearConversationDetails();
    this.clearUserData();
  },
};
