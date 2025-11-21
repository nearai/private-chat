import { sha256 } from "js-sha256";
import { POSTHOG_HOST, POSTHOG_KEY } from "@/api/constants";

const W: any = window;

export function initPosthog() {
  if (!W.posthog) {
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
    disable_session_recording: true,
    session_recording: {
      recordCanvas: false,
      recordCrossOriginIframes: false,
      maskAllInputs: true,
    },
  });

  // Respect Global Privacy Control (required by our cookie policy)
  if (W.navigator.globalPrivacyControl === true) {
    W.posthog.opt_out_capturing();
    console.log("GPC signal detected - PostHog tracking disabled");
  }
}

export function posthogReset() {
  if (!W.posthog) return console.warn("PostHog not initialized");
  try {
    W.posthog.reset();
  } catch (err) {
    console.error("PostHog reset error:", err);
  }
}

export function posthogTrack(event: string, properties?: Record<string, any>) {
  if (!W.posthog) return;
  try {
    W.posthog.capture(event, properties);
  } catch (err) {
    console.error("PostHog tracking error:", err);
  }
}

export function posthogIdentify(rawUserId: string, properties?: Record<string, any>) {
  if (!W.posthog) return;

  const userIdHash = sha256(rawUserId);

  try {
    W.posthog.identify(userIdHash, { 
      ...properties,
      $user_id: userIdHash 
    });
  } catch (err) {
    console.error("PostHog identify error:", err);
  }
}

export function posthogPageView() {
  posthogTrack("page_view", {
    page_url: location.href,
    page_path: location.pathname,
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
  const userIdHash = sha256(userId);

  posthogTrack("signup_completed", {
    user_id: userIdHash,
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
    oauth_provider: provider,
    plan: "free",
  });

  posthogIdentify(userId);
}

export function posthogEmailSignup(userId: string, email: string) {
  const userIdHash = sha256(userId);

  posthogTrack("signup_completed", {
    user_id: userIdHash,
    method: "email",
    plan: "free",
  });

  posthogIdentify(userId, {
    plan: "free",
    signup_date: new Date().toISOString(),
    email_hash: sha256(email.toLowerCase()),
  });
}

export function posthogEmailLogin(userId: string) {
  const userIdHash = sha256(userId);

  posthogTrack("login_completed", {
    user_id: userIdHash,
    method: "email",
    plan: "free",
  });

  posthogIdentify(userId);
}
