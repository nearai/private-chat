import { useMemo } from "react";
import { usePlans } from "@/api/subscriptions/queries/usePlans";
import { useActiveSubscription } from "@/hooks/useActiveSubscription";
import { useNearBalance } from "@/hooks/useNearBalance";
import { getPlan, isFreePlan } from "@/lib/plans";

/**
 * Returns whether the user has low NEAR balance in a context where it matters
 * (no subscription or on a free plan). Use to disable chat input and show warnings.
 */
export function useLowBalance() {
  const { activeSubscription } = useActiveSubscription();
  const { data: apiPlans } = usePlans();
  const requiresNearBalance = useMemo(
    () => !activeSubscription || isFreePlan(getPlan(apiPlans, activeSubscription?.plan)),
    [activeSubscription, apiPlans]
  );
  const { isBalanceLow, refetch, loading } = useNearBalance({ enabled: requiresNearBalance });
  const isLowBalance = useMemo(
    () => requiresNearBalance && isBalanceLow,
    [requiresNearBalance, isBalanceLow]
  );
  return { isLowBalance, refetch, loading };
}
