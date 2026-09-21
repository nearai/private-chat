import type { Conversation } from "@/types";

self.onmessage = (event: MessageEvent<Conversation[]>) => {
  try {
    const blob = new Blob([JSON.stringify(event.data, null, 2)], {
      type: "application/json;charset=utf-8",
    });
    self.postMessage({ blob });
  } catch (error) {
    self.postMessage({ error: error instanceof Error ? error.message : String(error) });
  }
};
