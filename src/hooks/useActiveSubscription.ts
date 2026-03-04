import { useMemo } from "react";
import { useSubscriptions } from "@/api/users/queries/useSubscriptions";
import type { Subscription } from "@/types";

function isActiveStatus(status: string) {
  return status === "active" || status === "trialing";
}

/** Returns the current active subscription of the user if available. */
export function useActiveSubscription() {
  const { data: subscriptions, isLoading } = useSubscriptions();
  const activeSubscription = useMemo<Subscription | undefined>(
    () => subscriptions?.find((s) => isActiveStatus(s.status)),
    [subscriptions]
  );
  return { activeSubscription, isLoading };
}
