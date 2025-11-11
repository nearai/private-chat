// import type { SigningAlgorithm } from "./nearai/client";

const CONFIG_KEY = "config";
const MODELS_KEY = "models";
// const NEARAI_KEY = "nearai";
const AUTH_KEY = "auth";
const CHAT_KEY = "chat";
const USERS_KEY = "users";
const CONVERSATION_KEY = "conversation";

export const queryKeys = {
  conversation: {
    all: [CONVERSATION_KEY],
  },
  config: {
    all: [CONFIG_KEY],
  },

  models: {
    all: [MODELS_KEY],
  },

  // nearai: {
  //   all: [NEARAI_KEY],
  //   modelAttestationReport: (model: string) => [NEARAI_KEY, "modelAttestationReport", model],
  //   messageSignature: (model: string, chatCompletionId: string, signingAlgorithm: SigningAlgorithm) => [
  //     NEARAI_KEY,
  //     "messageSignature",
  //     model,
  //     chatCompletionId,
  //     signingAlgorithm,
  //   ],
  // },

  auth: {
    sessionUser: [AUTH_KEY, "sessionUser"],
  },

  chat: {
    all: [CHAT_KEY],
    list: (page: number) => [CHAT_KEY, "list", page],
    listByUserId: (userId: string) => [CHAT_KEY, "listByUserId", userId],
    archived: [CHAT_KEY, "archived"],
    allChats: [CHAT_KEY, "allChats"],
    search: (text: string, page: number) => [CHAT_KEY, "search", text, page],
    byFolderId: (folderId: string) => [CHAT_KEY, "byFolderId", folderId],
    allArchived: [CHAT_KEY, "allArchived"],
    allUserChats: [CHAT_KEY, "allUserChats"],
    pinned: [CHAT_KEY, "pinned"],
    byTagName: (tagName: string) => [CHAT_KEY, "byTagName", tagName],
    byId: (id: string) => [CHAT_KEY, "byId", id],
    byShareId: (shareId: string) => [CHAT_KEY, "byShareId", shareId],
    pinnedStatus: (id: string) => [CHAT_KEY, "pinnedStatus", id],
    tags: (id: string) => [CHAT_KEY, "tags", id],
    files: [CHAT_KEY, "files"],
    file: (id: string) => [CHAT_KEY, "file", id],
    fileContent: (id: string) => [CHAT_KEY, "fileContent", id],
  },

  users: {
    all: [USERS_KEY],
    detail: (id: string) => [USERS_KEY, "detail", id],
    userData: [USERS_KEY, "userData"],
  },
} as const;
