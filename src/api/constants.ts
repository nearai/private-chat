export const APP_NAME = "NEAR AI Private Chat";
export const FRONTEND_BASE_URL =
  typeof window !== "undefined" && window.location?.origin ? window.location.origin : "";
export const DEPRECATED_API_BASE_URL =
  import.meta.env.VITE_BACKEND_API_URL || "https://private-chat.near.ai";
export const CHAT_API_BASE_URL =
  import.meta.env.VITE_CHAT_API_URL || FRONTEND_BASE_URL || "https://private-chat-stg.near.ai";
export const POSTHOG_KEY = import.meta.env.VITE_PUBLIC_POSTHOG_KEY || "";
export const POSTHOG_HOST = import.meta.env.VITE_PUBLIC_POSTHOG_HOST || "";
export const DEFAULT_MODEL = import.meta.env.VITE_DEFAULT_MODEL || "zai-org/GLM-4.6";
