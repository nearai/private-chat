import { NearConnector } from "@hot-labs/near-connect";
import { useQueryClient } from "@tanstack/react-query";
import { fromHotConnect, generateNonce, Near } from "near-kit";
import type React from "react";
import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router";
import { toast } from "sonner";
import { authClient } from "@/api/auth/client";
import { useConfig } from "@/api/config/queries";
import { queryKeys } from "@/api/query-keys";
import { usersClient } from "@/api/users/client";
import CheckIcon from "@/assets/icons/check-icon.svg?react";
import GitHubIcon from "@/assets/icons/github-icon.svg?react";
import GoogleIcon from "@/assets/icons/google-icon.svg?react";
import NearAIIcon from "@/assets/icons/near-ai.svg?react";
import NearIcon from "@/assets/icons/near-icon-green.svg?react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib";
import { LOCAL_STORAGE_KEYS } from "@/lib/constants";
import { posthogOauthLogin, posthogOauthSignup } from "@/lib/posthog";
import type { OAuth2Provider } from "@/types";
import { getDesktopOAuthCallbackUrl, isTauri, listenForDesktopOAuth } from "@/utils/desktop";
import Spinner from "../components/common/Spinner";
import { APP_ROUTES } from "./routes";
import { NEAR_LOGIN_URL } from "@/api/constants";

const TERMS_VERSION = "V1";

type OAuthCompleteEvent = {
  token: string;
  sessionId: string;
  isNewUser: boolean;
};

const OAUTH_STORAGE_PREFIX = "desktop-oauth-channel:";
const buildOAuthChannelStorageKey = (channelId: string) => `${OAUTH_STORAGE_PREFIX}${channelId}`;

