import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { ViewStore } from "../types";

export const useViewStore = create<ViewStore>()(
  persist(
    (set) => ({
      isMobile: false,
      setIsMobile: (isMobile: boolean) => set({ isMobile }),
      isLeftSidebarOpen: true,
      setIsLeftSidebarOpen: (isOpen: boolean) => set({ isLeftSidebarOpen: isOpen }),
      isRightSidebarOpen: false,
      setIsRightSidebarOpen: (isOpen: boolean) => set({ isRightSidebarOpen: isOpen }),
      selectedMessageIdForVerifier: null,
      setSelectedMessageIdForVerifier: (messageId: string | null) => set({ selectedMessageIdForVerifier: messageId }),
      shouldScrollToSignatureDetails: false,
      setShouldScrollToSignatureDetails: (should: boolean) => set({ shouldScrollToSignatureDetails: should }),
      selectedTab: "assistant",
      setSelectedTab: (tab: "chat" | "assistant") => set({ selectedTab: tab }),
    }),
    {
      name: "view-storage",
      // Reset to default on rehydration
      onRehydrateStorage: () => (state) => {
        console.log("ViewStore rehydrated:", state);
        // Force sidebar to be open on app start
        if (state) {
          state.isLeftSidebarOpen = window.innerWidth > 768;
        }
      },
    }
  )
);
