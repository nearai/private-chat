import { ApiClient } from "@/api/base-client";
import { LOCAL_STORAGE_KEYS } from "@/lib/constants";
import type { OAuth2Provider, SessionUser } from "@/types";

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

    if (!token) {
      throw new Error("No token found");
    }
    return this.post("/auth/logout",
      {
        session_id: sessionId,
      }, 
      { 
        apiVersion: "v2",
        headers: {
          Authorization: `Bearer ${token}`,
        },
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

  oauth2SignIn(provider: OAuth2Provider) {
    window.location.href = `${this.baseURLV2}/auth/${provider}?frontend_callback=${window.location.origin}`;
  }
}

export const authClient = new AuthClient();
