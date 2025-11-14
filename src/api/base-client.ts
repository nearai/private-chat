import type { QueryClient } from "@tanstack/react-query";
import { createParser, type EventSourceMessage } from "eventsource-parser";
import { produce } from "immer";
import OpenAI from "openai";
import type { Responses } from "openai/resources/responses/responses.mjs";
import { toast } from "sonner";
import { LOCAL_STORAGE_KEYS } from "@/lib/constants";
import type { Conversation, ConversationInfo } from "@/types";
import { TEMP_API_BASE_URL, TEMP_API_BASE_URL_NGROK } from "./constants";
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
      baseURL = TEMP_API_BASE_URL,
      baseURLNgrok = TEMP_API_BASE_URL_NGROK,
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

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      const parser = createParser({
        onEvent: onParse,
      });

      function onParse(event: EventSourceMessage) {
        if (!options.queryClient) return;
        const data: Responses.ResponseStreamEvent = JSON.parse(event.data);
        const conversationId = (body as { conversation?: string })?.conversation || "";
        const streamModel = (body as { model?: string })?.model;

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

        switch (data.type) {
          case "response.output_text.delta":
            updateConversationData(
              (draft) => {
                const currentConversationData = draft.data?.find((item) => item.id === data.item_id);
                if (currentConversationData?.type === "message") {
                  if (!currentConversationData.content?.length) {
                    currentConversationData.content = [
                      {
                        type: "output_text",
                        text: data.delta,
                        annotations: [],
                      },
                    ];
                  } else {
                    if (currentConversationData.content[0].type === "output_text") {
                      currentConversationData.content[0].text += data.delta;
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
                  if (currentConversationData) {
                    currentConversationData.status = data.item.status;
                  }
                  if (currentConversationData?.type === "message") {
                    currentConversationData.content = data.item.content;
                    // Copy model field if available in the completed item, otherwise use stream body model as fallback
                    if ("model" in data.item && data.item.model) {
                      (currentConversationData as { model?: string }).model = data.item.model as string;
                    } else if (streamModel && !("model" in currentConversationData && currentConversationData.model)) {
                      (currentConversationData as { model?: string }).model = streamModel;
                    }
                    // Copy response_id field if available (for assistant messages)
                    if ("response_id" in data.item && data.item.response_id) {
                      (currentConversationData as { response_id?: string }).response_id = data.item
                        .response_id as string;
                    }
                  }
                  break;
                case "reasoning":
                case "web_search_call":
                  draft.data = draft.data?.filter((item) => item.id !== data.item.id);
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
                  draft.last_id = data.item.id;
                  draft.data = [
                    ...(draft.data ?? []),
                    {
                      id: data.item.id,
                      type: "reasoning",
                      summary: data.item.summary,
                    },
                  ];
                  break;
                case "web_search_call":
                  draft.last_id = data.item.id;
                  draft.data = [
                    ...(draft.data ?? []),
                    {
                      id: data.item.id,
                      type: "web_search_call",
                      status: "completed",
                    } as typeof data.item,
                  ];
                  break;
                case "message": {
                  if (prevMessage?.status === "in_progress") {
                    break;
                  }
                  // Set model from stream body if available, or from data.item if present
                  const model = streamModel
                    ? streamModel
                    : "model" in data.item && data.item.model
                      ? data.item.model
                      : undefined;
                  draft.data = [
                    ...(draft.data ?? []),
                    {
                      id: data.item.id,
                      type: "message",
                      role: "assistant",
                      status: "in_progress",
                      content: [
                        {
                          type: "output_text",
                          text: "",
                          annotations: [],
                        },
                      ],
                      model,
                    } as typeof data.item,
                  ];
                  draft.last_id = data.item.id;
                  break;
                }
                default:
                  break;
              }
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
