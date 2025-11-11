import type { QueryClient } from "@tanstack/react-query";
import { createParser, type EventSourceMessage } from "eventsource-parser";
import OpenAI from "openai";
import type { Responses } from "openai/resources/responses/responses.mjs";
import { LOCAL_STORAGE_KEYS } from "@/lib/constants";
import type { Conversation } from "@/types";
import { TEMP_API_BASE_URL, TEMP_API_BASE_URL_NGROK } from "./constants";

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
        const data: Responses.ResponseStreamEvent = JSON.parse(event.data);
        switch (data.type) {
          case "response.output_text.delta":
            options.queryClient?.setQueryData(
              ["conversation", (body as { conversation?: string })?.conversation || ""],
              (old: Conversation) => {
                const newData = { ...old };
                const currentConversationData = newData.data?.find((item) => item.id === data.item_id);
                if (currentConversationData?.type === "message") {
                  if (currentConversationData && !currentConversationData?.content?.length) {
                    currentConversationData.content = [
                      {
                        type: "output_text",
                        text: data.delta,
                        annotations: [],
                      },
                    ];
                  } else {
                    if (currentConversationData!.content[0].type === "output_text") {
                      currentConversationData!.content[0].text += data.delta;
                    }
                  }
                }
                return {
                  data: [...(newData.data ?? [])],
                  ...old,
                  lastUpdatedAt: Date.now(),
                };
              },
              {
                updatedAt: Date.now(),
              }
            );
            break;
          case "response.output_item.done":
            options.queryClient?.setQueryData(
              ["conversation", (body as { conversation?: string })?.conversation || ""],
              (old: Conversation) => {
                const newData: Conversation = { ...old };
                const currentConversationData = newData.data?.find((item) => item.id === data.item.id);
                if (data.item.type === "message" && currentConversationData) {
                  currentConversationData.status = data.item.status;
                }
                if (currentConversationData?.type === "message" && data.item.type === "message") {
                  currentConversationData.content = data.item.content;
                }
                if (data.item.type === "reasoning" || data.item.type === "web_search_call") {
                  newData.data = newData.data?.filter((item) => item.id === data.item.id);
                }

                return {
                  data: [...(newData.data ?? [])],
                  ...old,
                  lastUpdatedAt: Date.now(),
                };
              }
            );
            break;
          case "response.output_item.added":
            options.queryClient?.setQueryData(
              ["conversation", (body as { conversation?: string })?.conversation || ""],
              (old: Conversation) => {
                if (data.item.type === "reasoning") {
                  return {
                    ...old,
                    last_id: data.item.id,
                    data: [
                      ...(old.data ?? []),
                      {
                        id: data.item.id,
                        type: "reasoning",
                        summary: data.item.summary,
                      },
                    ],
                    lastUpdatedAt: Date.now(),
                  };
                } else if (data.item.type === "web_search_call") {
                  return {
                    ...old,
                    last_id: data.item.id,
                    data: [
                      ...(old.data ?? []),
                      {
                        id: data.item.id,
                        type: "web_search_call",
                      },
                    ],
                    lastUpdatedAt: Date.now(),
                  };
                } else if (data.item.type === "message") {
                  return {
                    ...old,
                    data: [
                      ...(old?.data ?? []),
                      {
                        id: data.item.id,
                        type: "message",
                        role: "assistant",
                        content: [
                          {
                            type: "output_text",
                            text: "",
                            annotations: [],
                          },
                        ],
                      },
                    ],
                    last_id: data.item.id,
                  };
                }
              }
            );
            break;
        }
      }

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        parser.feed(chunk);
      }

      console.log("✅ Stream finished");
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
