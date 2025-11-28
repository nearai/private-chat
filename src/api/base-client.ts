import type { QueryClient } from "@tanstack/react-query";
import { createParser, type EventSourceMessage } from "eventsource-parser";
import OpenAI from "openai";
import type { Responses } from "openai/resources/responses/responses.mjs";
import { toast } from "sonner";
import { LOCAL_STORAGE_KEYS } from "@/lib/constants";
import { buildConversationEntry, useConversationStore } from "@/stores/useConversationStore";
import type {
  ConversationInfo,
  ConversationModelOutput,
  ConversationReasoning,
  ConversationWebSearchCall,
  SearchAction,
} from "@/types";
import { ConversationRoles, ConversationTypes } from "@/types";
import type { ContentItem } from "@/types/openai";
import { CHAT_API_BASE_URL, DEPRECATED_API_BASE_URL, TEMP_MESSAGE_ID, TEMP_RESPONSE_ID } from "./constants";
import { queryKeys } from "./query-keys";

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
          throw new Error("No token found");
        }
      }
      const baseURL = options.apiVersion === "v2" ? this.baseURLV2 : this.baseURLV1;
      const response = await fetch(`${baseURL}${endpoint}`, {
        ...options,
        headers,
      });

      if (!response.ok) {
        const error = await response.json();
        throw error;
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
        if (
          typeof body === "object" &&
          body !== null &&
          "previous_response_id" in body &&
          body.previous_response_id !== undefined &&
          "conversation" in body
        ) {
          const newBody = { ...body, conversation: undefined };
          requestOptions.body = JSON.stringify(newBody);
        } else {
          requestOptions.body = JSON.stringify(body);
        }
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

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      const parser = createParser({
        onEvent: onParse,
      });

      function onParse(event: EventSourceMessage) {
        if (!options.queryClient) return;
        const data:
          | Responses.ResponseStreamEvent
          | {
              type: "response.reasoning.delta";
              item_id: string;
              delta: string;
            } = JSON.parse(event.data);
        const updateConversationData = useConversationStore.getState().updateConversation;
        const model = (body as { model?: string })?.model || "";

        switch (data.type) {
          case "response.created":
            updateConversationData((draft) => {
              const tempUserMessage = draft.conversation?.conversation.data?.find(
                (item) => item.id === TEMP_MESSAGE_ID
              );

              if (tempUserMessage) {
                tempUserMessage.response_id = data.response.id;
                const lastResponseParentId =
                  draft.conversation?.history.messages[tempUserMessage.previous_response_id ?? ""]?.parentResponseId;
                if (lastResponseParentId) {
                  const lastResponseParent = draft.conversation?.history.messages[lastResponseParentId];
                  if (lastResponseParent) {
                    lastResponseParent.nextResponseIds = [
                      ...lastResponseParent.nextResponseIds,
                      data.response.id,
                    ].filter((id: string) => id !== TEMP_RESPONSE_ID);
                  }
                }
                const { history, allMessages, lastResponseId, batches } = buildConversationEntry(
                  draft.conversation!.conversation,
                  data.response.id
                );
                draft.conversation!.history = history;
                draft.conversation!.allMessages = allMessages;
                draft.conversation!.lastResponseId = lastResponseId;
                draft.conversation!.batches = batches;
              }
              return draft;
            });
            break;

          case "response.reasoning.delta":
            updateConversationData((draft) => {
              const currentConversationData = draft.conversation?.conversation.data?.find(
                (item) => item.id === data.item_id
              );
              if (currentConversationData?.type === ConversationTypes.REASONING) {
                currentConversationData.content = data.delta;
              }
              const { history, allMessages } = buildConversationEntry(
                draft.conversation!.conversation,
                draft.conversation!.lastResponseId
              );
              draft.conversation!.history = history;
              //Optimize adding content only on needed message
              draft.conversation!.allMessages = allMessages;
              console.log(
                "update with output_text.delta",
                history,
                history,
                history.messages[draft.conversation!.lastResponseId ?? ""].status
              );
              return draft;
            });
            break;
          case "response.output_text.delta":
            updateConversationData((draft) => {
              const currentConversationData = draft.conversation?.conversation.data?.find(
                (item) => item.id === data.item_id
              );
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
              const { history, allMessages } = buildConversationEntry(
                draft.conversation!.conversation,
                draft.conversation!.lastResponseId
              );
              draft.conversation!.history = history;
              //Optimize adding content only on needed message
              draft.conversation!.allMessages = allMessages;

              return draft;
            });
            break;
          case "response.output_item.done":
            updateConversationData((draft) => {
              const currentConversationData = draft.conversation?.conversation.data?.find(
                (item) => item.id === data.item.id
              );
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
                  //INVESTIGATE
                  draft.conversation!.conversation.data = draft.conversation!.conversation.data?.filter(
                    (item) => item.id !== data.item.id
                  );
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
              const { history, allMessages } = buildConversationEntry(
                draft.conversation!.conversation,
                draft.conversation!.lastResponseId
              );
              draft.conversation!.history = history;
              draft.conversation!.allMessages = allMessages;

              console.log(
                "update with output_item.added",
                history,
                allMessages,
                history.messages[draft.conversation!.lastResponseId ?? ""].status
              );
              return draft;
            });
            break;
          case "response.output_item.added":
            updateConversationData((draft) => {
              // const prevMessage = draft.conversation?.conversation.data?.find(
              //   (item) => item.id === draft.conversation?.conversation.last_id
              // );
              switch (data.item.type) {
                case "reasoning": {
                  draft.conversation!.conversation.last_id = data.item.id;
                  const extendedData = data.item as Responses.ResponseReasoningItem & {
                    created_at: number;
                    response_id: string;
                  };
                  const reasoningItem: ConversationReasoning = {
                    id: data.item.id,
                    type: ConversationTypes.REASONING,
                    response_id: extendedData.response_id,
                    next_response_ids: [],
                    created_at: extendedData.created_at,
                    status: "pending",
                    role: ConversationRoles.ASSISTANT,
                    content: "",
                    summary: "",
                    model,
                  };
                  draft.conversation!.conversation.data = [
                    ...(draft.conversation!.conversation.data ?? []),
                    reasoningItem,
                  ];
                  break;
                }
                case "web_search_call": {
                  draft.conversation!.conversation.last_id = data.item.id;
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
                  draft.conversation!.conversation.data = [
                    ...(draft.conversation!.conversation.data ?? []),
                    webSearchItem,
                  ];
                  break;
                }
                case "message": {
                  // if (prevMessage?.status === "pending") {
                  //   break;
                  // }
                  //INVESTIGATE
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
                  draft.conversation!.conversation.data = [
                    ...(draft.conversation!.conversation.data ?? []),
                    messageItem,
                  ];
                  draft.conversation!.conversation.last_id = data.item.id;
                  break;
                }
                default:
                  break;
              }
              const { history, allMessages } = buildConversationEntry(
                draft.conversation!.conversation,
                draft.conversation!.lastResponseId
              );
              draft.conversation!.history = history;
              draft.conversation!.allMessages = allMessages;
              return draft;
            });
            break;
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
