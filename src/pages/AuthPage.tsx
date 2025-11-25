import { useQueryClient } from "@tanstack/react-query";
import type React from "react";
import { useEffect, useState } from "react";
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
import { Button } from "@/components/ui/button";
import { LOCAL_STORAGE_KEYS } from "@/lib/constants";
import { posthogOauthLogin, posthogOauthSignup } from "@/lib/posthog";
import { cn } from "@/lib/time";
import type { OAuth2Provider } from "@/types";
import Spinner from "../components/common/Spinner";
import { APP_ROUTES } from "./routes";

const TERMS_VERSION = "V1";

const AuthPage: React.FC = () => {
  const { data: config } = useConfig();
  const queryClient = useQueryClient();
  const [searchParams] = useSearchParams();

  const [agreedTerms, setAgreedTerms] = useState(
    localStorage.getItem(LOCAL_STORAGE_KEYS.AGREED_TERMS) === TERMS_VERSION
  );
  const navigate = useNavigate();
  const checkAgreeTerms = () => {
    if (!agreedTerms) {
      toast.error("You must agree to the Terms of Service, Privacy Policy, and Cookie Policy to proceed.");
      return false;
    }
    return true;
  };

  const handleOAuthLogin = (provider: OAuth2Provider) => {
    if (!checkAgreeTerms()) return;
    authClient.oauth2SignIn(provider);
  };

  useEffect(() => {
    const token = searchParams.get("token");
    const isNewUser = searchParams.get("is_new_user") === "true";
    if (token) {
      localStorage.setItem(LOCAL_STORAGE_KEYS.TOKEN, token);
      queryClient.invalidateQueries({ queryKey: queryKeys.models.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.users.userData });

      usersClient.getUserData().then((u) => {
        if (!u) return;
        const provider = u.linked_accounts[0]?.provider || "unknown";
        if (isNewUser) {
          posthogOauthSignup(u.user.id, provider);
        } else {
          posthogOauthLogin(u.user.id, provider);
        }
      });
      navigate(APP_ROUTES.HOME, { replace: true });
    }
  }, [searchParams, navigate, queryClient]);

  if (!config) {
    return (
      <div className="flex h-full items-center justify-center">
        <Spinner />
      </div>
    );
  }

  return (
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
                  <span>Continue with Google</span>
                </Button>
                <Button onClick={() => handleOAuthLogin("github")} className="rounded-full" variant="secondary">
                  <GitHubIcon className="mr-3 h-6 w-6" />
                  <span>Continue with GitHub</span>
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
                  <a className="underline hover:text-blue-600" href="/terms">
                    Terms of Service
                  </a>
                  {" , "}
                  <a className="underline hover:text-blue-600" href="/privacy">
                    Privacy Policy
                  </a>
                  {" and "}
                  <a className="underline hover:text-blue-600" href="/privacy-cookie">
                    Cookie Policy
                  </a>
                  .
                </div>
              </label>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AuthPage;
