import { clearQueryCallbackCredentials, getQueryCallbackCredentials } from "@/lib/authCallback";
import { clearOAuthCodeFlow, consumeOAuthCodeFlow, prepareOAuthCodeFlow } from "@/lib/oauthCodeFlow";
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
import { setSessionCredentials, type SessionWriteOptions } from "@/lib/sessionCredentials";
import { LOCAL_STORAGE_KEYS } from "@/lib/constants";
import { posthogOauthLogin, posthogOauthSignup } from "@/lib/posthog";
import type { OAuth2Provider } from "@/types";
import { getDesktopOAuthCallbackUrl, isTauri, listenForDesktopOAuth } from "@/utils/desktop";
import Spinner from "../components/common/Spinner";
import { APP_ROUTES } from "./routes";
import { NEAR_LOGIN_URL } from "@/api/constants";

const TERMS_VERSION = "V2";

type OAuthCompleteEvent = {
  token: string;
  sessionId: string;
  isNewUser: boolean;
};

const AuthPage: React.FC = () => {
  const { data: config } = useConfig();
  const { token, sessionId, code } = getQueryCallbackCredentials();
  const queryClient = useQueryClient();
  const [searchParams] = useSearchParams();
  const connectorRef = useRef<NearConnector | null>(null);
  const desktopOAuthUnlistenRef = useRef<(() => void) | null>(null);
  const oauthCompletionStartedRef = useRef(false);
  const loginPendingRef = useRef(false);
  const desktopAttemptRef = useRef(0);
  const mountedRef = useRef(false);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      clearQueryCallbackCredentials();
    };
  }, []);

  const redirectParam = searchParams.get("redirect");
  const frontendStateParam = searchParams.get("state");
  const oauthChannelParam = searchParams.get("oauth_channel");
  const isNewUser = searchParams.get("is_new_user") === "true";
  const [showCloseTabMessage, setShowCloseTabMessage] = useState(false);

  // Save redirect parameter to localStorage for use after auth completes
  useEffect(() => {
    if (redirectParam) {
      localStorage.setItem(LOCAL_STORAGE_KEYS.REDIRECT_AFTER_LOGIN, redirectParam);
    }
  }, [redirectParam]);

  const [agreedTerms, setAgreedTerms] = useState(
    localStorage.getItem(LOCAL_STORAGE_KEYS.AGREED_TERMS) === TERMS_VERSION
  );
  const navigate = useNavigate();
  const checkAgreeTerms = () => {
    if (!agreedTerms) {
      toast.error("You must agree to the Terms of Service, Privacy Policy and Cookie Policy to proceed.");
      return false;
    }
    return true;
  };

  const completeLogin = useCallback(
    async (userToken: string, userSessionId: string, newUser: boolean, options?: SessionWriteOptions) => {
      // Consume legacy router credentials before publishing a reactive session.
      if (searchParams.has("token") || searchParams.has("session_id")) {
        const callbackParams = new URLSearchParams(searchParams);
        callbackParams.delete("token");
        callbackParams.delete("session_id");
        navigate(
          { pathname: window.location.pathname, search: callbackParams.toString(), hash: window.location.hash },
          { replace: true }
        );
      }
      if (!(await setSessionCredentials(userToken, userSessionId || null, options))) return false;
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
      return true;
    },
    [queryClient, navigate, searchParams]
  );

  const cleanupDesktopOAuthListener = useCallback(() => {
    if (desktopOAuthUnlistenRef.current) {
      desktopOAuthUnlistenRef.current();
      desktopOAuthUnlistenRef.current = null;
    }
  }, []);

  const getRedirectPath = useCallback(() => {
    const savedRedirect = localStorage.getItem(LOCAL_STORAGE_KEYS.REDIRECT_AFTER_LOGIN);
    return savedRedirect || APP_ROUTES.HOME;
  }, []);

  const clearRedirectPath = useCallback(() => {
    localStorage.removeItem(LOCAL_STORAGE_KEYS.REDIRECT_AFTER_LOGIN);
  }, []);

  const finalizeOAuth = useCallback(
    async (payload: OAuthCompleteEvent) => {
      cleanupDesktopOAuthListener();
      const redirectPath = getRedirectPath();
      const attempt = desktopAttemptRef.current;
      const installed = await completeLogin(payload.token, payload.sessionId, payload.isNewUser, {
        expectedToken: localStorage.getItem(LOCAL_STORAGE_KEYS.TOKEN),
        isCurrent: () => mountedRef.current && attempt === desktopAttemptRef.current,
      });
      if (installed && localStorage.getItem(LOCAL_STORAGE_KEYS.TOKEN) === payload.token) {
        navigate(redirectPath, { replace: true });
        clearRedirectPath();
      }
    },
    [cleanupDesktopOAuthListener, completeLogin, navigate, getRedirectPath, clearRedirectPath]
  );

  const startDesktopOAuthListener = useCallback(
    async (state: string, mode: "code" | "near", attempt: number) => {
      cleanupDesktopOAuthListener();
      let completionStarted = false;
      let completionFinished = false;
      const unlisten = await listenForDesktopOAuth((payload) => {
        if (attempt !== desktopAttemptRef.current || completionStarted) return;
        const legacy = payload.legacy === true;
        if (legacy) {
          if (!payload.token || payload.code || (payload.state && payload.state !== state)) return;
        } else {
          if (payload.state !== state) return;
          if (mode === "code" ? !payload.code || payload.token : !payload.token || !payload.sessionId || payload.code)
            return;
        }
        completionStarted = true;
        loginPendingRef.current = true;
        const finish = async () => {
          // Both forms are bound to the initiating webview's random state. Only
          // OAuth code mode transmits the verifier to the backend for exchange.
          if (legacy) {
            clearOAuthCodeFlow();
            await finalizeOAuth({
              token: payload.token!,
              sessionId: payload.sessionId ?? "",
              isNewUser: Boolean(payload.isNewUser),
            });
            return;
          }
          const verifier = consumeOAuthCodeFlow(payload.state ?? null);
          if (mode === "code") {
            const response = await authClient.exchangeOAuthCode(payload.code!, verifier);
            if (attempt !== desktopAttemptRef.current) return;
            await finalizeOAuth({
              token: response.token,
              sessionId: response.session_id,
              isNewUser: response.is_new_user,
            });
          } else {
            await finalizeOAuth({
              token: payload.token!,
              sessionId: payload.sessionId!,
              isNewUser: Boolean(payload.isNewUser),
            });
          }
        };
        void finish()
          .catch(() => {
            if (attempt !== desktopAttemptRef.current) return;
            cleanupDesktopOAuthListener();
            toast.error("Failed to complete login. Please try again.");
          })
          .finally(() => {
            completionFinished = true;
            if (attempt === desktopAttemptRef.current) loginPendingRef.current = false;
          });
      });
      if (attempt !== desktopAttemptRef.current) unlisten?.();
      else desktopOAuthUnlistenRef.current = unlisten;
      return () => completionStarted && !completionFinished;
    },
    [cleanupDesktopOAuthListener, finalizeOAuth]
  );

  useEffect(
    () => () => {
      desktopAttemptRef.current += 1;
      cleanupDesktopOAuthListener();
    },
    [cleanupDesktopOAuthListener]
  );

  const openExternalOAuthUrl = async (url: string) => {
    if (!isTauri()) return false;

    try {
      const { open } = await import("@tauri-apps/plugin-shell");
      await open(url);
      return true;
    } catch (pluginError) {
      console.error("Tauri shell plugin open failed:", pluginError);
      const tauriGlobal = (
        window as typeof window & {
          __TAURI__?: {
            shell?: { open: (path: string) => Promise<void> };
            core?: { invoke: (cmd: string, args?: Record<string, unknown>) => Promise<unknown> };
          };
        }
      ).__TAURI__;

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
    if (!checkAgreeTerms() || loginPendingRef.current) return;
    loginPendingRef.current = true;
    const attempt = ++desktopAttemptRef.current;
    cleanupDesktopOAuthListener();
    try {
      const { codeChallenge, state } = await prepareOAuthCodeFlow();
      if (isTauri()) {
        const isCompleting = await startDesktopOAuthListener(state, "code", attempt);
        const callbackUrl = await getDesktopOAuthCallbackUrl();
        const popupUrl = authClient.getOAuthUrl(provider, callbackUrl, {
          responseMode: "code",
          codeChallenge,
          frontendState: state,
        });
        const openedExternally = await openExternalOAuthUrl(popupUrl);
        if (!openedExternally) {
          const openedWindow = window.open(popupUrl, "_blank", "noopener,noreferrer");
          if (!openedWindow) throw new Error("Unable to open browser window");
        }
        loginPendingRef.current = isCompleting();
        toast.message("Continue the sign-in process in your browser.");
      } else {
        authClient.oauth2SignIn(provider, undefined, {
          responseMode: "code",
          codeChallenge,
          frontendState: state,
        });
      }
    } catch {
      clearOAuthCodeFlow();
      cleanupDesktopOAuthListener();
      loginPendingRef.current = false;
      toast.error("Unable to start secure login. Please try again.");
    }
  };

  const handleNearLogin = async () => {
    if (!checkAgreeTerms() || loginPendingRef.current) return;
    if (!config) return;

    if (isTauri()) {
      try {
        loginPendingRef.current = true;
        const attempt = ++desktopAttemptRef.current;
        cleanupDesktopOAuthListener();
        const { state } = await prepareOAuthCodeFlow();
        const isCompleting = await startDesktopOAuthListener(state, "near", attempt);
        const callbackUrl = await getDesktopOAuthCallbackUrl();

        // Construct the URL for the new NearLogin page
        const nearLoginUrl = new URL(APP_ROUTES.NEAR_LOGIN, NEAR_LOGIN_URL);
        nearLoginUrl.searchParams.set("frontend_callback", callbackUrl);
        nearLoginUrl.searchParams.set("state", state);

        const openedExternally = await openExternalOAuthUrl(nearLoginUrl.toString());
        if (!openedExternally) {
          const openedWindow = window.open(nearLoginUrl.toString(), "_blank", "noopener,noreferrer");
          if (!openedWindow) throw new Error("Unable to open browser window");
        }
        loginPendingRef.current = isCompleting();
        toast.message("Continue the sign-in process in your browser.");
      } catch (error) {
        console.error("Failed to start NEAR login in browser:", error);
        clearOAuthCodeFlow();
        loginPendingRef.current = false;
        cleanupDesktopOAuthListener();
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
      const message = config.signInMessage;

      const signedMessage = await near.signMessage({ message, recipient, nonce });
      const response = await authClient.sendNearAuth(signedMessage, { message, nonce, recipient });

      await completeLogin(response.token, response.session_id, response.is_new_user);
      const redirectPath = getRedirectPath();
      navigate(redirectPath, { replace: true });
      clearRedirectPath();
    } catch (error) {
      console.error("NEAR login failed:", error);
      toast.error("Failed to connect to NEAR wallet");
    }
  };

  useEffect(() => {
    if ((!token && !code) || oauthCompletionStartedRef.current) return;
    oauthCompletionStartedRef.current = true;
    loginPendingRef.current = true;
    const expectedToken = localStorage.getItem(LOCAL_STORAGE_KEYS.TOKEN);
    const finishOAuth = async () => {
      let resolvedToken = token;
      let resolvedSessionId = sessionId ?? "";
      let resolvedIsNewUser = isNewUser;
      if (code) {
        const verifier = consumeOAuthCodeFlow(frontendStateParam);
        const response = await authClient.exchangeOAuthCode(code, verifier);
        resolvedToken = response.token;
        resolvedSessionId = response.session_id;
        resolvedIsNewUser = response.is_new_user;
      } else {
        // Match private-assistant's rolling-upgrade fallback for older backends.
        clearOAuthCodeFlow();
      }
      if (!resolvedToken) throw new Error("OAuth callback did not contain usable credentials");
      if (!mountedRef.current || localStorage.getItem(LOCAL_STORAGE_KEYS.TOKEN) !== expectedToken) {
        clearQueryCallbackCredentials();
        return;
      }
      if (oauthChannelParam) {
        const channel = new BroadcastChannel(oauthChannelParam);
        channel.postMessage({
          token: resolvedToken,
          sessionId: resolvedSessionId,
          isNewUser: resolvedIsNewUser,
        } satisfies OAuthCompleteEvent);
        channel.close();
        clearQueryCallbackCredentials();
        setShowCloseTabMessage(true);
        return;
      }
      // Publishing the session can remount AuthPage while tracking is still
      // pending. Consume the handoff first so that remount cannot replay it.
      clearQueryCallbackCredentials();
      const installed = await completeLogin(resolvedToken, resolvedSessionId, resolvedIsNewUser, {
        expectedToken,
        isCurrent: () => mountedRef.current,
      });
      // Session publication can remount AuthPage during tracking. A successful
      // handoff may still redirect, provided a newer login has not replaced it.
      if (installed && localStorage.getItem(LOCAL_STORAGE_KEYS.TOKEN) === resolvedToken) {
        navigate(getRedirectPath(), { replace: true });
        clearRedirectPath();
      }
    };
    void finishOAuth()
      .catch(() => {
        clearQueryCallbackCredentials();
        if (mountedRef.current) toast.error("Failed to complete login. Please try again.");
      })
      .finally(() => {
        loginPendingRef.current = false;
      });
  }, [
    token,
    sessionId,
    code,
    frontendStateParam,
    isNewUser,
    oauthChannelParam,
    navigate,
    completeLogin,
    getRedirectPath,
    clearRedirectPath,
  ]);

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
                    href="/docs/tos.pdf"
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
