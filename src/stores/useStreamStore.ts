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
  activeStreams: Map<string, Map<string, ActiveStream>>;
  streamCompletions: Map<string, boolean>;

  addStream: (
    chatId: string,
    streamId: string,
    promise: Promise<void>,
    initialData?: Conversation,
    reader?: ReadableStreamDefaultReader<Uint8Array>,
    abortController?: AbortController
  ) => void;
  removeStream: (chatId: string, streamId: string) => void;
  markStreamComplete: (chatId: string, streamId: string) => void;
  isStreamActive: (chatId: string) => boolean;
  getActiveStreams: () => Map<string, Map<string, ActiveStream>>;
  stopStream: (chatId: string) => void;
  stopAllStreams: () => void;
}

export const useStreamStore = create<StreamStore>((set, get) => ({
  activeStreams: new Map(),
  streamCompletions: new Map(),

  addStream: (
    chatId: string,
    streamId: string,
    promise: Promise<void>,
    initialData?: Conversation,
    reader?: ReadableStreamDefaultReader<Uint8Array>,
    abortController?: AbortController
  ) => {
    set((state) => {
      const newStreams = new Map(state.activeStreams);
      const currentChatStreams = newStreams.get(chatId);
      // Create a copy of the inner map to avoid mutation
      const newChatStreams = currentChatStreams ? new Map(currentChatStreams) : new Map();
      
      newChatStreams.set(streamId, {
        promise,
        chatId,
        startedAt: Date.now(),
        initialData,
        reader,
        abortController,
      });
      newStreams.set(chatId, newChatStreams);
      return { activeStreams: newStreams };
    });
  },

  removeStream: (chatId: string, streamId: string) => {
    set((state) => {
      const newStreams = new Map(state.activeStreams);
      const currentChatStreams = newStreams.get(chatId);
      
      if (currentChatStreams) {
        // Create a copy of the inner map
        const newChatStreams = new Map(currentChatStreams);
        newChatStreams.delete(streamId);
        
        if (newChatStreams.size === 0) {
          newStreams.delete(chatId);
        } else {
          newStreams.set(chatId, newChatStreams);
        }
      }

      // Cleanup completion status
      const newCompletions = new Map(state.streamCompletions);
      newCompletions.delete(`${chatId}-${streamId}`);

      return { 
        activeStreams: newStreams,
        streamCompletions: newCompletions 
      };
    });
  },

  markStreamComplete: (chatId: string, streamId: string) => {
    set((state) => {
      const newCompletions = new Map(state.streamCompletions);
      newCompletions.set(`${chatId}-${streamId}`, true);
      return { streamCompletions: newCompletions };
    });
  },

  isStreamActive: (chatId: string) => {
    return get().activeStreams.has(chatId);
  },

  getActiveStreams: () => {
    return get().activeStreams;
  },

  stopStream: (chatId: string) => {
    const streams = get().activeStreams.get(chatId);
    if (streams) {
      streams.forEach((stream, streamId) => {
        stream.abortController?.abort();
        get().removeStream(chatId, streamId);
      });
    }
  },

  stopAllStreams: () => {
    const chatStreams = get().activeStreams;
    chatStreams.forEach((streams, chatId) => {
      streams.forEach((stream, streamId) => {
        stream.abortController?.abort();
        get().removeStream(chatId, streamId);
      });
    });
  },
}));
