import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";
import type {
  ChatHistory,
  ConversationItem,
  ConversationModelOutput,
  ConversationUserInput,
  ConversationWebSearchCall,
  Message,
} from "@/types";

export const MessageStatus = {
  CREATED: "created",
  REASONING: "reasoning",
  WEB_SEARCH: "web_search",
  OUTPUT: "output",
} as const;

type MessageStatusType = (typeof MessageStatus)[keyof typeof MessageStatus];

interface CombinedAssistantMessage {
  type: "message";
  role: "assistant";
  contentMessages: ConversationModelOutput[];
  reasoningMessages: unknown[];
  webSearchMessages: ConversationWebSearchCall[];
  currentStatus: MessageStatusType;
  id?: string;
}

type CombinedMessage = ConversationUserInput | CombinedAssistantMessage;

export const copyToClipboard = async (text: string): Promise<boolean> => {
  let result = false;
  if (!navigator.clipboard) {
    const textArea = document.createElement("textarea");
    textArea.value = text;

    // Avoid scrolling to bottom
    textArea.style.top = "0";
    textArea.style.left = "0";
    textArea.style.position = "fixed";

    document.body.appendChild(textArea);
    textArea.focus();
    textArea.select();

    try {
      const successful = document.execCommand("copy");
      const msg = successful ? "successful" : "unsuccessful";
      console.log(`Fallback: Copying text command was ${msg}`);
      result = true;
    } catch (err) {
      console.error("Fallback: Oops, unable to copy", err);
    }

    document.body.removeChild(textArea);
    return result;
  }

  result = await navigator.clipboard
    .writeText(text)
    .then(() => {
      console.log("Async: Copying to clipboard was successful!");
      return true;
    })
    .catch((error) => {
      console.error("Async: Could not copy text: ", error);
      return false;
    });

  return result;
};

export const validateJSON = (json: string): boolean => {
  try {
    const obj = JSON.parse(json);
    return obj && typeof obj === "object";
  } catch {
    return false;
  }
};

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

// export const combineMessagesById = (messages: ConversationItem[]) => {
//   const history = {
//     messages: {},
//     currentId: null,
//   };

//   const treeNode = null;

// };

/**
 * Group consecutive assistant messages into one unified structure
 */
export function combineMessages(messages: ConversationItem[]): CombinedMessage[] {
  if (!messages.length) return [];

  const combined: CombinedMessage[] = [];

  for (const msg of messages) {
    if (msg.type === "message" && msg.role === "user") {
      combined.push(msg);
      continue;
    }

    let last = combined[combined.length - 1];

    if (!last || (last.type === "message" && last.role === "user")) {
      last = {
        type: "message",
        role: "assistant",
        contentMessages: [],
        reasoningMessages: [],
        webSearchMessages: [],
        currentStatus: MessageStatus.CREATED,
        id: msg.id,
      };
      combined.push(last);
    }

    if ("currentStatus" in last) {
      if (msg.type === "web_search_call") {
        last.webSearchMessages.push(msg);
        last.currentStatus = MessageStatus.WEB_SEARCH;
        last.id = msg.id;
      } else if (msg.type === "message" && msg.role === "assistant") {
        last.contentMessages.push(msg);
        last.currentStatus = MessageStatus.OUTPUT;
        last.id = msg.id;
      }
    }
  }

  return combined;
}

export const formatFileSize = (size?: number) => {
  if (size == null || size === undefined) return "Unknown size";
  if (typeof size !== "number" || size < 0) return "Invalid size";
  if (size === 0) return "0 B";
  const units = ["B", "KB", "MB", "GB", "TB"];
  let unitIndex = 0;

  while (size >= 1024 && unitIndex < units.length - 1) {
    //biome-ignore lint/style/noParameterAssign: explanation
    size /= 1024;
    unitIndex++;
  }
  return `${size.toFixed(1)} ${units[unitIndex]}`;
};

export const getLineCount = (text: string) => {
  console.log(typeof text);
  return text ? text.split("\n").length : 0;
};

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
