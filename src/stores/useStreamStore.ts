import { create } from "zustand";
import type { Conversation } from "../types";

interface ActiveStream {
  promise: Promise<void>;
  chatId: string;
  startedAt: number;
  initialData?: Conversation;
}

interface StreamStore {
  activeStreams: Map<string, ActiveStream>;
  streamCompletions: Map<string, boolean>;

  addStream: (chatId: string, promise: Promise<void>, initialData?: Conversation) => void;
  removeStream: (chatId: string) => void;
  markStreamComplete: (chatId: string) => void;
  isStreamActive: (chatId: string) => boolean;
  getActiveStreams: () => Map<string, ActiveStream>;
  getStreamInitialData: (chatId: string) => Conversation | undefined;
}

export const useStreamStore = create<StreamStore>((set, get) => ({
  activeStreams: new Map(),
  streamCompletions: new Map(),

  addStream: (chatId: string, promise: Promise<void>, initialData?: Conversation) => {
    set((state) => {
      const newStreams = new Map(state.activeStreams);
      newStreams.set(chatId, {
        promise,
        chatId,
        startedAt: Date.now(),
        initialData,
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
}));
