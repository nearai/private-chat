import { ChevronDownIcon } from "@heroicons/react/24/outline";
import type React from "react";
import { useMemo, useState } from "react";
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

  const [viewMore, setViewMore] = useState(false);

  const chatCompletions = useMemo(() => {
    if (!history) return [];
    return Object.values(history.messages);
  }, [history]);

  const messageList = viewMore ? chatCompletions : chatCompletions.slice(0, 2);

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

          {messageList.map((message, index) => (
            <MessageVerifier
              message={message}
              key={`message-verification-${message.chatCompletionId}-${index}`}
              index={index}
            />
          ))}

          {chatCompletions.length > 2 && (
            <button
              className="flex w-full items-center justify-center gap-2.5 rounded-md bg-secondary px-4 py-2 text-secondary-foreground text-sm transition-colors hover:bg-secondary/80"
              onClick={() => setViewMore(!viewMore)}
            >
              {viewMore ? t("View Less") : t("View More")}
              <ChevronDownIcon className={`h-4 w-4 ${viewMore ? "rotate-180" : ""}`} strokeWidth={2.5} />
            </button>
          )}
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
