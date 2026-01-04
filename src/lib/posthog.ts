import posthog from "posthog-js";
import { sha256 } from "js-sha256";
import { POSTHOG_HOST, POSTHOG_KEY } from "@/api/constants";

let posthogInitialized = false;

const canUseBrowserApis = () => typeof window !== "undefined";

export function initPosthog() {
  if (!canUseBrowserApis()) return;
  if (posthogInitialized) return;
  if (!POSTHOG_KEY || !POSTHOG_HOST) return;

  posthog.init(POSTHOG_KEY, {
    api_host: POSTHOG_HOST,
    person_profiles: "always",
    autocapture: false,
    capture_pageview: false,
    persistence: "localStorage+cookie",
    cookie_expiration: 90,
    cross_subdomain_cookie: true,
    respect_dnt: true,
    opt_out_capturing_by_default: false,
    disable_session_recording: true,
    session_recording: {
      captureCanvas: {
        recordCanvas: false,
      },
      recordCrossOriginIframes: false,
      maskAllInputs: true,
    },
  });

  if (window.navigator && "globalPrivacyControl" in window.navigator && window.navigator.globalPrivacyControl === true) {
    posthog.opt_out_capturing();
    console.log("GPC signal detected - PostHog tracking disabled");
  }

  posthogInitialized = true;
}

export function posthogReset() {
  if (!posthogInitialized) return;
  try {
    posthog.reset();
  } catch (err) {
    console.error("PostHog reset error:", err);
  }
}

export function posthogTrack(event: string, properties?: Record<string, unknown>) {
  if (!posthogInitialized) return;
  try {
    posthog.capture(event, properties);
  } catch (err) {
    console.error("PostHog tracking error:", err);
  }
}

export function posthogIdentify(rawUserId: string, properties?: Record<string, unknown>) {
  if (!posthogInitialized) return;

  const userIdHash = sha256(rawUserId);

  try {
    posthog.identify(userIdHash, {
      ...properties,
      $user_id: userIdHash,
    });
  } catch (err) {
    console.error("PostHog identify error:", err);
  }
}

export function posthogPageView(path?: string) {
  if (!canUseBrowserApis()) return;
  posthogTrack("page_view", {
    page_url: window.location.href,
    page_path: path ?? window.location.pathname,
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
