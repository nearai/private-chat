import type { QueryClient } from "@tanstack/react-query";
import { createParser, type EventSourceMessage } from "eventsource-parser";
import { produce } from "immer";
import OpenAI from "openai";
import type { Responses } from "openai/resources/responses/responses.mjs";
import { toast } from "sonner";
import { FALLBACK_CONVERSATION_TITLE, LOCAL_STORAGE_KEYS } from "@/lib/constants";
import type {
  Conversation,
  ConversationInfo,
  ConversationModelOutput,
  ConversationWebSearchCall,
  SearchAction,
} from "@/types";
import { ConversationRoles, ConversationTypes } from "@/types";
import type { ContentItem } from "@/types/openai";
import { DEPRECATED_API_BASE_URL, CHAT_API_BASE_URL } from "./constants";
import { queryKeys } from "./query-keys";
import { eventEmitter } from "@/lib/event";

export interface ApiClientOptions {
  baseURL?: string;
  baseURLNgrok?: string;
  apiPrefix?: string;
  defaultHeaders?: Record<string, string>;
  includeAuth?: boolean;
}

export interface OpenApiEvent {
  event: string;
  data: string;
}

export type ConversationTitleUpdatedEvent = {
  type: "conversation.title.updated";
  conversation_title?: string;
}

export class ApiClient {
  protected baseURLV1: string;
  protected baseURLV2: string;
  protected defaultHeaders: Record<string, string>;
  protected includeAuth: boolean;
  protected openAIClient: OpenAI;

  constructor(options: ApiClientOptions = {}) {
    const {
      baseURL = DEPRECATED_API_BASE_URL,
      baseURLNgrok = CHAT_API_BASE_URL,
      apiPrefix = "/api",
      defaultHeaders = {},
      includeAuth = true,
    } = options;
    const openAIToken = localStorage.getItem(LOCAL_STORAGE_KEYS.TOKEN);

    this.baseURLV1 = `${baseURL}${apiPrefix}`;
    this.baseURLV2 = `${baseURLNgrok}/v1`;
    this.defaultHeaders = defaultHeaders;
    this.includeAuth = includeAuth;
    this.openAIClient = new OpenAI({
      baseURL: `${baseURLNgrok}/v1`,
      apiKey: openAIToken ?? "",
      dangerouslyAllowBrowser: true,
    });
  }

  protected async request<T>(
    endpoint: string,
    options: RequestInit & {
      apiVersion?: "v1" | "v2";
      withoutHeaders?: boolean;
    } = {}
  ): Promise<T> {
    try {
      const headers: Record<string, string> = options.withoutHeaders
        ? { "ngrok-skip-browser-warning": "1000" }
        : {
            ...this.defaultHeaders,
            "ngrok-skip-browser-warning": "1000",
            ...((options.headers as Record<string, string>) || {}),
          };

      if (this.includeAuth) {
        const token = localStorage.getItem(LOCAL_STORAGE_KEYS.TOKEN);
        if (token) {
          headers.Authorization = `Bearer ${token}`;
        } else {
          throw new Error(`No token found, ${endpoint} request aborted`);
        }
      }
      const baseURL = options.apiVersion === "v2" ? this.baseURLV2 : this.baseURLV1;
      const response = await fetch(`${baseURL}${endpoint}`, {
        ...options,
        headers,
      });

      if (!response.ok) {
        const error = await response.json();
        if (response.status === 401) {
          eventEmitter.emit('logout');
        }

        throw error;
      }

      if (response.status === 204) {
        return {} as T; // Return empty object for 204 No Content
      }

      return await response.json();
    } catch (err) {
      console.error(err);
      // biome-ignore lint/suspicious/noExplicitAny: explanation
      throw (err as any)?.detail || err || "An unknown error occurred";
    }
  }

  protected async get<T>(endpoint: string, options: RequestInit & { apiVersion?: "v1" | "v2" } = {}): Promise<T> {
    return this.request<T>(endpoint, {
      ...options,
      method: "GET",
      apiVersion: options.apiVersion || "v1",
    });
  }

  protected async post<T>(
    endpoint: string,
    body?: unknown,
    options: RequestInit & {
      apiVersion?: "v1" | "v2";
      stream?: boolean;
      withoutHeaders?: boolean;
    } = {}
  ): Promise<T> {
    const requestOptions: RequestInit = {
      ...options,
      method: "POST",
    };

    if (body !== undefined) {
      if (body instanceof FormData) {
        requestOptions.body = body;
      } else {
        requestOptions.body = JSON.stringify(body);
      }
    }

    return this.request<T>(endpoint, {
      ...requestOptions,
      apiVersion: options.apiVersion || "v1",
      withoutHeaders: options.withoutHeaders || false,
    });
  }

