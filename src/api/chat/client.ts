import type {
  ConversationCreateParams,
  ConversationUpdateParams,
  Conversation as OpenAIConversation,
} from "openai/resources/conversations/conversations.mjs";
import type { Responses } from "openai/resources/responses/responses.mjs";
import { ApiClient } from "@/api/base-client";
import { DEFAULT_SIGNING_ALGO, LOCAL_STORAGE_KEYS } from "@/lib/constants";
import { getTimeRange } from "@/lib/time";
import type {
  Chat,
  ChatInfo,
  Conversation,
  ConversationInfo,
  ConversationItemsResponse,
  ConversationShareInfo,
  ConversationSharesListResponse,
  CreateConversationShareRequest,
  CreateShareGroupRequest,
  ShareGroup,
  StartStreamProps,
  Tag,
  UpdateShareGroupRequest,
} from "@/types";
import type { FileContentResponse, FileOpenAIResponse, FilesOpenaiResponse } from "@/types/openai";

export interface UploadError {
  error: {
    type: string;
    message?: string;
    code?: string | number;
  };
}

export function isUploadError(err: unknown): err is UploadError {
  return (
    typeof err === "object" &&
    err !== null &&
    "error" in err &&
    typeof (err as { error?: unknown }).error === "object" &&
    (err as { error?: { type?: unknown } }).error !== null &&
    typeof (err as { error?: { type?: unknown } }).error?.type === "string"
  );
}

class ChatClient extends ApiClient {
  constructor() {
    super({
      apiPrefix: "/api/v1",
      defaultHeaders: {
        Accept: "application/json",
        "Content-Type": "application/json",
      },
      includeAuth: true,
    });
  }

  //TODO: or use createNewChat
  createChat(title: string = "New Chat"): ChatInfo {
    return {
      id: `chat-${Date.now()}`,
      title,
      content: "",
      created_at: Date.now(),
      updated_at: Date.now().toString(),
    };
  }

  sentPrompt(
    prompt: string,
    role: "user" | "assistant" = "user",
    model: string = "openai/gpt-oss-120b",
    conversation: string
  ) {
    return this.post<Responses.Response>(
      "/responses",
      {
        model: model,
        input: [{ role, content: prompt }],
        conversation,
        signing_algo: DEFAULT_SIGNING_ALGO,
      },
      {
        apiVersion: "v2",
      }
    );
  }

  generateChatTitle(prompt: string, model: string = "openai/gpt-oss-120b") {
    return this.post<Responses.Response>(
      "/responses",
      {
        model: model,
        input: [
          {
            role: "user",
            content: `Generate a title for the following conversation: ${prompt}, it should be short and concise, return only the title, nothing else.`,
          },
        ],
      },
      {
        apiVersion: "v2",
      }
    );
  }

  createConversation(conversation: ConversationCreateParams) {
    return this.post<OpenAIConversation>("/conversations", conversation, {
      apiVersion: "v2",
    });
  }

  addItemsToConversation(conversationId: string, items: Responses.ResponseInputItem[]) {
    return this.post<Responses.ResponseInputItem[]>(
      `/conversations/${conversationId}/items`,
      { items },
      {
        apiVersion: "v2",
      }
    );
  }

  getConversation(id: string) {
    return this.get<Conversation>(`/conversations/${id}`, {
      apiVersion: "v2",
    });
  }

  updateConversation(conversationId: string, metadata: ConversationUpdateParams["metadata"]) {
    return this.post<ConversationUpdateParams>(
      `/conversations/${conversationId}`,
      {
        metadata: metadata,
      },
      {
        apiVersion: "v2",
      }
    );
  }
  getConversationsIds() {
    const conversations = localStorage.getItem(LOCAL_STORAGE_KEYS.CONVERSATIONS);
    if (!conversations) return [];
    try {
      const parsed = JSON.parse(conversations) as ConversationInfo[] | string[];
      if (Array.isArray(parsed) && parsed.length > 0) {
        if (typeof parsed[0] === "string") {
          return parsed;
        }
        return (parsed as ConversationInfo[]).map((conversation) => conversation.id);
      }
    } catch (error) {
      console.warn("Failed to parse cached conversation ids:", error);
    }
    return [];
  }

  getConversationItems(id: string) {
    return this.get<ConversationItemsResponse>(`/conversations/${id}/items`, {
      apiVersion: "v2",
    });
  }

  async importChat(chat: object, meta: object | null, pinned?: boolean, folderId?: string | null) {
    return this.post<Chat>("/chats/import", {
      chat: chat,
      meta: meta ?? {},
      pinned: pinned,
      folder_id: folderId,
    });
  }

