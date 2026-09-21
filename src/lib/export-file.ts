import type { Conversation } from "@/types";

export function createExportFile(conversations: Conversation[], signal: AbortSignal): Promise<Blob> {
  signal.throwIfAborted();
  return new Promise((resolve, reject) => {
    const worker = new Worker(new URL("./export-file.worker.ts", import.meta.url), { type: "module" });
    const cleanup = () => {
      signal.removeEventListener("abort", onAbort);
      worker.terminate();
    };
    const onAbort = () => {
      cleanup();
      reject(signal.reason);
    };
    signal.addEventListener("abort", onAbort, { once: true });
    worker.onmessage = (event: MessageEvent<{ blob?: Blob; error?: string }>) => {
      cleanup();
      if (event.data.blob) resolve(event.data.blob);
      else reject(new Error(event.data.error || "Failed to generate export file"));
    };
    worker.onerror = (event) => {
      event.preventDefault();
      cleanup();
      reject(new Error(event.message || "Failed to generate export file"));
    };
    worker.onmessageerror = () => {
      cleanup();
      reject(new Error("Failed to read export file"));
    };
    try {
      worker.postMessage(conversations);
    } catch (error) {
      cleanup();
      reject(error);
    }
  });
}