  protected async stream(
    endpoint: string,
    body?: unknown,
    options: RequestInit & {
      apiVersion?: "v1" | "v2";
      queryClient?: QueryClient;
    } = {}
  ): Promise<void> {
    const requestOptions: RequestInit = {
      ...options,
      method: "POST",
    };

    if (body !== undefined) {
      if (body instanceof FormData) {
        requestOptions.body = body;
      } else {
        requestOptions.body = JSON.stringify(body);
      }
    }
    try {
      const headers: Record<string, string> = {
        ...this.defaultHeaders,
        "ngrok-skip-browser-warning": "1000",
        ...((options.headers as Record<string, string>) || {}),
      };

      if (this.includeAuth) {
        const token = localStorage.getItem(LOCAL_STORAGE_KEYS.TOKEN);
        if (token) {
          headers.Authorization = `Bearer ${token}`;
        } else {
          throw new Error("No token found");
        }
      }
      const baseURL = options.apiVersion === "v2" ? this.baseURLV2 : this.baseURLV1;
      const response = await fetch(`${baseURL}${endpoint}`, {
        ...requestOptions,
        headers,
      });
      if (!response.body) {
        throw new Error("ReadableStream not supported in this browser.");
      }

      if (!response.ok) {
        const error = await response.json();
        if (response.status === 401) {
          eventEmitter.emit('logout');
        }
        throw error;
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      const parser = createParser({
        onEvent: onParse,
      });

      async function onParse(event: EventSourceMessage) {
        if (!options.queryClient) return;
        const data: Responses.ResponseStreamEvent | ConversationTitleUpdatedEvent =
          JSON.parse(event.data);

        const conversationId = (body as { conversation?: string })?.conversation || "";

        function updateConversationData(updater: (draft: Conversation) => void, setOptions?: { updatedAt?: number }) {
          options.queryClient?.setQueryData(
            ["conversation", conversationId],
            (old: Conversation) =>
              produce(old, (draft) => {
                updater(draft);
                (draft as Conversation & { lastUpdatedAt?: number }).lastUpdatedAt = Date.now();
              }),
            setOptions
          );
        }

        const model = (body as { model?: string })?.model || "";

        switch (data.type) {
          case "response.output_text.delta":
            updateConversationData(
              (draft) => {
                const currentConversationData = draft.data?.find((item) => item.id === data.item_id);
                if (
                  currentConversationData?.type === ConversationTypes.MESSAGE &&
                  currentConversationData.role === ConversationRoles.ASSISTANT
                ) {
                  if (!currentConversationData.content?.length) {
                    currentConversationData.content = [
                      {
                        type: "output_text",
                        text: data.delta,
                        annotations: [],
                      },
                    ];
                  } else {
                    const firstItem = currentConversationData.content[0];
                    if (firstItem.type === "output_text") {
                      firstItem.text = (firstItem.text || "") + data.delta;
                    }
                  }
                }
              },
              {
                updatedAt: Date.now(),
              }
            );
            break;
          case "response.output_item.done":
            updateConversationData((draft) => {
              const currentConversationData = draft.data?.find((item) => item.id === data.item.id);
              switch (data.item.type) {
                case "message":
                  if (currentConversationData && currentConversationData.type === ConversationTypes.MESSAGE) {
                    const statusMap: Record<string, "completed" | "failed" | "pending"> = {
                      in_progress: "pending",
                      completed: "completed",
                      incomplete: "failed",
                    };
                    currentConversationData.status = statusMap[data.item.status] || "pending";

                    if (data.item.content && Array.isArray(data.item.content)) {
                      currentConversationData.content = data.item.content.map((item: unknown): ContentItem => {
                        if (typeof item === "object" && item !== null && "type" in item) {
                          if (item.type === "output_text") {
                            return {
                              type: "output_text",
                              text: "text" in item ? String(item.text) : "",
                              annotations:
                                "annotations" in item && Array.isArray(item.annotations) ? item.annotations : [],
                            };
                          }
                        }
                        return { type: "output_text", text: "" };
                      });
                    }
                  }
                  break;
                case "reasoning":
                  draft.data = draft.data?.filter((item) => item.id !== data.item.id);
                  break;
                case "web_search_call":
                  if (currentConversationData && currentConversationData.type === ConversationTypes.WEB_SEARCH_CALL) {
                    const statusMap: Record<string, "completed" | "failed" | "pending"> = {
                      in_progress: "pending",
                      completed: "completed",
                      incomplete: "failed",
                    };
                    currentConversationData.status = statusMap[data.item.status] || "pending";
                  }
                  break;
                default:
                  break;
              }
            });
            break;
          case "response.output_item.added":
            updateConversationData((draft) => {
              const prevMessage = draft.data?.find((item) => item.id === draft.last_id);
              switch (data.item.type) {
                case "reasoning":
                  // Reasoning items are not in the new interfaces, skip them
                  break;
                case "web_search_call": {
                  draft.last_id = data.item.id;
                  const extendedData = data.item as Responses.ResponseFunctionWebSearch & {
                    action: SearchAction;
                    created_at: number;
                    response_id: string;
                  };
                  const webSearchItem: ConversationWebSearchCall = {
                    id: data.item.id,
                    type: ConversationTypes.WEB_SEARCH_CALL,
                    response_id: extendedData.response_id,
                    next_response_ids: [],
                    created_at: extendedData.created_at,
                    status: "pending",
                    role: ConversationRoles.ASSISTANT,
                    action: extendedData.action,
                    model,
                  };
                  draft.data = [...(draft.data ?? []), webSearchItem];
                  break;
                }
                case "message": {
                  if (prevMessage?.status === "pending") {
                    break;
                  }
                  const extendedData = data.item as Responses.ResponseOutputMessage & {
                    created_at: number;
                    response_id: string;
                  };
                  const messageItem: ConversationModelOutput = {
                    id: data.item.id,
                    type: ConversationTypes.MESSAGE,
                    response_id: extendedData.response_id,
                    next_response_ids: [],
                    created_at: extendedData.created_at,
                    status: "pending",
                    role: ConversationRoles.ASSISTANT,
                    content: [],
                    model,
                  };
                  draft.data = [...(draft.data ?? []), messageItem];
                  draft.last_id = data.item.id;
                  break;
                }
                default:
                  break;
              }
            });
            break;
          case "conversation.title.updated": {
            const title = data.conversation_title;
            console.log('Received conversation title updated event:', data);

            // FALLBACK_CONVERSATION_TITLE is the fallback title returned by the server,
            // which means probably the title generation failed, so we don't update the title.
            if (title && title !== FALLBACK_CONVERSATION_TITLE) {
              // Update the detail cache
              updateConversationData((draft) => {
                draft.metadata = {
                  ...(draft.metadata ?? {}),
                  title,
                };
              });

              // Update the list cache
              options.queryClient?.setQueryData<ConversationInfo[]>(
                queryKeys.conversation.all,
                (oldConversations = []) =>
                  oldConversations.map((conversation) =>
                    conversation.id === conversationId
                      ? {
                          ...conversation,
                          metadata: {
                            ...(conversation.metadata ?? {}),
                            title,
                          },
                        }
                      : conversation
                  )
              );
            }
            break;
          }
        }
      }

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        parser.feed(chunk);
      }

      const currentChatIdFromLocation = location.pathname.split("/").pop();

      const bodyConversationId = (body as { conversation?: string })?.conversation ?? "";
      if (currentChatIdFromLocation !== bodyConversationId) {
        const conversationsData = options.queryClient?.getQueryData<ConversationInfo[]>(queryKeys.conversation.all);
        const conversationData = conversationsData?.find((conversation) => conversation.id === bodyConversationId);
        if (conversationData) {
          toast.success(`Response completed for ${conversationData.metadata.title}`);
        } else {
          toast.success(`Response completed for ${currentChatIdFromLocation}`);
        }
      }
    } catch (err) {
      console.error(err);
      // biome-ignore lint/suspicious/noExplicitAny: explanation
      throw (err as any)?.detail || err || "An unknown error occurred";
    }
  }
  protected async put<T>(endpoint: string, body?: unknown, options: RequestInit = {}): Promise<T> {
    const requestOptions: RequestInit = {
      ...options,
      method: "PUT",
    };

    if (body !== undefined) {
      if (body instanceof FormData) {
        requestOptions.body = body;
      } else {
        requestOptions.body = JSON.stringify(body);
      }
    }

    return this.request<T>(endpoint, requestOptions);
  }

  protected async delete<T>(
    endpoint: string,
    options: RequestInit & { apiVersion?: "v1" | "v2"; stream?: boolean } = {}
  ): Promise<T> {
    return this.request<T>(endpoint, {
      ...options,
      method: "DELETE",
      apiVersion: options.apiVersion || "v1",
    });
  }

  protected async patch<T>(endpoint: string, body?: unknown, options: RequestInit = {}): Promise<T> {
    const requestOptions: RequestInit = {
      ...options,
      method: "PATCH",
    };

    if (body !== undefined) {
      if (body instanceof FormData) {
        requestOptions.body = body;
      } else {
        requestOptions.body = JSON.stringify(body);
      }
    }

    return this.request<T>(endpoint, requestOptions);
  }
}
