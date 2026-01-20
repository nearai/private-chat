export const APP_NAME = "NEAR AI Private Chat";
// TODO: remove DEPRECATED_API_BASE_URL from the project as there's no dependency on the legacy Private Chat any more
export const DEPRECATED_API_BASE_URL = (import.meta.env.VITE_DEPRECATED_API_URL || "https://private-chat-legacy.near.ai").replace(
  /\/+$/,
  ""
);
const browserOrigin = typeof window !== "undefined" ? window.location?.origin : undefined;
const runtimeOrigin =
  browserOrigin && !browserOrigin.includes("localhost")
    ? browserOrigin
    : undefined;

export const CHAT_API_BASE_URL = (
  import.meta.env.VITE_CHAT_API_URL ||
  runtimeOrigin ||
  "https://private.near.ai"
).replace(/\/+$/, "");

// NEAR login URL can be different from CHAT_API_BASE_URL in some deployment scenarios
// In development, use local dev server. In production, use the hosted app URL.
export const NEAR_LOGIN_URL = import.meta.env.MODE === "development"
  ? "http://localhost:3000" : (
    import.meta.env.VITE_NEAR_LOGIN_URL ||
    CHAT_API_BASE_URL
  ).replace(/\/+$/, "");
export const POSTHOG_KEY = import.meta.env.VITE_PUBLIC_POSTHOG_KEY || "";
export const POSTHOG_HOST = import.meta.env.VITE_PUBLIC_POSTHOG_HOST || "";

export const TEMP_RESPONSE_ID = "temp-response-id";
export const DEFAULT_MODEL = import.meta.env.VITE_DEFAULT_MODEL || "zai-org/GLM-4.6";
export const MODEL_FOR_TITLE_GENERATION = import.meta.env.VITE_MODEL_FOR_TITLE_GENERATION || "Qwen/Qwen3-30B-A3B-Instruct-2507";
export const NEAR_RPC_URL = import.meta.env.VITE_NEAR_RPC_URL || "https://free.rpc.fastnear.com";
