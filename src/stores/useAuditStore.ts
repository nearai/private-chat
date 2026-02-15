import { create } from "zustand";
import type { AuditLog, AuditLogQuery, AuditStore } from "../types/enterprise";

const DEFAULT_QUERY: AuditLogQuery = {
  limit: 50,
  offset: 0,
};

export const useAuditStore = create<AuditStore>()((set, get) => ({
  logs: [],
  total: 0,
  query: { ...DEFAULT_QUERY },
  isLoading: false,
  error: null,

  setLogs: (logs: AuditLog[], total: number) =>
    set({ logs, total, error: null }),

  setQuery: (updates: Partial<AuditLogQuery>) => {
    const { query } = get();
    set({
      query: { ...query, ...updates },
    });
  },

  resetQuery: () => set({ query: { ...DEFAULT_QUERY } }),

  setLoading: (loading: boolean) => set({ isLoading: loading }),

  setError: (error: string | null) => set({ error, isLoading: false }),
}));
