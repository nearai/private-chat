export const EXPORT_RETRY_LIMIT = 2;

export function getExportErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  if (error && typeof error === "object" && "detail" in error && typeof error.detail === "string") {
    return error.detail;
  }
  return String(error);
}

export function isRetryableExportError(error: unknown): boolean {
  if (error instanceof TypeError) return true; // Fetch rejects network failures with TypeError.
  if (!error || typeof error !== "object") return false;
  const { status, offline } = error as { status?: number; offline?: boolean };
  return (
    !!offline ||
    status === 0 ||
    status === 408 ||
    status === 429 ||
    (status !== undefined && status >= 500 && status <= 599)
  );
}

function waitForRetry(delay: number, signal?: AbortSignal): Promise<void> {
  signal?.throwIfAborted();
  return new Promise((resolve, reject) => {
    const onAbort = () => {
      clearTimeout(timer);
      signal?.removeEventListener("abort", onAbort);
      reject(signal?.reason);
    };
    const timer = setTimeout(() => {
      signal?.removeEventListener("abort", onAbort);
      resolve();
    }, delay);
    signal?.addEventListener("abort", onAbort, { once: true });
  });
}

export async function retryExportRequest<T>(
  request: () => Promise<T>,
  signal?: AbortSignal,
  onRetry?: (attempt: number) => void
): Promise<T> {
  for (let attempt = 0; ; attempt++) {
    signal?.throwIfAborted();
    try {
      const result = await request();
      signal?.throwIfAborted();
      onRetry?.(0);
      return result;
    } catch (error) {
      signal?.throwIfAborted();
      if (attempt >= EXPORT_RETRY_LIMIT || !isRetryableExportError(error)) throw error;
      const retryAfterMs = (error as { retryAfterMs?: number }).retryAfterMs;
      const delay = retryAfterMs !== undefined && Number.isFinite(retryAfterMs) ? retryAfterMs : 1000 * 2 ** attempt;
      onRetry?.(attempt + 1);
      await waitForRetry(Math.min(Math.max(0, delay), 2_147_483_647), signal);
    }
  }
}
