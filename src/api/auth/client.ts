import { ApiClient } from "@/api/base-client";
import { useUserStore } from "@/stores/useUserStore";
import type { OAuth2Provider, SessionUser } from "@/types";
import type { SignedMessage } from "near-kit";

/** Response from NEAR authentication endpoint */
export interface NearAuthResponse {
  token: string;
  session_id: string;
  expires_at: string;
  is_new_user: boolean;
}

export type OAuthSignInOptions =
  | { oauthChannel?: string; responseMode?: undefined }
  | { oauthChannel?: string; responseMode: "code"; codeChallenge: string; frontendState: string };


class AuthClient extends ApiClient {
  constructor() {
    super({
      apiPrefix: "/api/v1",
      defaultHeaders: {
        "Content-Type": "application/json",
      },
      includeAuth: false,
    });
  }

  async getSessionUser(): Promise<SessionUser> {
    const { token } = useUserStore.getState();

    if (!token) {
      throw new Error("No token found");
    }

    return this.get<SessionUser>("/auths/", {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
  }

  async signIn(email: string, password: string) {
    return this.post("/auths/signin", {
      email,
      password,
    });
  }

  async signUp(name: string, email: string, password: string, profile_image_url: string) {
    return this.post("/auths/signup", {
      name,
      email,
      password,
      profile_image_url,
    });
  }

  async signOut(): Promise<void> {
    const { sessionId, token } = useUserStore.getState();

    if (!token) throw new Error("No token found");

    await this.post("/auth/logout", sessionId ? { session_id: sessionId } : {}, {
      apiVersion: "v2",
      ignore401Error: true,
      preserveErrorDetails: true,
      headers: { Authorization: `Bearer ${token}` },
    });
  }

  async updateProfile(token: string, name: string, profileImageUrl: string) {
    return this.post(
      "/auths/update/profile",
      {
        name,
        profile_image_url: profileImageUrl,
      },
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );
  }

  async updatePassword(token: string, password: string, newPassword: string) {
    return this.post(
      "/auths/update/password",
      {
        password,
        new_password: newPassword,
      },
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );
  }

  getOAuthUrl(provider: OAuth2Provider, frontendCallback: string, options?: OAuthSignInOptions) {
    const callback = frontendCallback || window.location.origin;
    const params = new URLSearchParams({
      frontend_callback: callback,
    });
    if (options?.oauthChannel) params.set("oauth_channel", options.oauthChannel);
    if (options?.responseMode === "code") {
      params.set("frontend_response_mode", "code");
      params.set("code_challenge", options.codeChallenge);
      params.set("code_challenge_method", "S256");
      params.set("frontend_state", options.frontendState);
    }
    return `${this.baseURLV2}/auth/${provider}?${params.toString()}`;
  }

  oauth2SignIn(provider: OAuth2Provider, frontendCallback?: string, options?: OAuthSignInOptions) {
    window.location.href = this.getOAuthUrl(provider, frontendCallback ?? window.location.origin, options);
  }

  async exchangeOAuthCode(code: string, codeVerifier: string): Promise<NearAuthResponse> {
    return this.post<NearAuthResponse>(
      "/auth/exchange",
      { code, code_verifier: codeVerifier },
      { apiVersion: "v2", ignore401Error: true, credentials: "include" }
    );
  }

  /**
   * Send signed NEAR message to backend for authentication (NEP-413)
   */
  async sendNearAuth(
    signedMessage: SignedMessage,
    payload: { message: string; nonce: Uint8Array; recipient: string },
    ignore401Error = false
  ): Promise<NearAuthResponse> {
    return this.post<NearAuthResponse>(
      "/auth/near",
      {
        signed_message: signedMessage,
        payload: {
          message: payload.message,
          nonce: Array.from(payload.nonce),
          recipient: payload.recipient,
        },
      },
      { apiVersion: "v2", ignore401Error }
    );
  }
}

export const authClient = new AuthClient();
