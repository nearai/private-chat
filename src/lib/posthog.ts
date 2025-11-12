import { sha256 } from "js-sha256";
import { POSTHOG_HOST, POSTHOG_KEY } from "@/api/constants";

const W: any = window;

export function initPosthog() {
  if (typeof W.posthog === "undefined") {
    console.warn("PostHog library is not loaded.");
    return;
  }
  W.posthog.init(POSTHOG_KEY, {
    api_host: POSTHOG_HOST,
    person_profiles: "always",
    autocapture: false,
    capture_pageview: false,
    persistence: "localStorage+cookie",
    cookie_expiration: 90,
    cross_subdomain_cookie: true,
    cookie_domain: ".near.ai",
    respect_dnt: true,
    opt_out_capturing_by_default: false,
  });

  // Respect Global Privacy Control (required by our cookie policy)
  if (W.navigator.globalPrivacyControl === true) {
    W.posthog.opt_out_capturing();
    console.log("GPC signal detected - PostHog tracking disabled");
  }
}

export function posthogTrack(event: string, properties?: Record<string, any>) {
  try {
    if (typeof W.posthog === "undefined") {
      console.warn("PostHog is not initialized.");
      return;
    }
    W.posthog.capture(event, properties);
  } catch (error) {
    console.error("PostHog tracking error:", error);
  }
}

export function posthogIdentify(userId: string, properties?: Record<string, any>) {
  try {
    if (typeof W.posthog === "undefined") {
      console.warn("PostHog is not initialized.");
      return;
    }
    W.posthog.identify(sha256(userId), properties);
  } catch (error) {
    console.error("PostHog identify error:", error);
  }
}

export function posthogPageView() {
  posthogTrack("page_view", {
    page_url: window.location.href,
    page_path: window.location.pathname,
    page_title: document.title,
    referrer: document.referrer,
  });
}

export function posthogSignupStarted(authUrl: string) {
  posthogTrack("signup_started", {
    entry_point: "anonymous_message_attempt",
    page_url: authUrl,
  });
}

export function posthogOauthSignup(userId: string, provider: string) {
  posthogTrack("signup_completed", {
    user_id: sha256(userId),
    method: "oauth",
    oauth_provider: provider,
    plan: "free",
  });

  posthogIdentify(userId, {
    plan: "free",
    signup_date: new Date().toISOString(),
    oauth_provider: provider,
  });
}

export function posthogOauthLogin(userId: string, provider: string) {
  const userIdHash = sha256(userId);
  posthogTrack("login_completed", {
    user_id: userIdHash,
    method: "oauth",
    plan: "free",
    oauth_provider: provider,
  });

  posthogIdentify(userIdHash);
}

export function posthogEmailSignup(userId: string, email: string) {
  posthogTrack("signup_completed", {
    user_id: sha256(userId),
    method: "email",
    plan: "free",
  });

  posthogIdentify(userId, {
    email_hash: sha256(email.toLowerCase()),
    plan: "free",
    signup_date: new Date().toISOString(),
  });
}

export function posthogEmailLogin(userId: string) {
  const userIdHash = sha256(userId);
  posthogTrack("login_completed", {
    user_id: userIdHash,
    method: "email",
    plan: "free",
  });

  posthogIdentify(userIdHash);
}
