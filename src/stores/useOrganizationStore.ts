import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { Organization, OrganizationStore } from "../types/enterprise";

export const useOrganizationStore = create<OrganizationStore>()(
  persist(
    (set) => ({
      currentOrganization: null,
      organizations: [],
      isLoading: false,
      error: null,

      setCurrentOrganization: (org: Organization | null) =>
        set({ currentOrganization: org, error: null }),

      setOrganizations: (orgs: Organization[]) =>
        set({ organizations: orgs, error: null }),

      setLoading: (loading: boolean) => set({ isLoading: loading }),

      setError: (error: string | null) => set({ error, isLoading: false }),
    }),
    {
      name: "organization-storage",
      partialize: (state) => ({
        currentOrganization: state.currentOrganization,
      }),
    }
  )
);
