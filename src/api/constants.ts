export const APP_NAME = "NEAR AI Private Chat";
export const DEPRECATED_API_BASE_URL =
  import.meta.env.VITE_DEPRECATED_API_URL || "https://private-chat.near.ai";
export const CHAT_API_BASE_URL =
  import.meta.env.VITE_CHAT_API_URL || 
  (typeof window !== "undefined" && window.location?.origin) || 
  "https://private-chat-stg.near.ai";
export const POSTHOG_KEY = import.meta.env.VITE_PUBLIC_POSTHOG_KEY || "";
export const POSTHOG_HOST = import.meta.env.VITE_PUBLIC_POSTHOG_HOST || "";
export const DEFAULT_MODEL = import.meta.env.VITE_DEFAULT_MODEL || "zai-org/GLM-4.6";
