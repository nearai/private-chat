import type React from "react";
import { useMemo } from "react";
import { useProgressiveText } from "@/hooks/useProgressiveText";
import { MarkDown } from "./MarkdownTokens";

interface ProgressiveMessageContentProps {
  fullText: string;
  isStreaming: boolean;
  batchId: string;
  autoScroll?: boolean;
  onAutoScroll?: () => void;
}

const ProgressiveMessageContent: React.FC<ProgressiveMessageContentProps> = ({
  fullText,
  isStreaming,
  batchId,
  autoScroll,
  onAutoScroll,
}) => {
  const { displayedText } = useProgressiveText(fullText, {
    active: isStreaming,
    cadence: "chunk",
    onTick: autoScroll ? onAutoScroll : undefined,
  });

  const shouldShowCaret = useMemo(() => isStreaming && displayedText.length > 0, [displayedText.length, isStreaming]);

  return (
    <div className="markdown-content wrap-break-word">
      <MarkDown messageContent={displayedText} batchId={batchId} />
      {shouldShowCaret ? <span className="typing-caret">▍</span> : null}
    </div>
  );
};

export default ProgressiveMessageContent;
