import { assertConversationWritesEnabled } from "@/lib/read-only";
import type {
  ConversationCreateParams,
  ConversationUpdateParams,
  Conversation as OpenAIConversation,
} from "openai/resources/conversations/conversations.mjs";
import type { Responses } from "openai/resources/responses/responses.mjs";
import { ApiClient } from "@/api/base-client";
import { DEFAULT_SIGNING_ALGO, LOCAL_STORAGE_KEYS } from "@/lib/constants";
import { getExportErrorMessage, retryExportRequest } from "@/lib/export-retry";
import { getTimeRange } from "@/lib/time";
import type { ConversationStoreState } from "@/stores/useConversationStore";
import type {
  Chat,
  ChatInfo,
  Conversation,
  ConversationInfo,
  ConversationItem,
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
import type { FileOpenAIResponse, FilesOpenaiResponse } from "@/types/openai";

export interface ExportCheckpoint {
  list?: ConversationInfo[];
  conversations: Conversation[];
  current?: {
    conversation: Conversation;
    items: ConversationItemsResponse;
    after?: string;
  };
}

export type ExportScope = "all" | "archived";

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
    assertConversationWritesEnabled();
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
    assertConversationWritesEnabled();
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
    assertConversationWritesEnabled();
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
    assertConversationWritesEnabled();
    return this.post<OpenAIConversation>("/conversations", conversation, {
      apiVersion: "v2",
    });
  }

  addItemsToConversation(conversationId: string, items: Responses.ResponseInputItem[]) {
    assertConversationWritesEnabled();
    return this.post<Responses.ResponseInputItem[]>(
      `/conversations/${conversationId}/items`,
      { items },
      {
        apiVersion: "v2",
      }
    );
  }

  /**
   * Get a conversation by ID
   * @param id - Conversation ID
   * @param options.requiresAuth - Set to false for public conversations (default: true)
   */
  getConversation(
    id: string,
    options?: { requiresAuth?: boolean; signal?: AbortSignal; preserveErrorDetails?: boolean }
  ) {
    return this.get<Conversation>(`/conversations/${id}`, {
      apiVersion: "v2",
      requiresAuth: options?.requiresAuth,
      signal: options?.signal,
      preserveErrorDetails: options?.preserveErrorDetails,
    });
  }

  updateConversation(conversationId: string, metadata: ConversationUpdateParams["metadata"]) {
    assertConversationWritesEnabled();
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

  /**
   * Get conversation items by conversation ID
   * @param id - Conversation ID
   * @param options.requiresAuth - Set to false for public conversations (default: true)
   */
  getConversationItems(
    id: string,
    options?: {
      requiresAuth?: boolean;
      after?: string;
      limit?: number;
      order?: "asc" | "desc";
      signal?: AbortSignal;
      preserveErrorDetails?: boolean;
    }
  ) {
    const searchParams = new URLSearchParams();
    if (options?.after) searchParams.set("after", options.after);
    if (options?.limit) searchParams.set("limit", String(options.limit));
    if (options?.order) searchParams.set("order", options.order);

    const query = searchParams.toString();
    const endpoint = `/conversations/${id}/items${query ? `?${query}` : ""}`;

    return this.get<ConversationItemsResponse>(endpoint, {
      apiVersion: "v2",
      requiresAuth: options?.requiresAuth,
      signal: options?.signal,
      preserveErrorDetails: options?.preserveErrorDetails,
    });
  }

  async importChat(chat: object, meta: object | null, pinned?: boolean, folderId?: string | null) {
    assertConversationWritesEnabled();
    return this.post<Chat>("/chats/import", {
      chat: chat,
      meta: meta ?? {},
      pinned: pinned,
      folder_id: folderId,
    });
  }

  async getConversations(signal?: AbortSignal, preserveErrorDetails = false) {
    return this.get<ConversationInfo[]>(`/conversations`, {
      apiVersion: "v2",
      signal,
      preserveErrorDetails,
    });
  }

  async getConversationsForExport(
    onProgress?: (completed: number, total: number, itemsRead?: number) => void,
    signal?: AbortSignal,
    checkpoint: ExportCheckpoint = { conversations: [] },
    onRetry?: (attempt: number) => void,
    scope: ExportScope = "all"
  ): Promise<Conversation[]> {
    signal?.throwIfAborted();
    if (!checkpoint.list) {
      const list = await retryExportRequest(() => this.getConversations(signal, true), signal, onRetry);
      checkpoint.list = scope === "archived" ? list.filter((conversation) => !!conversation.metadata?.archived_at) : list;
    }
    signal?.throwIfAborted();
    const { list, conversations } = checkpoint;
    onProgress?.(conversations.length, list.length, checkpoint.current?.items.data.length);

    // Retain successful requests so retry resumes at the failed conversation or page.
    while (conversations.length < list.length) {
      const conversationInfo = list[conversations.length];
      try {
        signal?.throwIfAborted();
        if (!checkpoint.current) {
          const conversation = await retryExportRequest(
            () => this.getConversation(conversationInfo.id, { signal, preserveErrorDetails: true }),
            signal,
            onRetry
          );
          checkpoint.current = {
            conversation,
            items: { data: [], first_id: "", last_id: "", has_more: true, object: "list" },
          };
        }
        const current = checkpoint.current;
        while (current.items.has_more) {
          const page = await retryExportRequest(
            () =>
              this.getConversationItems(conversationInfo.id, {
                after: current.after,
                limit: 100,
                order: "asc",
                signal,
                preserveErrorDetails: true,
              }),
            signal,
            onRetry
          );
          // Validate before changing the checkpoint, so retry cannot duplicate a page.
          if (page.has_more && (!page.last_id || page.last_id === current.after)) {
            throw new Error("Conversation items pagination did not advance");
          }
          if (!current.items.first_id) current.items.first_id = page.first_id;
          current.items.data.push(...page.data);
          current.items.last_id = page.last_id;
          current.items.has_more = page.has_more;
          current.items.object = page.object;
          current.after = page.last_id;
          onProgress?.(conversations.length, list.length, current.items.data.length);
          signal?.throwIfAborted();
        }
        conversations.push({ ...conversationInfo, ...current.conversation, ...current.items });
        checkpoint.current = undefined;
        onProgress?.(conversations.length, list.length);
      } catch (error) {
        signal?.throwIfAborted();
        const title = conversationInfo.metadata?.title || conversationInfo.id;
        const message = getExportErrorMessage(error);
        throw new Error(`Failed to export conversation "${title}": ${message}`, { cause: error });
      }
    }
    return conversations;
  }

  async deleteConversation(id: string) {
    return this.delete<void>(`/conversations/${id}`, {
      apiVersion: "v2",
    });
  }

  async deleteAllConversations(onProgress?: (completed: number, total: number) => void, signal?: AbortSignal) {
    const deletedIds: string[] = [];
    const failedIds: string[] = [];
    if (signal?.aborted) return { deletedIds, failedIds, stopped: true };
    // Read the authenticated user's complete list from the server, including archived chats.
    let conversations: ConversationInfo[];
    try {
      conversations = await this.getConversations(signal);
    } catch (error) {
      if (signal?.aborted) return { deletedIds, failedIds, stopped: true };
      throw error;
    }
    if (signal?.aborted) return { deletedIds, failedIds, stopped: true };
    const ids = [...new Set(conversations.map((conversation) => conversation.id))];
    onProgress?.(0, ids.length);
    for (const id of ids) {
      if (signal?.aborted) return { deletedIds, failedIds, stopped: true };
      try {
        // Let an in-flight deletion finish so its outcome is known before stopping.
        await this.deleteConversation(id);
        deletedIds.push(id);
      } catch {
        failedIds.push(id);
      }
      onProgress?.(deletedIds.length + failedIds.length, ids.length);
    }
    return { deletedIds, failedIds, stopped: false };
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
    assertConversationWritesEnabled();
    return this.post<Chat>(`/conversations/${id}/pin`, {}, { apiVersion: "v2" });
  }

  async unpinConversationById(id: string) {
    assertConversationWritesEnabled();
    return this.delete<Chat>(`/conversations/${id}/pin`, { apiVersion: "v2" });
  }

  async cloneChatById(id: string) {
    assertConversationWritesEnabled();
    return this.post<Chat>(`/conversations/${id}/clone`, {}, { apiVersion: "v2" });
  }

  async cloneSharedChatById(id: string) {
    assertConversationWritesEnabled();
    return this.post<Chat>(`/chats/${id}/clone/shared`);
  }

  async shareChatById(id: string) {
    assertConversationWritesEnabled();
    return this.post<Chat>(`/chats/${id}/share`);
  }

  async updateChatFolderIdById(id: string, folderId?: string) {
    assertConversationWritesEnabled();
    return this.post<Chat>(`/chats/${id}/folder`, {
      folder_id: folderId,
    });
  }

  async archiveChatById(id: string) {
    assertConversationWritesEnabled();
    return this.post<Chat>(`/conversations/${id}/archive`, {}, { apiVersion: "v2" });
  }

  async unarchiveChatById(id: string) {
    assertConversationWritesEnabled();
    return this.delete<Chat>(`/conversations/${id}/archive`, { apiVersion: "v2" });
  }

  async deleteSharedChatById(id: string) {
    assertConversationWritesEnabled();
    return this.delete<Chat>(`/chats/${id}/share`);
  }

  async updateChatById(id: string, chat: object) {
    assertConversationWritesEnabled();
    return this.post<Chat>(`/chats/${id}`, {
      chat: chat,
    });
  }

  async deleteChatById(id: string) {
    assertConversationWritesEnabled();
    return this.delete<Chat>(`/conversations/${id}`, { apiVersion: "v2" });
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  async getTagsById(id: string): Promise<Tag[]> {
    console.log("getTagsById", id);
    return [];
    // return this.get<Tag[]>(`/chats/${id}/tags`);
  }

  async addTagById(id: string, tagName: string) {
    assertConversationWritesEnabled();
    return this.post<Tag>(`/chats/${id}/tags`, {
      name: tagName,
    });
  }

  async deleteTagById(id: string, tagName: string) {
    assertConversationWritesEnabled();
    return this.delete<Tag>(`/chats/${id}/tags`, {
      body: JSON.stringify({
        name: tagName,
      }),
    });
  }

  async deleteTagsById(id: string) {
    assertConversationWritesEnabled();
    return this.delete<Tag>(`/chats/${id}/tags/all`);
  }

  async deleteAllChats() {
    assertConversationWritesEnabled();
    return this.delete<Chat>(`/chats/`);
  }

  async archiveAllChats() {
    assertConversationWritesEnabled();
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
    previousResponseId,
    tempStreamId,
    onReaderReady,
    onUserResponseCreated,
  }: StartStreamProps & {
    onReaderReady?: (reader: ReadableStreamDefaultReader<Uint8Array>, abortController: AbortController) => void;
    onUserResponseCreated?: (draft: ConversationStoreState, userMsg: ConversationItem) => void;
  }) {
    assertConversationWritesEnabled();
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
        previous_response_id: previousResponseId,
        tempStreamId,
      },
      { apiVersion: "v2", queryClient, onReaderReady, onUserResponseCreated }
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

  async getFileContent(id: string | undefined): Promise<Blob> {
    try {
      if (!id) {
        throw new Error("File ID is required");
      }

      const response = await this.requestWithoutJson(`/files/${id}/content`, {
        apiVersion: "v2",
      });
      const blob = await response.blob();
      return blob;
    } catch (error) {
      console.error("Failed to fetch file content", { fileId: id, error });
      throw error;
    }
  }

  //https://platform.openai.com/docs/api-reference/files/create?lang=node.js
  async uploadFile(file: File) {
    assertConversationWritesEnabled();
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
    assertConversationWritesEnabled();
    return this.delete(`/files/${id}`, { apiVersion: "v2" });
  }

  async listConversationShares(conversationId: string) {
    return this.get<ConversationSharesListResponse>(`/conversations/${conversationId}/shares`, {
      apiVersion: "v2",
    });
  }

  async createConversationShare(conversationId: string, payload: CreateConversationShareRequest) {
    assertConversationWritesEnabled();
    return this.post<ConversationShareInfo[]>(`/conversations/${conversationId}/shares`, payload, {
      apiVersion: "v2",
    });
  }

  async deleteConversationShare(conversationId: string, shareId: string) {
    assertConversationWritesEnabled();
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
    assertConversationWritesEnabled();
    return this.post<ShareGroup>(`/share-groups`, payload, {
      apiVersion: "v2",
    });
  }

  async updateShareGroup(groupId: string, payload: UpdateShareGroupRequest) {
    assertConversationWritesEnabled();
    return this.patch<ShareGroup>(`/share-groups/${groupId}`, payload, {
      apiVersion: "v2",
    });
  }

  async deleteShareGroup(groupId: string) {
    assertConversationWritesEnabled();
    return this.delete<void>(`/share-groups/${groupId}`, {
      apiVersion: "v2",
    });
  }

  async listSharedWithMe() {
    return this.get<
      {
        conversation_id: string;
        permission: "read" | "write";
        title: string | null;
        created_at: number | null;
        error: string | null;
      }[]
    >(`/shared-with-me`, {
      apiVersion: "v2",
    });
  }
}

export const chatClient = new ChatClient();
