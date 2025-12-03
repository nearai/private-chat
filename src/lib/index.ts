import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";
import type {
  ConversationItem,
  ConversationModelOutput,
  ConversationUserInput,
  ConversationWebSearchCall,
} from "@/types";
import { extractMessageContent } from "@/types/openai";

export const MessageStatus = {
  CREATED: "created",
  INPUT: "input",
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

export interface CombinedResponse {
  //TODO: add conversationId
  responseId: string;
  userPromptId: string | null;
  reasoningMessagesIds: string[];
  webSearchMessagesIds: string[];
  outputMessagesIds: string[];
  parentResponseId: string | null;
  nextResponseIds: string[];
  status: MessageStatusType;
}

export const findLastResponseId = (history: { messages: Record<string, CombinedResponse> }, rootNode: string) => {
  let maxDepth = 0;
  let currentId: string | null = null;

  function traverse(node: string, depth: number) {
    const current = history.messages[node];
    if (!current) return;
    if (depth > maxDepth) {
      maxDepth = depth;
      currentId = node;
    }
    if (current.nextResponseIds) {
      for (const next of current.nextResponseIds) {
        traverse(next, depth + 1);
      }
    }
  }

  if (rootNode) traverse(rootNode, 0);
  return currentId;
};

export const combineMessagesById = (messages: ConversationItem[]) => {
  const history: { messages: Record<string, CombinedResponse> } = {
    messages: {},
  };

  const allMessages: Record<string, ConversationItem> = messages.reduce(
    (acc, msg) => {
      acc[msg.id] = msg;
      return acc;
    },
    {} as Record<string, ConversationItem>
  );

  let rootNode: string | null = null;

  for (const msg of messages) {
    if (!history.messages[msg.response_id]) {
      history.messages[msg.response_id] = {
        status: MessageStatus.CREATED,
        responseId: msg.response_id,
        userPromptId: null,
        reasoningMessagesIds: [],
        webSearchMessagesIds: [],
        outputMessagesIds: [],
        parentResponseId: null,
        nextResponseIds: [],
      };
    }
    if (!rootNode && !msg.previous_response_id) rootNode = msg.response_id;

    if (msg.previous_response_id) history.messages[msg.response_id].parentResponseId = msg.previous_response_id;
    if (msg.next_response_ids) {
      const existing = history.messages[msg.response_id].nextResponseIds;
      const merged = [...new Set([...existing, ...msg.next_response_ids])];
      history.messages[msg.response_id].nextResponseIds = merged;
    }
    switch (msg.type) {
      case "reasoning":
        history.messages[msg.response_id].reasoningMessagesIds.push(msg.id);
        history.messages[msg.response_id].status = MessageStatus.REASONING;
        break;
      case "web_search_call":
        history.messages[msg.response_id].webSearchMessagesIds.push(msg.id);
        history.messages[msg.response_id].status = MessageStatus.WEB_SEARCH;
        break;
      case "message":
        if (msg.role === "user") history.messages[msg.response_id].userPromptId = msg.id;
        else history.messages[msg.response_id].outputMessagesIds.push(msg.id);
        history.messages[msg.response_id].status =
          msg.role === "assistant" ? MessageStatus.OUTPUT : MessageStatus.INPUT;
        break;
    }
  }

  const currentId = rootNode ? findLastResponseId(history, rootNode) : null;

  return { history, allMessages, currentId: currentId ?? rootNode };
};

export const extractBatchFromHistory = (
  history: {
    messages: Record<string, CombinedResponse>;
  },
  currentId: string | null
) => {
  let current = currentId ? history.messages[currentId] : null;
  if (!current) return [];
  const batch: string[] = [current.responseId];
  while (current?.parentResponseId) {
    batch.push(current.parentResponseId);
    current = current.parentResponseId ? history.messages[current.parentResponseId] : null;
  }
  return batch.reverse();
};

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

export const analyzeSiblings = (
  currentBatchId: string,
  history: { messages: Record<string, CombinedResponse> },
  allMessages: Record<string, ConversationItem>
): {
  inputSiblings: string[]; // One representative batch per unique input
  responseSiblings: string[]; // All response batches with same input as current
} => {
  const currentBatch = history.messages[currentBatchId];

  if (!currentBatch?.parentResponseId) {
    return { inputSiblings: [], responseSiblings: [] };
  }

  const parent = history.messages[currentBatch.parentResponseId];
  if (!parent || parent.nextResponseIds.length <= 1) {
    return { inputSiblings: [], responseSiblings: [] };
  }

  // Get current user input content
  const currentUserPromptId = currentBatch.userPromptId;
  if (!currentUserPromptId) {
    return { inputSiblings: [], responseSiblings: [] };
  }

  const currentUserMessage = allMessages[currentUserPromptId] as ConversationUserInput;
  const currentContent = extractMessageContent(currentUserMessage?.content ?? []);

  // Group siblings by their user input content
  const inputSiblingsMap: Record<string, string[]> = {};

  for (const siblingId of parent.nextResponseIds) {
    const siblingBatch = history.messages[siblingId];
    if (!siblingBatch?.userPromptId) continue;

    const siblingUserMessage = allMessages[siblingBatch.userPromptId] as ConversationUserInput;
    const siblingContent = extractMessageContent(siblingUserMessage?.content ?? []);

    if (!inputSiblingsMap[siblingContent]) {
      inputSiblingsMap[siblingContent] = [];
    }
    inputSiblingsMap[siblingContent].push(siblingId);
  }

  // Determine if siblings are input variants or response variants
  const inputVariants = Object.keys(inputSiblingsMap);

  if (inputVariants.length > 1) {
    const seenInputs = new Set<string>();
    const inputSiblings: string[] = [];

    for (const siblingId of parent.nextResponseIds) {
      const siblingBatch = history.messages[siblingId];
      if (!siblingBatch?.userPromptId) continue;

      const siblingUserMessage = allMessages[siblingBatch.userPromptId] as ConversationUserInput;
      const siblingContent = extractMessageContent(siblingUserMessage?.content ?? []);

      if (!seenInputs.has(siblingContent)) {
        seenInputs.add(siblingContent);
        inputSiblings.push(siblingId);
      }
    }

    const responseSiblings = inputSiblingsMap[currentContent] || [];

    return {
      inputSiblings,
      responseSiblings,
    };
  }

  return {
    inputSiblings: [],
    responseSiblings: inputSiblingsMap[currentContent] || [],
  };
};
