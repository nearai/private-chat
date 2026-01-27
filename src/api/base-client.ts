import type { QueryClient } from "@tanstack/react-query";
import { createParser, type EventSourceMessage } from "eventsource-parser";
import OpenAI from "openai";
import type { Responses } from "openai/resources/responses/responses.mjs";
import { toast } from "sonner";
import { MessageStatus } from "@/lib";
import { FALLBACK_CONVERSATION_TITLE, LOCAL_STORAGE_KEYS } from "@/lib/constants";
import { isOfflineError, isOnline } from "@/lib/network";
import { eventEmitter } from "@/lib/event";
import { buildConversationEntry, useConversationStore, type ConversationStoreState } from "@/stores/useConversationStore";
import type {
  ConversationInfo,
  ConversationModelOutput,
  ConversationReasoning,
  ConversationWebSearchCall,
  SearchAction,
} from "@/types";
import { ConversationRoles, ConversationTypes } from "@/types";
import type { ContentItem } from "@/types/openai";
import { CHAT_API_BASE_URL, DEPRECATED_API_BASE_URL, TEMP_RESPONSE_ID } from "./constants";
import { queryKeys } from "./query-keys";
import { isTauri } from "@/utils/desktop";
import { generateMockAIResponseID } from "@/lib/utils/mock";

type FetchImplementation = typeof fetch;

let fetchPromise: Promise<FetchImplementation> | null = null;

const getBrowserFetch = (): FetchImplementation => {
  if (typeof window !== "undefined" && typeof window.fetch === "function") {
    return window.fetch.bind(window);
  }
  if (typeof globalThis.fetch === "function") {
    return globalThis.fetch.bind(globalThis);
  }
  throw new Error("Fetch API is unavailable in this environment.");
};

const getHttpClient = async (): Promise<FetchImplementation> => {
  if (!isTauri()) {
    return getBrowserFetch();
  }

  if (fetchPromise) {
    return fetchPromise;
  }

  fetchPromise = import("@tauri-apps/plugin-http")
    .then(({ fetch }) => fetch)
    .catch((error) => {
      console.warn("Falling back to browser fetch:", error);
      return getBrowserFetch();
    });

  return fetchPromise;
};

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
};

