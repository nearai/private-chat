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

  return (
    <div className="h-full">
      {chatCompletions.length > 0 ? (
        <div className="flex flex-col gap-y-4">
          <p className="font-medium text-green-dark text-xs leading-[normal]">{verifiedCount} Verified Messages</p>

          {chatCompletions.reverse().map((message, index, array) => {
            const reversedIndex = array.length - 1 - index;
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
      ) : (
        <div className="py-8 text-center text-muted-foreground">
          <p className="text-sm">{t("No verifiable messages found for this chat.")}</p>
        </div>
      )}

      <div className="h-10" />
    </div>
  );
};

export default MessagesVerifier;
