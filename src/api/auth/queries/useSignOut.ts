import { useMutation } from "@tanstack/react-query";
import { authClient } from "../client";
import { eventEmitter } from "@/lib/event";
import { useExportStore } from "@/stores/useExportStore";

export const useSignOut = () => {
  return useMutation({
    mutationFn: () => {
      useExportStore.getState().stop();
      return authClient.signOut();
    },
    onSuccess: () => {
      eventEmitter.emit('logout');
    },
  });
};
