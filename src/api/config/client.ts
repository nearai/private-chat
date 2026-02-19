import { ApiClient } from "@/api/base-client";
import type { Config, RemoteConfig } from "@/types";

class ConfigClient extends ApiClient {
  constructor() {
    super({
      apiPrefix: "/api",
      defaultHeaders: {
        "Content-Type": "application/json",
      },
      includeAuth: true,
    });
  }

  async getConfig(): Promise<Config> {
    const localConfig: Config = {
      status: true,
      name: "NEAR AI Private Chat",
      signInMessage: "Sign in to NEAR AI",
      version: "1.0.0",
      default_locale: "en",
      oauth: {
        providers: {
          google: false,
          microsoft: false,
          github: false,
          oidc: false,
        },
      },
      features: {
        auth: true,
        auth_trusted_header: false,
        enable_ldap: true,
        enable_api_key: true,
        enable_signup: true,
        enable_login_form: true,
        enable_websocket: false,
      },
      onboarding: false,
    };
    return localConfig;
  }

  async getRemoteConfig(): Promise<RemoteConfig> {
    return this.get<RemoteConfig>("/configs", { apiVersion: "v2" });
  }
}

export const configClient = new ConfigClient();