export type ConversationReasoningUpdatedEvent = {
  type: "response.reasoning.delta";
  item_id: string;
  delta: string;
};

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

    const normalizeUrl = (value: string) => value.replace(/\/+$/, "");
    const normalizePath = (value: string) => (value.startsWith("/") ? value : `/${value}`);

    this.baseURLV1 = `${normalizeUrl(baseURL)}${normalizePath(apiPrefix)}`;
    this.baseURLV2 = `${normalizeUrl(baseURLNgrok)}/v1`;
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
      ignore401Error?: boolean;
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
      if (!isOnline()) {
        throw { detail: "You are offline. Please check your internet connection.", status: 0, offline: true };
      }

      const baseURL = options.apiVersion === "v2" ? this.baseURLV2 : this.baseURLV1;
      const requestUrl = `${baseURL}${endpoint}`;
      const httpFetch = await getHttpClient();
      const response = await httpFetch(requestUrl, {
        ...options,
        headers,
      });

      const contentType = response.headers.get("content-type") || "";
      const isHtmlResponse = contentType.includes("text/html");

      if (!response.ok || isHtmlResponse) {
        let error: unknown;
        if (isHtmlResponse) {
          const text = await response.text().catch(() => "");
          error = {
            detail: `Received an HTML response from ${requestUrl}. This usually means the API base URL is pointing at the frontend instead of the backend. Check your VITE_DEPRECATED_API_URL and VITE_CHAT_API_URL settings.`,
            status: response.status,
            snippet: text ? text.slice(0, 200) : undefined,
          };
        } else if (contentType.includes("application/json")) {
          try {
            error = await response.json();
          } catch (parseError) {
            const text = await response.text().catch(() => "");
            error = { detail: text || (parseError as Error).message || response.statusText };
          }
        } else {
          const text = await response.text().catch(() => "");
          try {
            error = text ? JSON.parse(text) : { detail: response.statusText };
          } catch {
            error = { detail: text || response.statusText };
          }
        }
        if (response.status === 401) {
          if (!options.ignore401Error) {
            eventEmitter.emit("logout");
          }
        }

        throw error;
      }

      if (response.status === 204) {
        return {} as T; // Return empty object for 204 No Content
      }

      if (contentType.includes("application/json")) {
        return (await response.json()) as T;
      }
      const fallbackText = await response.text();
      try {
        return JSON.parse(fallbackText || "{}") as T;
      } catch {
        return { detail: fallbackText || response.statusText } as T;
      }
    } catch (err) {
      if (!isOfflineError(err)) {
        console.error(err);
      }
      // biome-ignore lint/suspicious/noExplicitAny: explanation
      throw (err as any)?.detail || err || "An unknown error occurred";
    }
  }

  protected async requestWithoutJson(
    endpoint: string,
    options: RequestInit & {
      apiVersion?: "v1" | "v2";
      withoutHeaders?: boolean;
    } = {}
  ): Promise<Response> {
    try {
      const headers: Record<string, string> = options.withoutHeaders
        ? {}
        : {
            ...this.defaultHeaders,
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

      return response;
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
      ignore401Error?: boolean;
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
      ignore401Error: options.ignore401Error || false,
    });
  }

  protected async stream(
    endpoint: string,
    body?: unknown,
    options: RequestInit & {
      apiVersion?: "v1" | "v2";
      queryClient?: QueryClient;
      onReaderReady?: (reader: ReadableStreamDefaultReader<Uint8Array>, abortController: AbortController) => void;
      onResponseCreated?: () => void;
    } = {}
  ): Promise<void> {
    const abortController = new AbortController();
    const requestOptions: RequestInit = {
      ...options,
      method: "POST",
      signal: abortController.signal,
    };
    let tempStreamId = "";
    const updateConversationData = useConversationStore.getState().updateConversation;
    
    function cleanupTempStreamId(draft: ConversationStoreState) {
      if (!tempStreamId) return;
      draft.conversation!.conversation.data = draft.conversation!.conversation.data?.filter(
        (item) => item.id !== tempStreamId
      );
      tempStreamId = "";
    }
    function updateFailedMessage(msg: string) {
      if (!tempStreamId) return;
      updateConversationData((draft) => {
        const tempStreamMsg = draft.conversation?.conversation.data?.find((item) => item.id === tempStreamId) as ConversationModelOutput;
        if (tempStreamMsg) {
          tempStreamMsg.status = "completed";
          tempStreamMsg.content = [
            {
              type: "output_text",
              text: msg,
              annotations: [],
            }
          ]
        }
        const { history, allMessages } = buildConversationEntry(
          draft.conversation!.conversation,
          draft.conversation!.lastResponseId
        );
        draft.conversation!.history = history;
        draft.conversation!.allMessages = allMessages;
        return draft;
      });
    }

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
      const requestUrl = `${baseURL}${endpoint}`;
      const httpFetch = await getHttpClient();
      const response = await httpFetch(requestUrl, {
        ...requestOptions,
        headers,
      });
      if (!response.body) {
        throw new Error("ReadableStream not supported in this browser.");
      }

      if (!response.ok) {
        const error = await response.json();
        if (response.status === 401) {
          eventEmitter.emit("logout");
        }
        throw error;
      }

      const reader = response.body.getReader();
      
      // Notify reader is ready for cancellation
      if (options.onReaderReady) {
        options.onReaderReady(reader, abortController);
      }
      const decoder = new TextDecoder();
      const parser = createParser({
        onEvent: onParse,
      });

      async function onParse(event: EventSourceMessage) {
        if (!options.queryClient) return;
        const data: Responses.ResponseStreamEvent | ConversationReasoningUpdatedEvent | ConversationTitleUpdatedEvent =
          JSON.parse(event.data);
        const model = (body as { model?: string })?.model || "";

        switch (data.type) {
          case "response.created":
            options.onResponseCreated?.();
            updateConversationData((draft) => {
              const tempUserMessage = draft.conversation?.conversation.data?.find(
                (item) => item.response_id === TEMP_RESPONSE_ID
              );

              if (tempUserMessage) {
                tempUserMessage.response_id = data.response.id;
                // mock ai msg
                tempStreamId = generateMockAIResponseID(data.response.id);
                const aiMessageItem: ConversationModelOutput = {
                  id: tempStreamId,
                  type: ConversationTypes.MESSAGE,
                  response_id: data.response.id,
                  next_response_ids: [],
                  created_at: Date.now(),
                  status: "pending",
                  role: ConversationRoles.ASSISTANT,
                  content: [],
                  model,
                };
                draft.conversation!.conversation.data = [
                  ...(draft.conversation!.conversation.data ?? []),
                  aiMessageItem,
                ];
                draft.conversation!.conversation.last_id = data.response.id;

                const { history, allMessages, lastResponseId, batches } = buildConversationEntry(
                  draft.conversation!.conversation,
                  data.response.id
                );
                draft.conversation!.history = history;
                draft.conversation!.allMessages = allMessages;
                draft.conversation!.lastResponseId = lastResponseId;
                draft.conversation!.batches = batches;
                //Order is important
                if (tempUserMessage.previous_response_id) {
                  const lastResponseParent = draft.conversation?.history.messages[tempUserMessage.previous_response_id];
                  const userInputMessage = draft.conversation?.conversation.data?.find(
                    (item) => item.id === lastResponseParent?.userPromptId
                  );
                  if (lastResponseParent) {
                    lastResponseParent.nextResponseIds = [
                      ...lastResponseParent.nextResponseIds,
                      data.response.id,
                    ].filter((id: string) => id !== TEMP_RESPONSE_ID);
                  }
                  // Optimistically associate the originating user input message with the new response ID

                  if (userInputMessage) {
                    userInputMessage.next_response_ids.push(data.response.id);
                  }
                }
              }
              return draft;
            });
            break;

          case "response.reasoning.delta":
            updateConversationData((draft) => {
              cleanupTempStreamId(draft);
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
              // Optimize adding content only on needed message
              draft.conversation!.allMessages = allMessages;

              return draft;
            });
            break;
          case "response.output_text.delta":
            updateConversationData((draft) => {
              cleanupTempStreamId(draft);
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
              // Optimize adding content only on needed message
              draft.conversation!.allMessages = allMessages;

              return draft;
            });
            break;
          case "response.output_item.done":
            updateConversationData((draft) => {
              cleanupTempStreamId(draft);
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
              return draft;
            });
            break;
          case "response.output_item.added":
            updateConversationData((draft) => {
              cleanupTempStreamId(draft);
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
          case "conversation.title.updated": {
            const title = data.conversation_title;

            // FALLBACK_CONVERSATION_TITLE is the fallback title returned by the server,
            // which means probably the title generation failed, so we don't update the title.
            // Conversation in zustand don't used to show title in sidebar, queryClient cache used for that.

            if (title && title !== FALLBACK_CONVERSATION_TITLE) {
              // Update the detail cache
              updateConversationData((draft) => {
                draft.conversation!.conversation.metadata = {
                  ...(draft.conversation!.conversation.metadata ?? {}),
                  title,
                };
                return draft;
              });
              options.queryClient?.setQueryData<ConversationInfo[]>(
                queryKeys.conversation.all,
                (oldConversations = []) =>
                  oldConversations.map((conversation) =>
                    conversation.id === (body as { conversation?: string })?.conversation
                      ? { ...conversation, metadata: { ...conversation.metadata, title } }
                      : conversation
                  )
              );
            }
            break;
          }
          case "response.completed": {
            updateConversationData((draft) => {
              const response = draft.conversation?.history.messages[data.response.id];
              if (response) {
                response.status = MessageStatus.COMPLETED;
              }
              return draft;
            });
            break;
          }
        }
      }

      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          const chunk = decoder.decode(value, { stream: true });
          parser.feed(chunk);
        }
      } catch (error) {
        // expected if the stream was cancelled
        if (error instanceof Error && error.name === "AbortError") {
          return;
        }
        throw error;
      } finally {
        // Release the reader lock
        reader.releaseLock();
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
      updateFailedMessage('Unable to generate response.');
    } catch (err) {
      console.error(err);
      const errMsg = (err as any)?.detail || err || "An unknown error occurred";
      updateFailedMessage(errMsg);
      // biome-ignore lint/suspicious/noExplicitAny: explanation
      throw errMsg;
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
