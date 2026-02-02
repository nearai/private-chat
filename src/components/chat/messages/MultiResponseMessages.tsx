import type React from "react";
import { useMemo } from "react";
import { cn, type CombinedResponse } from "@/lib";
import { useViewStore } from "@/stores/useViewStore";
import type { ChatStartStreamOptions, ConversationItem } from "@/types";
import { getModelAndCreatedTimestamp } from "@/types/openai";
import ResponseMessage from "./ResponseMessage";
import { useChatStore } from "@/stores/useChatStore";

interface MultiResponseMessagesProps {
  history: { messages: Record<string, CombinedResponse> };
  batchId: string;
  currentBatchBundle: string[];
  allMessages: Record<string, ConversationItem>;
  isLastMessage: boolean;
  readOnly: boolean;
  regenerateResponse: (options: ChatStartStreamOptions) => Promise<void>;
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
  const { selectedModels } = useChatStore();
  const { isMobile } = useViewStore();
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
          const { model, createdTimestamp } = getModelAndCreatedTimestamp(batch, allMessages);

          if (!model) return acc;

          if (!acc[model]) {
            acc[model] = {
              batchIds: [],
              currentIdx: 0,
              createdTimestamp,
            };
          }

          acc[model].batchIds.push(id);
          // Set current index according to current batch bundle
          if (currentBatchBundleObj[id]) {
            acc[model].currentIdx = acc[model].batchIds.length - 1;
          }

          return acc;
        },
        {} as Record<string, {
          batchIds: string[];
          currentIdx: number;
          createdTimestamp: number | null;
        }>
      ) ?? {},
    [siblingsToGroup, history.messages, allMessages, currentBatchBundleObj]
  );

  const messageList = useMemo(() => {
    // If all selected models are present, return them in the order of selected models
    if (
      Object.keys(groupedBatchIds).length === selectedModels.length &&
      selectedModels.every((model) => Object.keys(groupedBatchIds).includes(model))
    ) {
      return selectedModels.map((model) => groupedBatchIds[model]);
    }

    // Otherwise, return sorted by createdTimestamp
    return Object.values(groupedBatchIds).sort((a, b) => {
      if (a.createdTimestamp === null) return 1;
      if (b.createdTimestamp === null) return -1;
      return a.createdTimestamp - b.createdTimestamp;
    });
  }, [groupedBatchIds]);

  if (!parent) return null;

  return (
    <div>
      <div
        className="scrollbar-hidden flex snap-x snap-mandatory overflow-x-auto"
        id={`responses-container-${batchId}`}
      >
        {messageList.map(({ batchIds, currentIdx }) => {
          const isSeveralModels = Object.keys(groupedBatchIds).length > 1;
          return (
            <div
              key={batchIds[currentIdx]}
              className={cn(`m-1 w-full max-w-full snap-center rounded-2xl transition-all`, {
                'p-5': isSeveralModels,
                [`border-[1.5px] border-gray-300 dark:border-gray-700 ${isMobile ? "min-w-full" : "min-w-[10vw]"}`]: isSeveralModels,
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
