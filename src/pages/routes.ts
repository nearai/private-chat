const CHAT_ID = ":chatId";

const ADMIN_PREFIX = "/admin";

export const ADMIN_ROUTES = {
  ADMIN_USERS: `${ADMIN_PREFIX}/users`,
  ADMIN_EVALUATIONS: `${ADMIN_PREFIX}/evaluations`,
  ADMIN_FUNCTIONS: `${ADMIN_PREFIX}/functions`,
  ADMIN_SETTINGS: `${ADMIN_PREFIX}/settings`,
} as const;

export const APP_ROUTES = {
  HOME: "/",
  CHAT: `/c/${CHAT_ID}`,
  WELCOME: "/welcome",
  AUTH: "/auth/*",
  PLAYGROUND: "/playground",
  ADMIN: ADMIN_PREFIX,
  ...ADMIN_ROUTES,
} as const;

export const toChatRoute = (chatId: string) => APP_ROUTES.CHAT.replace(CHAT_ID, chatId);
