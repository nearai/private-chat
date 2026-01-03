import { useCallback, useEffect, useLayoutEffect, useState } from "react";
import type { ConversationDerivedState } from "@/stores/useConversationStore";

export const useScrollHandler = (
  scrollContainerRef: React.RefObject<HTMLDivElement | null>,
  conversationState: ConversationDerivedState | undefined,
  chatId: string | undefined
) => {
  const [autoScroll, setAutoScroll] = useState(true);

  const scrollToBottom = useCallback(() => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollTop = scrollContainerRef.current.scrollHeight;
    }
  }, [scrollContainerRef.current]);

  const handleScroll = useCallback(() => {
    if (!scrollContainerRef.current) return;

    const { scrollHeight, scrollTop, clientHeight } = scrollContainerRef.current;
    const isAtBottom = scrollHeight - scrollTop <= clientHeight + 5;

    setAutoScroll(isAtBottom);
  }, [scrollContainerRef.current]);

  useEffect(() => {
    if (!conversationState || !scrollContainerRef.current) return;

    requestAnimationFrame(() => {
      if (!scrollContainerRef.current) return;

      const { scrollHeight, scrollTop, clientHeight } = scrollContainerRef.current;
      const isAtBottom = scrollHeight - scrollTop <= clientHeight + 5;

      if (isAtBottom) {
        setAutoScroll(true);
        scrollToBottom();
      } else if (autoScroll) {
        scrollToBottom();
      }
    });
  }, [scrollToBottom, autoScroll, conversationState, scrollContainerRef.current]);

  useLayoutEffect(() => {
    if (!chatId || !scrollContainerRef.current) return;

    const frameId = requestAnimationFrame(() => {
      scrollToBottom();
    });
    return () => cancelAnimationFrame(frameId);
  }, [chatId, scrollToBottom, scrollContainerRef.current]);

  return {
    handleScroll,
    scrollToBottom,
    autoScroll,
  };
};
