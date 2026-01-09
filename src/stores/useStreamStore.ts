import { create } from "zustand";
import type { Conversation } from "../types";

interface ActiveStream {
  promise: Promise<void>;
  chatId: string;
  startedAt: number;
  initialData?: Conversation;
  reader?: ReadableStreamDefaultReader<Uint8Array>;
  abortController?: AbortController;
}

interface StreamStore {
  activeStreams: Map<string, ActiveStream>;
  streamCompletions: Map<string, boolean>;

  addStream: (
    chatId: string,
    promise: Promise<void>,
    initialData?: Conversation,
    reader?: ReadableStreamDefaultReader<Uint8Array>,
    abortController?: AbortController
  ) => void;
  removeStream: (chatId: string) => void;
  markStreamComplete: (chatId: string) => void;
  isStreamActive: (chatId: string) => boolean;
  getActiveStreams: () => Map<string, ActiveStream>;
  getStreamInitialData: (chatId: string) => Conversation | undefined;
  stopStream: (chatId: string) => void;
  stopAllStreams: () => void;
}

export const useStreamStore = create<StreamStore>((set, get) => ({
  activeStreams: new Map(),
  streamCompletions: new Map(),

  addStream: (
    chatId: string,
    promise: Promise<void>,
    initialData?: Conversation,
    reader?: ReadableStreamDefaultReader<Uint8Array>,
    abortController?: AbortController
  ) => {
    set((state) => {
      const newStreams = new Map(state.activeStreams);
      newStreams.set(chatId, {
        promise,
        chatId,
        startedAt: Date.now(),
        initialData,
        reader,
        abortController,
      });
      return { activeStreams: newStreams };
    });
  },

  removeStream: (chatId: string) => {
    set((state) => {
      const newStreams = new Map(state.activeStreams);
      newStreams.delete(chatId);
      return { activeStreams: newStreams };
    });
  },

  markStreamComplete: (chatId: string) => {
    set((state) => {
      const newCompletions = new Map(state.streamCompletions);
      newCompletions.set(chatId, true);
      return { streamCompletions: newCompletions };
    });
  },

  isStreamActive: (chatId: string) => {
    return get().activeStreams.has(chatId);
  },

  getActiveStreams: () => {
    return get().activeStreams;
  },

  getStreamInitialData: (chatId: string) => {
    return get().activeStreams.get(chatId)?.initialData;
  },

  stopStream: (chatId: string) => {
    const stream = get().activeStreams.get(chatId);
    if (stream) {
      stream.reader?.cancel().catch((error) => {
        console.error("Error cancelling stream reader:", error);
      });
      stream.abortController?.abort();
      get().markStreamComplete(chatId);
      get().removeStream(chatId);
    }
  },

  stopAllStreams: () => {
    const streams = get().activeStreams;
    streams.forEach((_, chatId) => {
      get().stopStream(chatId);
    });
  },
}));
