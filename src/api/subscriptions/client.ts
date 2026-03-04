import { ApiClient } from "../base-client";
import { CHAT_API_BASE_URL } from "../constants";

export interface PlanLimitConfig {
  max: number;
}

/** Plan from GET /subscriptions/plans. Use `name` as the primary ID for matching. */
export interface Plan {
  name: string;
  /** Plan price in cents (e.g. 999 for $9.99, 0 for free / NEAR-funded). */
  price?: number;
  /** Free trial period in days before first charge */
  trial_period_days?: number;
  /** Instance limit from backend */
  agent_instances?: PlanLimitConfig;
  monthly_tokens?: PlanLimitConfig;
}

export interface GetPlansResponse {
  plans: Plan[];
}

export interface Subscription {
  subscription_id: string;
  user_id: string;
  plan: string;
  provider: string;
  status: string;
  current_period_end: string;
  cancel_at_period_end: boolean;
  created_at: string;
  updated_at: string;
}

export interface GetSubscriptionsResponse {
  subscriptions: Subscription[];
}

class SubscriptionsClient extends ApiClient {
  constructor() {
    super({
      baseURL: CHAT_API_BASE_URL,
      baseURLNgrok: CHAT_API_BASE_URL,
      apiPrefix: "/v1",
      defaultHeaders: {
        Accept: "application/json",
        "Content-Type": "application/json",
      },
      includeAuth: true,
    });
  }

  async getPlans(): Promise<GetPlansResponse> {
    return this.get<GetPlansResponse>("/subscriptions/plans", {
      apiVersion: "v2",
    });
  }

  async getSubscriptions(includeInactive = false): Promise<GetSubscriptionsResponse> {
    const searchParams = new URLSearchParams();
    if (includeInactive) {
      searchParams.set("include_inactive", "true");
    }
    const query = searchParams.toString();
    const endpoint = query ? `/subscriptions?${query}` : "/subscriptions";
    return this.get<GetSubscriptionsResponse>(endpoint, {
      apiVersion: "v2",
    });
  }
}

export const subscriptionsClient = new SubscriptionsClient();
