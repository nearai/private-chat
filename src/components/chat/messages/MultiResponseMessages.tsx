// import dayjs from "dayjs";
import type React from "react";
// import { useEffect, useState } from "react";

// import { useViewStore } from "@/stores/useViewStore";

// import ResponseMessage from "./ResponseMessage";
import type { Message as MessageOpenAI } from "openai/resources/conversations/conversations";

// interface GroupedMessages {
//   [modelIdx: number]: {
//     messageIds: string[];
//   };
// }

// interface GroupedMessagesIdx {
//   [modelIdx: number]: number;
// }

interface MultiResponseMessagesProps {
  message: MessageOpenAI;
  isLastMessage: boolean;
  readOnly: boolean;
  webSearchEnabled: boolean;
  saveMessage: (messageId: string, content: string) => void;
  deleteMessage: (messageId: string) => void;
  regenerateResponse: (message: MessageOpenAI) => Promise<void>;
  mergeResponses: () => void;
  showPreviousMessage: (message: MessageOpenAI) => void;
  showNextMessage: (message: MessageOpenAI) => void;
}

const MultiResponseMessages: React.FC<MultiResponseMessagesProps> = () => {
  return null;
  // const parent = null;
  // console.log("multiple message ", message);
  // const groupedMessageIds =
  //   parent?.models.reduce(
  //     (acc: GroupedMessages, model: string, modelIdx: number) => {
  //       // Find all messages that are children of the parent message and have the same model
  //       let modelMessageIds = parent.childrenIds
  //         .map((id: string) => history.messages[id])
  //         .filter((m: Message | undefined) => m?.modelIdx === modelIdx)
  //         .map((m: Message) => m.id);

  //       // Legacy support for messages that don't have a modelIdx
  //       if (modelMessageIds.length === 0) {
  //         const modelMessages = parent.childrenIds
  //           .map((id: string) => history.messages[id])
  //           .filter((m: Message | undefined) => m?.model === model);

  //         modelMessages.forEach((m: Message) => {
  //           m.modelIdx = modelIdx;
  //         });

  //         modelMessageIds = modelMessages.map((m: Message) => m.id);
  //       }

  //       return {
  //         ...acc,
  //         [modelIdx]: { messageIds: modelMessageIds },
  //       };
  //     },
  //     {} as GroupedMessages
  //   ) ?? {};

  // // const groupedMessageIdsIdx =
  // //   parent?.models.reduce(
  // //     (acc: GroupedMessagesIdx, _model: string, modelIdx: number) => {
  // //       const idx = groupedMessageIds?.[modelIdx]?.messageIds.findIndex(
  // //         (id: string) => id === messageId
  // //       );
  // //       if (idx !== -1) {
  // //         return {
  // //           ...acc,
  // //           [modelIdx]: idx,
  // //         };
  // //       } else {
  // //         return {
  // //           ...acc,
  // //           [modelIdx]: groupedMessageIds?.[modelIdx]?.messageIds?.length - 1,
  // //         };
  // //       }
  // //     },
  // //     {} as GroupedMessagesIdx
  // //   ) ?? {};

  // const [currentMessageId, setCurrentMessageId] = useState<string | null>(null);
  // const { isMobile } = useViewStore();

  // // const parentMessage = history.messages[messageId];
  // // const responses =
  // //   parentMessage?.childrenIds
  // //     ?.map((id) => history.messages[id])
  // //     .filter(Boolean) || [];

  // useEffect(() => {
  //   if (responses.length > 0 && !currentMessageId) {
  //     setCurrentMessageId(responses[responses.length - 1].id);
  //   }
  // }, [responses, currentMessageId]);

  // const updateMessageHistoryCurrentId = (messageId: string) => {
  //   console.log(messageId);
  // };

  // // const allMessagesDone = !Object.keys(groupedMessageIds).find(
  // //   (modelIdxStr) => {
  // //     const modelIdx = parseInt(modelIdxStr, 10);
  // //     const { messageIds } = groupedMessageIds[modelIdx];
  // //     const _messageId = messageIds?.[groupedMessageIdsIdx[modelIdx]];
  // //     return !(history.messages[_messageId]?.done ?? false);
  // //   }
  // // );

  // if (!parentMessage) return null;

  // return (
  //   <div>
  //     <div
  //       className="scrollbar-hidden flex snap-x snap-mandatory overflow-x-auto"
  //       id={`responses-container-${parentMessage.id}`}
  //     >
  //       {Object.keys(groupedMessageIds).map((modelIdxStr) => {
  //         const modelIdx = parseInt(modelIdxStr, 10);

  //         if (
  //           groupedMessageIdsIdx[modelIdx] === undefined ||
  //           !groupedMessageIds[modelIdx]?.messageIds ||
  //           groupedMessageIds[modelIdx].messageIds.length === 0
  //         ) {
  //           return null;
  //         }

  //         const _messageId =
  //           groupedMessageIds[modelIdx].messageIds[
  //             groupedMessageIdsIdx[modelIdx]
  //           ];

  //         const isCurrentMessage = false
  //           // history.messages[messageId]?.modelIdx === modelIdx;
  //         const borderClass = isCurrentMessage
  //           ? `border-gray-100 dark:border-gray-850 border-[1.5px] ${
  //               isMobile ? "min-w-full" : "min-w-80"
  //             }`
  //           : `border-gray-100 dark:border-gray-850 border-dashed ${
  //               isMobile ? "min-w-full" : "min-w-80"
  //             }`;

  //         return (
  //           <div
  //             key={modelIdx}
  //             className={`m-1 w-full max-w-full snap-center border ${borderClass} cursor-pointer rounded-2xl p-5 transition-all`}
  //             onClick={() => updateMessageHistoryCurrentId(_messageId)}
  //           >
  //             {/* {message && (
  //               <ResponseMessage
  //                 history={history}
  //                 messageId={_messageId}
  //                 isLastMessage={true}
  //                 siblings={groupedMessageIds[modelIdx].messageIds}
  //                 readOnly={readOnly}
  //                 webSearchEnabled={webSearchEnabled}
  //                 saveMessage={saveMessage}
  //                 deleteMessage={deleteMessage}
  //                 regenerateResponse={async (msg: Message) => {
  //                   console.log(msg);
  //                 }}
  //                 showPreviousMessage={showPreviousMessage}
  //                 showNextMessage={showNextMessage}
  //               />
  //             )} */}
  //           </div>
  //         );
  //       })}
  //     </div>

  //     {!readOnly && allMessagesDone && (
  //       <div className="flex justify-end">
  //         <div className="w-full">
  //           {/* {history.messages[messageId]?.merged?.status && (
  //             <div className="w-full rounded-xl py-2 pr-2 pl-5">
  //               <div className="flex items-center space-x-2">
  //                 <span className="font-medium">Merged Response</span>
  //                 {history.messages[messageId].merged.timestamp && (
  //                   <span className="-mt-0.5 invisible ml-0.5 self-center font-medium text-gray-400 text-xs uppercase group-hover:visible">
  //                     {dayjs(history.messages[messageId].merged.timestamp * 1000).format("LT")}
  //                   </span>
  //                 )}
  //               </div>

  //               <div className="markdown-prose mt-1 w-full min-w-full">
  //                 {!history.messages[messageId].merged.content ? (
  //                   <div className="text-gray-500 dark:text-gray-400">Loading...</div>
  //                 ) : (
  //                   <div className="markdown-content">{history.messages[messageId].merged.content}</div>
  //                 )}
  //               </div>
  //             </div>
  //           )} */}
  //         </div>

  //         {isLastMessage && (
  //           <div className="mt-1 shrink-0 text-gray-600 dark:text-gray-500">
  //             <button
  //               type="button"
  //               id="merge-response-button"
  //               className="regenerate-response-button visible rounded-lg p-1 transition hover:bg-black/5 hover:text-black dark:hover:bg-white/5 dark:hover:"
  //               onClick={mergeResponses}
  //               title={"Merge Responses"}
  //             >
  //               <svg
  //                 xmlns="http://www.w3.org/2000/svg"
  //                 className="size-5"
  //                 fill="none"
  //                 viewBox="0 0 24 24"
  //                 stroke="currentColor"
  //               >
  //                 <path
  //                   strokeLinecap="round"
  //                   strokeLinejoin="round"
  //                   strokeWidth={2}
  //                   d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4"
  //                 />
  //               </svg>
  //             </button>
  //           </div>
  //         )}
  //       </div>
  //     )}
  //   </div>
  // );
};

export default MultiResponseMessages;
