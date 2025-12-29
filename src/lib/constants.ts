export const LOCAL_STORAGE_KEYS = {
  TOKEN: "sessionToken",
  SESSION: "sessionId",
  CONVERSATIONS: "conversations",
  AGREED_TERMS: "agreedTerms",
  WELCOME_PAGE_PROMPT: "welcomePagePrompt",
  IMPORT_GUIDE_BANNER_CLOSED: "importGuideBannerClosed",
};

export const DEFAULT_SIGNING_ALGO = "ecdsa";

export const DEFAULT_CONVERSATION_TITLE = "New Conversation";
// The fallback title returned by the server if title generation failed
export const FALLBACK_CONVERSATION_TITLE = "Conversation";
export const TITLE_GENERATION_DELAY = 6000; // milliseconds

export const IMPORTED_MESSAGE_SIGNATURE_TIP = "Verification is not available for imported chats";

export const MOCK_MESSAGE_RESPONSE_ID_PREFIX = "mock_resp_";
export const RESPONSE_MESSAGE_CLASSNAME = "chat-response-message";
