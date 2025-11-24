import type React from "react";
import { useMemo } from "react";
import { useTranslation } from "react-i18next";

import { useMessagesSignaturesStore } from "@/stores/useMessagesSignaturesStore";
import type { ConversationModelOutput, ConversationUserInput, ConversationWebSearchCall } from "@/types";

import MessageVerifier from "./MessageVerifier";

interface MessagesVerifierProps {
  history: {
    messages: Record<
      string,
      {
        content: (ConversationUserInput | ConversationModelOutput | ConversationWebSearchCall)[];
        chatCompletionId: string;
      }
    >;
    currentId: string | null;
  };
}

const MessagesVerifier: React.FC<MessagesVerifierProps> = ({ history }) => {
  const { t } = useTranslation("translation", { useSuspense: false });
  const { messagesSignatures } = useMessagesSignaturesStore();

  const chatCompletions = useMemo(() => {
    if (!history) return [];
    return Object.values(history.messages).reverse();
  }, [history]);

  const verifiedCount = useMemo(() => {
    return chatCompletions.filter((message) => {
      const signature = messagesSignatures[message.chatCompletionId];
      return signature?.verified === true;
    }).length;
  }, [chatCompletions, messagesSignatures]);

  if (chatCompletions.length === 0) {
    return (
      <div className="py-8 text-center text-muted-foreground">
        <p className="text-sm">{t("No verifiable messages found for this chat.")}</p>
      </div>
    );
  }

  return (
    <div className="relative flex flex-1 flex-col gap-y-2 overflow-hidden">
      <p className="font-medium text-green-dark text-xs leading-[normal]">{verifiedCount} Verified Messages</p>

      <div className="pointer-events-none absolute top-4 left-0 z-10 h-4 w-full bg-linear-to-b from-input via-50% via-input to-transparent" />
      <div className="pointer-events-none absolute bottom-0 left-0 z-10 h-4 w-full bg-linear-to-t from-input via-50% via-input to-transparent" />

      <div className="scrollbar-none flex flex-1 flex-col gap-y-2 overflow-y-auto px-1 py-4">
        {[...chatCompletions].reverse().map((message, index, array) => {
          const reversedIndex = array.length - 1 - index;
          const isCompleted = message.content.every((item) => item.status === "completed");
          if (!isCompleted) return null;
          return (
            <MessageVerifier
              message={message}
              key={`message-verification-${message.chatCompletionId}-${index}`}
              index={reversedIndex}
              isLastIndex={reversedIndex === array.length - 1}
            />
          );
        })}
      </div>
    </div>
  );
};

export default MessagesVerifier;
