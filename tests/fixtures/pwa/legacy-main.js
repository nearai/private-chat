import { consumeAuthCallbackCredentials, getQueryCallbackCredentials } from "/auth-callback.js";

sessionStorage.loads = String(Number(sessionStorage.loads || 0) + 1);
consumeAuthCallbackCredentials();
window.pendingCode = getQueryCallbackCredentials().code;
window.exchange = new Promise((resolve) => {
  window.finishExchange = resolve;
}).then(() => {
  window.exchanged = window.pendingCode;
});

// Reproduce the shipped registerSW autoUpdate behavior: activating a replacement
// reloads old clients, which must not happen during the held OAuth exchange.
const hadController = navigator.serviceWorker.controller !== null;
window.startRegistration = () => {
  window.registrationReady = navigator.serviceWorker
    .register("/sw.js")
    .then((registration) => {
      const watch = (worker) =>
        worker?.addEventListener("statechange", () => {
          if (worker.state === "activated" && hadController) location.reload();
        });
      watch(registration.installing);
      registration.addEventListener("updatefound", () => watch(registration.installing));
    })
    .catch(() => {});
  return window.registrationReady;
};
if (!new URL(location.href).searchParams.has("defer_registration")) window.startRegistration();
