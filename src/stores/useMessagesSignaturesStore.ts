import { create } from "zustand";
import type { MessageSignature } from "@/api/nearai/client";

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

export const useMessagesSignaturesStore = create<MessagesSignaturesState>()((set) => ({
  messagesSignatures: {},
  messagesSignaturesErrors: {},
  setMessageSignature: (chatCompletionId: string, signature: MessageSignature) =>
    set((state) => ({
      messagesSignatures: {
        ...state.messagesSignatures,
        [chatCompletionId]: signature,
      },
    })),
  removeMessageSignature: (chatCompletionId: string) =>
    set((state) => {
      const newSignatures = { ...state.messagesSignatures };
      delete newSignatures[chatCompletionId];
      return { messagesSignatures: newSignatures };
    }),
  clearAllSignatures: () => set({ messagesSignatures: {}, messagesSignaturesErrors: {} }),
  setMessageSignatureError: (chatCompletionId: string, error: string) =>
    set((state) => ({
      messagesSignaturesErrors: {
        ...state.messagesSignaturesErrors,
        [chatCompletionId]: error,
      },
    })),
  removeMessageSignatureError: (chatCompletionId: string) =>
    set((state) => {
      const newErrors = { ...state.messagesSignaturesErrors };
      delete newErrors[chatCompletionId];
      return { messagesSignaturesErrors: newErrors };
    }),
}));