const AuthPage: React.FC = () => {
  const { data: config } = useConfig();
  const queryClient = useQueryClient();
  const [searchParams] = useSearchParams();
  const connectorRef = useRef<NearConnector | null>(null);
  const oauthChannelRef = useRef<BroadcastChannel | null>(null);
  const storageListenerRef = useRef<((event: StorageEvent) => void) | null>(null);
  const desktopOAuthUnlistenRef = useRef<(() => void) | null>(null);
  const activeChannelIdRef = useRef<string | null>(null);

  const token = searchParams.get("token");
  const sessionId = searchParams.get("session_id");
  const isNewUser = searchParams.get("is_new_user") === "true";
  const oauthChannelParam = searchParams.get("oauth_channel");
  const redirectParam = searchParams.get("redirect");

  // Save redirect parameter to localStorage for use after auth completes
  useEffect(() => {
    if (redirectParam) {
      localStorage.setItem(LOCAL_STORAGE_KEYS.REDIRECT_AFTER_LOGIN, redirectParam);
    }
  }, [redirectParam]);

  const [agreedTerms, setAgreedTerms] = useState(
    localStorage.getItem(LOCAL_STORAGE_KEYS.AGREED_TERMS) === TERMS_VERSION
  );
  const [showCloseTabMessage, setShowCloseTabMessage] = useState(false);
  const navigate = useNavigate();
  const checkAgreeTerms = () => {
    if (!agreedTerms) {
      toast.error("You must agree to the Terms of Service, Privacy Policy and Cookie Policy to proceed.");
      return false;
    }
    return true;
  };

  const completeLogin = useCallback(
    async (userToken: string, userSessionId: string, newUser: boolean) => {
      localStorage.setItem(LOCAL_STORAGE_KEYS.TOKEN, userToken);
      localStorage.setItem(LOCAL_STORAGE_KEYS.SESSION, userSessionId);
      queryClient.invalidateQueries({ queryKey: queryKeys.models.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.users.userData });

      try {
        const u = await usersClient.getUserData();
        if (u) {
          const provider = u.linked_accounts?.[0]?.provider ?? "near";
          if (newUser) {
            posthogOauthSignup(u.user.id, provider);
          } else {
            posthogOauthLogin(u.user.id, provider);
          }
        }
      } catch (error) {
        console.error("Failed to fetch user data for tracking:", error);
      }
    },
    [queryClient]
  );

  const cleanupOAuthChannel = useCallback(() => {
    if (oauthChannelRef.current) {
      oauthChannelRef.current.close();
      oauthChannelRef.current = null;
    }
    if (storageListenerRef.current) {
      window.removeEventListener("storage", storageListenerRef.current);
      storageListenerRef.current = null;
    }
    if (desktopOAuthUnlistenRef.current) {
      desktopOAuthUnlistenRef.current();
      desktopOAuthUnlistenRef.current = null;
    }
    if (activeChannelIdRef.current) {
      try {
        localStorage.removeItem(buildOAuthChannelStorageKey(activeChannelIdRef.current));
      } catch (error) {
        console.warn("Failed to clear OAuth storage cache:", error);
      }
      activeChannelIdRef.current = null;
    }
  }, []);

  const getRedirectPath = useCallback(() => {
    const savedRedirect = localStorage.getItem(LOCAL_STORAGE_KEYS.REDIRECT_AFTER_LOGIN);
    if (savedRedirect) {
      localStorage.removeItem(LOCAL_STORAGE_KEYS.REDIRECT_AFTER_LOGIN);
      return savedRedirect;
    }
    return APP_ROUTES.HOME;
  }, []);

  const finalizeOAuth = useCallback(
    (payload: OAuthCompleteEvent) => {
      cleanupOAuthChannel();
      completeLogin(payload.token, payload.sessionId, payload.isNewUser)
        .then(() => navigate(getRedirectPath(), { replace: true }))
        .catch((error) => {
          console.error("Failed to finalize OAuth login:", error);
          toast.error("Failed to complete login. Please try again.");
        });
    },
    [cleanupOAuthChannel, completeLogin, navigate, getRedirectPath]
  );

  const startOAuthChannelListener = useCallback(
    async (channelId: string) => {
      cleanupOAuthChannel();
      activeChannelIdRef.current = channelId;

      const handlePayload = (payload: OAuthCompleteEvent) => finalizeOAuth(payload);

      if (typeof window.BroadcastChannel === "function") {
        try {
          const channel = new BroadcastChannel(channelId);
          oauthChannelRef.current = channel;
          channel.onmessage = (event) => {
            handlePayload(event.data as OAuthCompleteEvent);
          };
        } catch (error) {
          console.error("Failed to create OAuth BroadcastChannel:", error);
        }
      }

      const storageListener = (event: StorageEvent) => {
        if (
          event.key === buildOAuthChannelStorageKey(channelId) &&
          typeof event.newValue === "string" &&
          event.newValue.length > 0
        ) {
          try {
            const parsed = JSON.parse(event.newValue) as OAuthCompleteEvent;
            handlePayload(parsed);
          } catch (error) {
            console.error("Failed to parse OAuth payload from storage:", error);
          }
        }
      };
      window.addEventListener("storage", storageListener);
      storageListenerRef.current = storageListener;

      if (isTauri()) {
        try {
          const unlisten = await listenForDesktopOAuth((payload) => {
            if (payload.oauthChannel && payload.oauthChannel !== channelId) {
              return;
            }
            if (!payload.token || !payload.sessionId) {
              console.warn("Received incomplete OAuth payload from desktop callback:", payload);
              return;
            }
            handlePayload({
              token: payload.token,
              sessionId: payload.sessionId,
              isNewUser: Boolean(payload.isNewUser),
            });
          });
          desktopOAuthUnlistenRef.current = unlisten;
        } catch (error) {
          console.error("Failed to subscribe to desktop OAuth bridge:", error);
        }
      }
    },
    [cleanupOAuthChannel, finalizeOAuth]
  );

  useEffect(() => () => cleanupOAuthChannel(), [cleanupOAuthChannel]);

  const openExternalOAuthUrl = async (url: string) => {
    if (!isTauri()) return false;

    try {
      const { open } = await import("@tauri-apps/plugin-shell");
      await open(url);
      return true;
    } catch (pluginError) {
      console.error("Tauri shell plugin open failed:", pluginError);
      const tauriGlobal = (window as typeof window & {
        __TAURI__?: {
          shell?: { open: (path: string) => Promise<void> };
          core?: { invoke: (cmd: string, args?: Record<string, unknown>) => Promise<unknown> };
        };
      }).__TAURI__;

      try {
        if (tauriGlobal?.shell?.open) {
          await tauriGlobal.shell.open(url);
          return true;
        }

        if (tauriGlobal?.core?.invoke) {
          await tauriGlobal.core.invoke("plugin:shell|open", { path: url });
          return true;
        }
      } catch (fallbackError) {
        console.error("Tauri core fallback open failed:", fallbackError);
      }
    }

    return false;
  };

  const handleOAuthLogin = async (provider: OAuth2Provider) => {
    if (!checkAgreeTerms()) return;

    if (isTauri()) {
      try {
        const channelId = crypto.randomUUID();
        await startOAuthChannelListener(channelId);
        const callbackUrl = await getDesktopOAuthCallbackUrl();
        const popupUrl = authClient.getOAuthUrl(provider, callbackUrl, { oauthChannel: channelId });
        const openedExternally = await openExternalOAuthUrl(popupUrl);
        if (!openedExternally) {
          const openedWindow = window.open(popupUrl, "_blank", "noopener,noreferrer");
          if (!openedWindow) throw new Error("Unable to open browser window");
        }
        toast.message("Continue the sign-in process in your browser.");
      } catch (error) {
        console.error("Failed to start OAuth in browser:", error);
        cleanupOAuthChannel();
        toast.error("Unable to open the browser for login. Please try again.");
      }
      return;
    }

    authClient.oauth2SignIn(provider);
  };

  const handleNearLogin = async () => {
    if (!checkAgreeTerms()) return;
    if (!config) return;

    if (isTauri()) {
      try {
        const channelId = crypto.randomUUID();
        await startOAuthChannelListener(channelId);
        const callbackUrl = await getDesktopOAuthCallbackUrl();
        
        // Construct the URL for the new NearLogin page
        const nearLoginUrl = new URL(APP_ROUTES.NEAR_LOGIN, NEAR_LOGIN_URL);
        nearLoginUrl.searchParams.set("frontend_callback", callbackUrl);
        nearLoginUrl.searchParams.set("oauth_channel", channelId);

        const openedExternally = await openExternalOAuthUrl(nearLoginUrl.toString());
        if (!openedExternally) {
          const openedWindow = window.open(nearLoginUrl.toString(), "_blank", "noopener,noreferrer");
          if (!openedWindow) throw new Error("Unable to open browser window");
        }
        toast.message("Continue the sign-in process in your browser.");
      } catch (error) {
        console.error("Failed to start NEAR login in browser:", error);
        cleanupOAuthChannel();
        toast.error("Unable to open the browser for NEAR login. Please try again.");
      }
      return;
    }

    try {
      const connector = connectorRef.current ?? new NearConnector({ network: "mainnet" });
      connectorRef.current = connector;

      await connector.connect();

      const near = new Near({
        network: "mainnet",
        wallet: fromHotConnect(connector),
      });

      const nonce = generateNonce();
      const recipient = window.location.host;
      const message = `Sign in to ${config.name}`;

      const signedMessage = await near.signMessage({ message, recipient, nonce });
      const response = await authClient.sendNearAuth(signedMessage, { message, nonce, recipient });

      await completeLogin(response.token, response.session_id, response.is_new_user);
      navigate(getRedirectPath(), { replace: true });
    } catch (error) {
      console.error("NEAR login failed:", error);
      toast.error("Failed to connect to NEAR wallet");
    }
  };

  useEffect(() => {
    if (!token) return;

    if (oauthChannelParam && !isTauri()) {
      try {
        const channel = new BroadcastChannel(oauthChannelParam);
        channel.postMessage({
          token,
          sessionId: sessionId ?? "",
          isNewUser,
        } satisfies OAuthCompleteEvent);
        channel.close();
        setShowCloseTabMessage(true);
      } catch (error) {
        console.error("Failed to notify desktop app about OAuth completion:", error);
        toast.error("Unable to complete login. Please return to the app.");
      }
      return;
    }

    const payload: OAuthCompleteEvent = {
      token,
      sessionId: sessionId ?? "",
      isNewUser,
    };

    if (oauthChannelParam) {
      let delivered = false;

      if (typeof window.BroadcastChannel === "function") {
        try {
          const channel = new BroadcastChannel(oauthChannelParam);
          channel.postMessage(payload);
          channel.close();
          delivered = true;
        } catch (error) {
          console.error("Failed to notify desktop app via BroadcastChannel:", error);
        }
      }

      try {
        localStorage.setItem(buildOAuthChannelStorageKey(oauthChannelParam), JSON.stringify(payload));
        // storage event will fire on the desktop window; remove our copy shortly after
        setTimeout(() => {
          try {
            localStorage.removeItem(buildOAuthChannelStorageKey(oauthChannelParam));
          } catch (removeError) {
            console.warn("Failed to cleanup OAuth storage cache:", removeError);
          }
        }, 250);
        delivered = true;
      } catch (storageError) {
        console.error("Failed to notify desktop app via storage:", storageError);
      }

      if (delivered) {
        setShowCloseTabMessage(true);
        return;
      }

      toast.error("Unable to notify the desktop app. Please return to the application and try again.");
      return;
    }

    completeLogin(payload.token, payload.sessionId, payload.isNewUser)
      .catch(() => toast.error("Failed to complete login."))
      .finally(() => navigate(getRedirectPath(), { replace: true }));
  }, [token, sessionId, isNewUser, navigate, completeLogin, oauthChannelParam, getRedirectPath]);

  const authContent = !config ? (
    <div className="flex h-full items-center justify-center">
      <Spinner />
    </div>
  ) : (
    <div className="relative">
      <div className="fixed z-50 m-10">
        <NearAIIcon className="h-8" />
      </div>

      <div className="flex justify-center bg-transparent">
        <div className="flex min-h-screen flex-col px-10 sm:max-w-md">
          {config.features?.auth_trusted_header || config.features?.auth === false ? (
            <div className="my-auto w-full pb-10">
              <div className="flex items-center justify-center gap-3 text-center font-semibold text-xl sm:text-2xl">
                <p className="text-center">Signing in to {config.name}</p>
                <div>
                  <Spinner />
                </div>
              </div>
            </div>
          ) : (
            <div className="my-auto w-full pb-10">
              <div className="mb-1 flex flex-col items-center justify-center">
                <p className="font-medium text-2xl">Sign in to {config.name}</p>

                {config.onboarding && (
                  <p className="mt-1 font-medium text-xs">
                    ⓘ {config.name} does not make any external connections, and your data stays securely on your locally
                    hosted server.
                  </p>
                )}
              </div>

              <hr className="my-4 h-px w-full border-0" />
              <div className="flex flex-col space-y-2">
                <Button className="rounded-full" onClick={() => handleOAuthLogin("google")} variant="secondary">
                  <GoogleIcon className="mr-3 h-6 w-6" />
                  <span className="flex min-w-40">Continue with Google</span>
                </Button>
                <Button onClick={() => handleOAuthLogin("github")} className="rounded-full" variant="secondary">
                  <GitHubIcon className="mr-3 h-6 w-6" />
                  <span className="flex min-w-40">Continue with GitHub</span>
                </Button>
                <Button onClick={handleNearLogin} className="rounded-full" variant="secondary">
                  <NearIcon className="mr-3 h-6 w-6" />
                  <span className="flex min-w-40">Continue with NEAR</span>
                </Button>
              </div>

              <label className="flex cursor-pointer items-start pt-10 text-xs">
                <input
                  className="sr-only"
                  type="checkbox"
                  checked={agreedTerms}
                  onChange={(e) => {
                    setAgreedTerms(e.target.checked);
                    localStorage.setItem(LOCAL_STORAGE_KEYS.AGREED_TERMS, e.target.checked ? TERMS_VERSION : "false");
                  }}
                />
                <div
                  className={cn(
                    "mt-0.5 flex h-4 w-4 items-center justify-center rounded shadow",
                    agreedTerms ? "bg-green-dark" : "bg-input"
                  )}
                >
                  <CheckIcon
                    className={cn("mt-px h-3 w-3 transition-opacity", agreedTerms ? "opacity-100" : "opacity-0")}
                  />
                </div>
                <div className="ml-2 inline-block flex-1 text-left">
                  {"By signing in, I agree to the "}
                  <a
                    className="underline hover:text-blue-600"
                    href="https://near.ai/terms-of-service/"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    Terms of Service
                  </a>
                  {" , "}
                  <a
                    className="underline hover:text-blue-600"
                    href="https://near.ai/privacy-policy/"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    Privacy Policy
                  </a>
                  {" and "}
                  <a
                    className="underline hover:text-blue-600"
                    href="https://near.ai/cookie-policy/"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    Cookie Policy.
                  </a>
                </div>
              </label>
            </div>
          )}
        </div>
      </div>
    </div>
  );

  if (showCloseTabMessage) {
    return (
      <div className="flex h-screen w-full flex-col items-center justify-center gap-3 px-6 text-center">
        <NearAIIcon className="h-10 w-10" />
        <p className="font-semibold text-lg">You can close this tab.</p>
        <p className="text-muted-foreground text-sm">Return to the NEAR AI application to continue.</p>
      </div>
    );
  }

  return authContent;
};

export default AuthPage;
