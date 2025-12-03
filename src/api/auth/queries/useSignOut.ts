import { useMutation } from "@tanstack/react-query";
import { authClient } from "../client";
import { eventEmitter } from "@/lib/event";

export const useSignOut = () => {
  return useMutation({
    mutationFn: () => authClient.signOut(),
    onSuccess: () => {
      eventEmitter.emit('logout');
    },
  });
};
