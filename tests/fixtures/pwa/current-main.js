import { consumeAuthCallbackCredentials, getQueryCallbackCredentials } from "/auth-callback.js";
import { cleanupLegacyPwa } from "/pwa-cleanup.js";

sessionStorage.loads = String(Number(sessionStorage.loads || 0) + 1);
consumeAuthCallbackCredentials();
window.pendingCode = getQueryCallbackCredentials().code;
window.exchange = new Promise((resolve) => {
  window.finishExchange = resolve;
}).then(() => {
  window.exchanged = window.pendingCode;
});
window.cleanupDone = cleanupLegacyPwa();
