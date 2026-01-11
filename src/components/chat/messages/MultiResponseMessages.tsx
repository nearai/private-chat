import type React from "react";
import { useMemo } from "react";
import { cn, type CombinedResponse } from "@/lib";
import { useViewStore } from "@/stores/useViewStore";
import type { ConversationItem } from "@/types";
import { type ContentItem, getModelAndCreatedTimestamp } from "@/types/openai";
import ResponseMessage from "./ResponseMessage";

interface MultiResponseMessagesProps {
  history: { messages: Record<string, CombinedResponse> };
  batchId: string;
  currentBatchBundle: string[];
  allMessages: Record<string, ConversationItem>;
  isLastMessage: boolean;
  readOnly: boolean;
  regenerateResponse: (
    content: ContentItem[],
    webSearchEnabled: boolean,
    conversationId?: string,
    previous_response_id?: string,
    currentModel?: string
  ) => Promise<void>;
  responseSiblings?: string[];
}

const MultiResponseMessages: React.FC<MultiResponseMessagesProps> = ({
  history,
  batchId,
  currentBatchBundle,
  allMessages,
  isLastMessage,
  readOnly,
  regenerateResponse,
  responseSiblings,
}) => {
  const parentId = history.messages[batchId].parentResponseId;
  const parent = parentId ? history.messages[parentId] : null;

  const currentBatchBundleObj = currentBatchBundle.reduce(
    (acc, id) => {
      acc[id] = history.messages[id];
      return acc;
    },
    {} as Record<string, CombinedResponse>
  );

  // Use responseSiblings if provided, otherwise fall back to parent's nextResponseIds
  const siblingsToGroup = responseSiblings || parent?.nextResponseIds || [];

  const groupedBatchIds = useMemo(
    () =>
      siblingsToGroup.reduce(
        (acc, id) => {
          const batch = history.messages[id];
          if (!batch) return acc;
          const { model } = getModelAndCreatedTimestamp(batch, allMessages);

          if (!model) return acc;

          if (!acc[model]) {
            acc[model] = { batchIds: [], currentIdx: 0 };
          }

          acc[model].batchIds.push(id);
          // Set current index according to current batch bundle
          if (currentBatchBundleObj[id]) {
            acc[model].currentIdx = acc[model].batchIds.length - 1;
          }

          return acc;
        },
        {} as Record<string, { batchIds: string[]; currentIdx: number }>
      ) ?? {},
    [siblingsToGroup, history.messages, allMessages, currentBatchBundleObj]
  );

  const { isMobile } = useViewStore();

  if (!parent) return null;

  return (
    <div>
      <div
        className="scrollbar-hidden flex snap-x snap-mandatory overflow-x-auto"
        id={`responses-container-${batchId}`}
      >
        {Object.values(groupedBatchIds).map(({ batchIds, currentIdx }) => {
          const isCurrentMessage = currentBatchBundleObj[batchIds[currentIdx]] !== undefined;
          const isSeveralModels = Object.keys(groupedBatchIds).length > 1;
          const borderClass = isCurrentMessage
            ? `border border-gray-300 dark:border-gray-700 border-[1.5px] ${isMobile ? "min-w-full" : "min-w-80"}`
            : `border border-gray-300 dark:border-gray-700 border-dashed ${isMobile ? "min-w-full" : "min-w-80"}`;

          return (
            <div
              key={batchIds[currentIdx]}
              data-role={isCurrentMessage ? "current-response-message" : "other-response-message"}
              className={cn(`m-1 w-full max-w-full cursor-pointer snap-center rounded-2xl transition-all`, {
                'p-5': isSeveralModels,
                [borderClass]: isSeveralModels,
              })}
            >
              {history.messages[batchIds[currentIdx]] && (
                <ResponseMessage
                  history={history}
                  allMessages={allMessages}
                  batchId={batchIds[currentIdx]}
                  isLastMessage={isLastMessage}
                  siblings={batchIds}
                  readOnly={readOnly}
                  regenerateResponse={regenerateResponse}
                />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default MultiResponseMessages;
