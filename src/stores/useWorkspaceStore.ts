import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { Workspace, WorkspaceStore } from "../types/enterprise";

const MAX_RECENT_WORKSPACES = 5;

export const useWorkspaceStore = create<WorkspaceStore>()(
  persist(
    (set, get) => ({
      currentWorkspace: null,
      workspaces: [],
      recentWorkspaces: [],
      isLoading: false,
      error: null,

      setCurrentWorkspace: (workspace: Workspace | null) => {
        set({ currentWorkspace: workspace, error: null });
        if (workspace) {
          get().addRecentWorkspace(workspace.id);
        }
      },

      setWorkspaces: (workspaces: Workspace[]) =>
        set({ workspaces, error: null }),

      addRecentWorkspace: (workspaceId: string) => {
        const { recentWorkspaces } = get();
        const filtered = recentWorkspaces.filter((id) => id !== workspaceId);
        const updated = [workspaceId, ...filtered].slice(0, MAX_RECENT_WORKSPACES);
        set({ recentWorkspaces: updated });
      },

      setLoading: (loading: boolean) => set({ isLoading: loading }),

      setError: (error: string | null) => set({ error, isLoading: false }),
    }),
    {
      name: "workspace-storage",
      partialize: (state) => ({
        currentWorkspace: state.currentWorkspace,
        recentWorkspaces: state.recentWorkspaces,
      }),
    }
  )
);
