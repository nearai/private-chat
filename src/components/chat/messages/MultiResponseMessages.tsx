import type React from "react";
import { useMemo } from "react";
import { cn, type CombinedResponse } from "@/lib";
import { useViewStore } from "@/stores/useViewStore";
import { useMessagesStore } from "@/stores/useMessagesStore";
import type { ChatStartStreamOptions, ConversationItem } from "@/types";
import { getModelAndCreatedTimestamp } from "@/types/openai";
import ResponseMessage from "./ResponseMessage";

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
  const { isMobile } = useViewStore();
  const { getSelectedResponseVersion, setSelectedResponseVersion } = useMessagesStore();
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
    () => {
      const groups = siblingsToGroup.reduce(
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
          acc[model].createdTimestamp = Math.min(
            acc[model].createdTimestamp ?? Infinity,
            createdTimestamp ?? Infinity
          );
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
      ) ?? {};

      if (parentId) {
        Object.keys(groups).forEach((model) => {
          const selectedVersion = getSelectedResponseVersion(parentId, model);
          if (selectedVersion) {
            const idx = groups[model].batchIds.indexOf(selectedVersion);
            if (idx !== -1) {
              groups[model].currentIdx = idx;
            }
          }
        });
      }
      return groups;
    },
    [siblingsToGroup, history.messages, allMessages, currentBatchBundleObj, parentId, getSelectedResponseVersion]
  );

  const messageList = useMemo(() => {
    return Object.keys(groupedBatchIds)
      .sort((m1, m2) => m1.localeCompare(m2))
      .map((model) => groupedBatchIds[model]);
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
                  onResponseVersionChange={(batchId, model) => {
                    if (parentId) {
                      setSelectedResponseVersion(parentId, model, batchId);
                    }
                  }}
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
