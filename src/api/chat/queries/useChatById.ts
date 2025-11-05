import { type UseQueryOptions, useQuery } from "@tanstack/react-query";
import { queryKeys } from "@/api/query-keys";
// import { useChatStore } from "@/stores/useChatStore";
import type { Chat, ChatHistory, Message } from "@/types";

// import { chatClient } from "../client";

type ChatIdProps = {
  id: string;
  setCurrentMessages: (messages: Message[]) => void;
};

type UseChatByIdOptions = Omit<UseQueryOptions<Chat, Error>, "queryKey" | "queryFn">;

export const createMessagesList = (history: ChatHistory, messageId: string): Message[] => {
  if (messageId === null) {
    return [];
  }

  const message = history.messages[messageId];
  if (message?.parentId) {
    return [...createMessagesList(history, message.parentId), message];
  } else {
    return [message];
  }
};

export const useChatById = ({ id }: ChatIdProps, options?: UseChatByIdOptions) => {
  // const { setSelectedModels } = useChatStore();

  return useQuery({
    queryKey: queryKeys.chat.byId(id),
    queryFn: async () => {
      // const conversation = await chatClient.getConversation(id);
      // const conversationItems = await chatClient.getConversationItems(id);
      // console.log("conversation", conversation);
      // console.log("conversationItems", conversationItems);
      // const chat = await chatClient.getChatById(id);

      // setCurrentChat({
      //   ...chat,
      //   ...conversationItems,
      // });
      // setSelectedModels(["gpt-5-nano"]);
      return {} as Chat;
    },
    enabled: !!id,
    ...options,
  });
};
