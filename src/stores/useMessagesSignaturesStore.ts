import { create } from "zustand";
import type { MessageSignature } from "@/api/nearai/client";
import { offlineCache } from "@/lib/offlineCache";

export type ExtendedMessageSignature = MessageSignature & {
  verified?: boolean;
};

interface MessagesSignaturesState {
  messagesSignatures: Record<string, ExtendedMessageSignature>;
  messagesSignaturesErrors: Record<string, string>;
  setMessageSignature: (chatCompletionId: string, signature: ExtendedMessageSignature) => void;
  setMessageSignatureError: (chatCompletionId: string, error: string) => void;
  removeMessageSignature: (chatCompletionId: string) => void;
  removeMessageSignatureError: (chatCompletionId: string) => void;
  clearAllSignatures: () => void;
}

const loadCachedSignatures = () => offlineCache.getMessageSignatures() ?? {};

export const useMessagesSignaturesStore = create<MessagesSignaturesState>()((set, get) => ({
  messagesSignatures: loadCachedSignatures(),
  messagesSignaturesErrors: {},
  setMessageSignature: (chatCompletionId: string, signature: MessageSignature) =>
    set((state) => {
      const updated = {
        ...state.messagesSignatures,
        [chatCompletionId]: signature,
      };
      offlineCache.saveMessageSignatures(updated);
      return { messagesSignatures: updated };
    }),
  removeMessageSignature: (chatCompletionId: string) =>
    set((state) => {
      const newSignatures = { ...state.messagesSignatures };
      delete newSignatures[chatCompletionId];
      offlineCache.saveMessageSignatures(newSignatures);
      return { messagesSignatures: newSignatures };
    }),
  clearAllSignatures: () =>
    set(() => {
      offlineCache.clearMessageSignatures();
      return { messagesSignatures: {}, messagesSignaturesErrors: {} };
    }),
  setMessageSignatureError: (chatCompletionId: string, error: string) =>
    set((state) => ({
      messagesSignaturesErrors: {
        ...state.messagesSignaturesErrors,
        [chatCompletionId]: error,
      },
    })),
  removeMessageSignatureError: (chatCompletionId: string) => {
    const currentErrors = get().messagesSignaturesErrors;
    // If there's no error for this id, do not call set to avoid unnecessary updates
    if (!currentErrors || !(chatCompletionId in currentErrors)) return;

    set((state) => {
      const newErrors = { ...state.messagesSignaturesErrors };
      delete newErrors[chatCompletionId];
      return { messagesSignaturesErrors: newErrors };
    });
  },
}));
