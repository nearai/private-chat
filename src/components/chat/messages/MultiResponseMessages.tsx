// import dayjs from "dayjs";
import type React from "react";

// import { useEffect, useState } from "react";

// import { useViewStore } from "@/stores/useViewStore";

// import ResponseMessage from "./ResponseMessage";

import { useMemo } from "react";
import type { CombinedResponse } from "@/lib";
import { useViewStore } from "@/stores/useViewStore";
import type { ConversationItem } from "@/types";
import { getModelAndCreatedTimestamp } from "@/types/openai";
import ResponseMessage from "./ResponseMessage";

// interface GroupedMessages {
//   [modelIdx: number]: {
//     messageIds: string[];
//   };
// }

// interface GroupedMessagesIdx {
//   [modelIdx: number]: number;
// }

interface MultiResponseMessagesProps {
  history: { messages: Record<string, CombinedResponse> };
  batchId: string;
  currentBatchBundle: string[];
  allMessages: Record<string, ConversationItem>;
  isLastMessage: boolean;
  readOnly: boolean;
  regenerateResponse: () => void;
  showPreviousMessage: () => void;
  showNextMessage: () => void;
}

const MultiResponseMessages: React.FC<MultiResponseMessagesProps> = ({
  history,
  batchId,
  currentBatchBundle,
  allMessages,
  isLastMessage,
  readOnly,
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

  const groupedBatchIds = useMemo(
    () =>
      parent?.nextResponseIds.reduce(
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
    [parent?.nextResponseIds, history.messages, allMessages, currentBatchBundleObj]
  );

  // const groupedMessageIdsIdx =
  //   parent?.models.reduce(
  //     (acc: GroupedMessagesIdx, _model: string, modelIdx: number) => {
  //       const idx = groupedMessageIds?.[modelIdx]?.messageIds.findIndex(
  //         (id: string) => id === messageId
  //       );
  //       if (idx !== -1) {
  //         return {
  //           ...acc,
  //           [modelIdx]: idx,
  //         };
  //       } else {
  //         return {
  //           ...acc,
  //           [modelIdx]: groupedMessageIds?.[modelIdx]?.messageIds?.length - 1,
  //         };
  //       }
  //     },
  //     {} as GroupedMessagesIdx
  //   ) ?? {};

  // const [currentMessageId, setCurrentMessageId] = useState<string | null>(null);
  const { isMobile } = useViewStore();

  // const parentMessage = history.messages[messageId];
  // const responses =
  //   parentMessage?.childrenIds
  //     ?.map((id) => history.messages[id])
  //     .filter(Boolean) || [];

  // useEffect(() => {
  //   if (responses.length > 0 && !currentMessageId) {
  //     setCurrentMessageId(responses[responses.length - 1].id);
  //   }
  // }, [responses, currentMessageId]);

  // const updateMessageHistoryCurrentId = (messageId: string) => {
  //   console.log(messageId);
  // };

  // const allMessagesDone = !Object.keys(groupedMessageIds).find(
  //   (modelIdxStr) => {
  //     const modelIdx = parseInt(modelIdxStr, 10);
  //     const { messageIds } = groupedMessageIds[modelIdx];
  //     const _messageId = messageIds?.[groupedMessageIdsIdx[modelIdx]];
  //     return !(history.messages[_messageId]?.done ?? false);
  //   }
  // );

  if (!parent) return null;

  return (
    <div>
      <div
        className="scrollbar-hidden flex snap-x snap-mandatory overflow-x-auto"
        id={`responses-container-${batchId}`}
      >
        {Object.values(groupedBatchIds).map(({ batchIds, currentIdx }) => {
          const isCurrentMessage = currentBatchBundleObj[batchIds[currentIdx]] !== undefined;
          // history.messages[messageId]?.modelIdx === modelIdx;
          const borderClass = isCurrentMessage
            ? `border-gray-100 dark:border-gray-850 border-[1.5px] ${isMobile ? "min-w-full" : "min-w-80"}`
            : `border-gray-100 dark:border-gray-850 border-dashed ${isMobile ? "min-w-full" : "min-w-80"}`;

          return (
            <div
              key={batchIds[currentIdx]}
              className={`m-1 w-full max-w-full snap-center border ${borderClass} cursor-pointer rounded-2xl p-5 transition-all`}
              onClick={() => console.log(batchIds[currentIdx])}
            >
              {history.messages[batchIds[currentIdx]] && (
                <ResponseMessage
                  history={history}
                  allMessages={allMessages}
                  batchId={batchIds[currentIdx]}
                  isLastMessage={true}
                  siblings={batchIds}
                  readOnly={readOnly}
                  regenerateResponse={() => {
                    console.log("msg");
                  }}
                  showPreviousMessage={() => console.log(batchIds[currentIdx])}
                  showNextMessage={() => console.log(batchIds[currentIdx])}
                />
              )}
            </div>
          );
        })}
      </div>

      {/* {!readOnly && allMessagesDone && (
        <div className="flex justify-end">
          <div className="w-full">
            {history.messages[messageId]?.merged?.status && (
              <div className="w-full rounded-xl py-2 pr-2 pl-5">
                <div className="flex items-center space-x-2">
                  <span className="font-medium">Merged Response</span>
                  {history.messages[messageId].merged.timestamp && (
                    <span className="-mt-0.5 invisible ml-0.5 self-center font-medium text-gray-400 text-xs uppercase group-hover:visible">
                      {dayjs(history.messages[messageId].merged.timestamp * 1000).format("LT")}
                    </span>
                  )}
                </div>

                <div className="markdown-prose mt-1 w-full min-w-full">
                  {!history.messages[messageId].merged.content ? (
                    <div className="text-gray-500 dark:text-gray-400">Loading...</div>
                  ) : (
                    <div className="markdown-content">{history.messages[messageId].merged.content}</div>
                  )}
                </div>
              </div>
            )}
          </div>

          {isLastMessage && (
            <div className="mt-1 shrink-0 text-gray-600 dark:text-gray-500">
              <button
                type="button"
                id="merge-response-button"
                className="regenerate-response-button visible rounded-lg p-1 transition hover:bg-black/5 hover:text-black dark:hover:bg-white/5"
                onClick={mergeResponses}
                title={"Merge Responses"}
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="size-5"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4"
                  />
                </svg>
              </button>
            </div>
          )}
        </div>
      )} */}
    </div>
  );
};

export default MultiResponseMessages;