  async getConversations() {
    return this.get<Conversation[]>(`/conversations`, {
      apiVersion: "v2",
    });
  }

  async deleteConversation(id: string) {
    return this.delete<void>(`/conversations/${id}`, {
      apiVersion: "v2",
    });
  }

  async getChatList(page: number | null = null) {
    const searchParams = new URLSearchParams();
    if (page !== null) {
      searchParams.append("page", `${page}`);
    }
    const res = await this.get<Conversation[]>(`/conversations`, {
      apiVersion: "v2",
    });

    return res;
  }

  //TODO: Is it necessary?
  async getChatListByUserId(userId: string) {
    const res = await this.get<Chat[]>(`/chats/list/user/${userId}`);

    return res.map((chat) => ({
      ...chat,
      time_range: getTimeRange(chat.updated_at),
    }));
  }

  async getArchivedChatList() {
    return this.get<Chat[]>(`/chats/archived`);
  }

  async getAllChats() {
    return this.get<Chat[]>(`/chats/all`);
  }

  async getChatListBySearchText(text: string, page: number = 1) {
    const searchParams = new URLSearchParams();
    searchParams.append("text", text);
    searchParams.append("page", `${page}`);

    const res = await this.get<Chat[]>(`/chats/search?${searchParams.toString()}`);

    return res.map((chat) => ({
      ...chat,
      time_range: getTimeRange(chat.updated_at),
    }));
  }

  async getChatsByFolderId(folderId: string) {
    return this.get<Chat[]>(`/chats/folder/${folderId}`);
  }

  async getAllArchivedChats() {
    return this.get<Chat[]>(`/chats/all/archived`);
  }

  async getAllUserChats() {
    return this.get<Chat[]>(`/chats/all/db`);
  }

  async getAllTags() {
    return [];
  }

  async getPinnedChatList() {
    const res = await this.get<Chat[]>(`/chats/pinned`);
    return res.map((chat) => ({
      ...chat,
      time_range: getTimeRange(chat.updated_at),
    }));
  }

  async getChatListByTagName(tagName: string) {
    const res = await this.post<Chat[]>(`/chats/tags`, {
      name: tagName,
    });

    return res.map((chat) => ({
      ...chat,
      time_range: getTimeRange(chat.updated_at),
    }));
  }

  async getChatById(id: string) {
    return this.get<Chat>(`/chats/${id}`);
  }

  async getChatByShareId(shareId: string) {
    return this.get<Chat>(`/chats/share/${shareId}`);
  }

  async getChatPinnedStatusById(id: string) {
    return this.get<boolean>(`/chats/${id}/pinned`);
  }

  async pinConversationById(id: string) {
    return this.post<Chat>(`/conversations/${id}/pin`, {}, { apiVersion: "v2" });
  }

  async unpinConversationById(id: string) {
    return this.delete<Chat>(`/conversations/${id}/pin`, { apiVersion: "v2" });
  }

  async cloneChatById(id: string) {
    return this.post<Chat>(`/conversations/${id}/clone`, {}, { apiVersion: "v2" });
  }

  async cloneSharedChatById(id: string) {
    return this.post<Chat>(`/chats/${id}/clone/shared`);
  }

  async shareChatById(id: string) {
    return this.post<Chat>(`/chats/${id}/share`);
  }

  async updateChatFolderIdById(id: string, folderId?: string) {
    return this.post<Chat>(`/chats/${id}/folder`, {
      folder_id: folderId,
    });
  }

  async archiveChatById(id: string) {
    return this.post<Chat>(`/conversations/${id}/archive`, {}, { apiVersion: "v2" });
  }

  async unarchiveChatById(id: string) {
    return this.delete<Chat>(`/conversations/${id}/archive`, { apiVersion: "v2" });
  }

  async deleteSharedChatById(id: string) {
    return this.delete<Chat>(`/chats/${id}/share`);
  }

  async updateChatById(id: string, chat: object) {
    return this.post<Chat>(`/chats/${id}`, {
      chat: chat,
    });
  }

