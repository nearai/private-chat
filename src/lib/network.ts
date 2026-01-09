export const isOnline = () => {
  if (typeof navigator === "undefined") return true;
  return navigator.onLine !== false;
};

type RequestError = {
  detail?: string;
  status?: number;
  offline?: boolean;
};

export const isRequestError = (error: unknown): error is RequestError => {
  return Boolean(
    error &&
      typeof error === "object" &&
      ("detail" in error || "status" in error || "offline" in error)
  );
};

export const isOfflineError = (error: unknown) => {
  return isRequestError(error) && (error.offline || error.status === 0);
};
