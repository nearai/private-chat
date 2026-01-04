import { ApiClient } from "@/api/base-client";
import { LOCAL_STORAGE_KEYS } from "@/lib/constants";
import type { OAuth2Provider, SessionUser } from "@/types";
import type { SignedMessage } from "near-kit";

/** Response from NEAR authentication endpoint */
export interface NearAuthResponse {
  token: string;
  session_id: string;
  expires_at: string;
  is_new_user: boolean;
}

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
    const token = localStorage.getItem(LOCAL_STORAGE_KEYS.TOKEN);

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
    const sessionId = localStorage.getItem(LOCAL_STORAGE_KEYS.SESSION);
    const token = localStorage.getItem(LOCAL_STORAGE_KEYS.TOKEN);

    if (!token) throw new Error("No token found");
    if (!sessionId) {
      // if no sessionId, allow sign out to proceed (clean local state) for API compatibility
      console.warn("No session ID found, proceeding with sign out");
      return;
    }

    await this.post(
      "/auth/logout",
      { session_id: sessionId },
      {
        apiVersion: "v2",
        headers: { Authorization: `Bearer ${token}` },
      }
    );
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

  getOAuthUrl(provider: OAuth2Provider, frontendCallback: string) {
    const callback = frontendCallback || window.location.origin;
    return `${this.baseURLV2}/auth/${provider}?frontend_callback=${encodeURIComponent(callback)}`;
  }

  oauth2SignIn(provider: OAuth2Provider, frontendCallback?: string) {
    window.location.href = this.getOAuthUrl(provider, frontendCallback ?? window.location.origin);
  }

  /**
   * Send signed NEAR message to backend for authentication (NEP-413)
   */
  async sendNearAuth(
    signedMessage: SignedMessage,
    payload: { message: string; nonce: Uint8Array; recipient: string }
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
      { apiVersion: "v2" }
    );
  }
}

export const authClient = new AuthClient();