  async deleteChatById(id: string) {
    return this.delete<Chat>(`/conversations/${id}`, { apiVersion: "v2" });
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  async getTagsById(id: string): Promise<Tag[]> {
    console.log("getTagsById", id);
    return [];
    // return this.get<Tag[]>(`/chats/${id}/tags`);
  }

  async addTagById(id: string, tagName: string) {
    return this.post<Tag>(`/chats/${id}/tags`, {
      name: tagName,
    });
  }

  async deleteTagById(id: string, tagName: string) {
    return this.delete<Tag>(`/chats/${id}/tags`, {
      body: JSON.stringify({
        name: tagName,
      }),
    });
  }

  async deleteTagsById(id: string) {
    return this.delete<Tag>(`/chats/${id}/tags/all`);
  }

  async deleteAllChats() {
    return this.delete<Chat>(`/chats/`);
  }

  async archiveAllChats() {
    return this.post<Chat>(`/chats/archive/all`);
  }

  async startStream({
    systemPrompt,
    model,
    role,
    content,
    conversation,
    queryClient,
    tools,
    include,
    previous_response_id,
  }: StartStreamProps) {
    const input = Array.isArray(content)
      ? [{ role, content }]
      : [{ role, content: [{ type: "input_text", text: content }] }];
    return this.stream(
      "/responses",
      {
        model,
        input,
        conversation,
        stream: true,
        tools,
        include,
        instructions: systemPrompt,
        signing_algo: DEFAULT_SIGNING_ALGO,
        previous_response_id,
      },
      { apiVersion: "v2", queryClient }
    );
  }

  async getFiles() {
    return this.get<FilesOpenaiResponse>("/files", { apiVersion: "v2" });
  }

  async getFile(id: string | undefined): Promise<FileOpenAIResponse> {
    if (!id) {
      throw new Error("File ID is required");
    }
    return this.get(`/files/${id}`, { apiVersion: "v2" });
  }

  async getFileContent(id: string | undefined): Promise<FileContentResponse> {
    if (!id) {
      throw new Error("File ID is required");
    }

    return this.get<FileContentResponse>(`/files/${id}/content`, {
      apiVersion: "v2",
    });
  }

  //https://platform.openai.com/docs/api-reference/files/create?lang=node.js
  async uploadFile(file: File) {
    const formData = new FormData();
    formData.append("file", file);
    formData.append("purpose", "user_data");
    formData.append("expires_after[anchor]", "created_at");
    formData.append("expires_after[seconds]", "36000");

    return this.post<FileOpenAIResponse>("/files", formData, {
      apiVersion: "v2",
      withoutHeaders: true,
    });
  }

  async deleteFile(id: string) {
    return this.delete(`/files/${id}`, { apiVersion: "v2" });
  }

  async listConversationShares(conversationId: string) {
    return this.get<ConversationSharesListResponse>(`/conversations/${conversationId}/shares`, {
      apiVersion: "v2",
    });
  }

  async createConversationShare(conversationId: string, payload: CreateConversationShareRequest) {
    return this.post<ConversationShareInfo[]>(`/conversations/${conversationId}/shares`, payload, {
      apiVersion: "v2",
    });
  }

  async deleteConversationShare(conversationId: string, shareId: string) {
    return this.delete<void>(`/conversations/${conversationId}/shares/${shareId}`, {
      apiVersion: "v2",
    });
  }

  async listShareGroups() {
    return this.get<ShareGroup[]>(`/share-groups`, {
      apiVersion: "v2",
    });
  }

  async createShareGroup(payload: CreateShareGroupRequest) {
    return this.post<ShareGroup>(`/share-groups`, payload, {
      apiVersion: "v2",
    });
  }

  async updateShareGroup(groupId: string, payload: UpdateShareGroupRequest) {
    return this.patch<ShareGroup>(`/share-groups/${groupId}`, payload, {
      apiVersion: "v2",
    });
  }

  async deleteShareGroup(groupId: string) {
    return this.delete<void>(`/share-groups/${groupId}`, {
      apiVersion: "v2",
    });
  }

  async listSharedWithMe() {
    return this.get<{ conversation_id: string; permission: "read" | "write" }[]>(`/shared-with-me`, {
      apiVersion: "v2",
    });
  }

  // Legacy public shared conversation access by token (no auth required)
  async getPublicSharedConversation(shareToken: string) {
    return this.get<Conversation>(`/shared/conversations/${shareToken}`, {
      apiVersion: "v2",
      requiresAuth: false,
    });
  }

  async getPublicSharedConversationItems(shareToken: string) {
    return this.get<ConversationItemsResponse>(`/shared/conversations/${shareToken}/items`, {
      apiVersion: "v2",
      requiresAuth: false,
    });
  }

  // Public conversation access by ID (no auth required, requires public share enabled)
  async getPublicConversation(conversationId: string) {
    return this.get<Conversation>(`/public/conversations/${conversationId}`, {
      apiVersion: "v2",
      requiresAuth: false,
    });
  }

  async getPublicConversationItems(conversationId: string) {
    return this.get<ConversationItemsResponse>(`/public/conversations/${conversationId}/items`, {
      apiVersion: "v2",
      requiresAuth: false,
    });
  }
}

export const chatClient = new ChatClient();
