import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { MessageSignature } from "@/api/nearai/client";

export type ExtendedMessageSignature = MessageSignature & {
  verified?: boolean;
};

interface MessagesSignaturesState {
  messagesSignatures: Record<string, ExtendedMessageSignature>;
  setMessageSignature: (chatCompletionId: string, signature: ExtendedMessageSignature) => void;
  removeMessageSignature: (chatCompletionId: string) => void;
  clearAllSignatures: () => void;
}

export const useMessagesSignaturesStore = create<MessagesSignaturesState>()(
  persist(
    (set) => ({
      messagesSignatures: {},
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
      clearAllSignatures: () => set({ messagesSignatures: {} }),
    }),
    {
      name: "messages-signatures-storage",
    }
  )
);
