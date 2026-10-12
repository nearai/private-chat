import { useMutation } from "@tanstack/react-query";
import { revokeCurrentSessionAndLogout } from "@/lib/logout";
import { toast } from "sonner";
import { useExportStore } from "@/stores/useExportStore";

export const useSignOut = () => {
  return useMutation({
    mutationFn: () => {
      useExportStore.getState().stop();
      return revokeCurrentSessionAndLogout();
    },
    onError: () => {
      toast.error("Unable to sign out. Please check your connection and try again.");
    },
  });
};
