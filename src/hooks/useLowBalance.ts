import { useMemo } from "react";
import { usePlans } from "@/api/users/queries/usePlans";
import { useActiveSubscription } from "@/hooks/useActiveSubscription";
import { useNearBalance } from "@/hooks/useNearBalance";
import { getPlan, isFreePlan } from "@/lib/plans";

/**
 * Returns whether the user has low NEAR balance in a context where it matters
 * (no subscription or on a free plan). Use to disable chat input and show warnings.
 */
export function useLowBalance() {
  const { activeSubscription } = useActiveSubscription();
  const { data: plans } = usePlans();
  // Conservative: treat unknown/missing plans as requiring NEAR so freemium gating is reliable
  const requiresNearBalance = useMemo(() => {
    if (!activeSubscription || !plans) {
      return true;
    }
    const plan = getPlan(plans, activeSubscription.plan);
    // If plan is not found, or if it is a free plan, it requires NEAR balance.
    return !plan || isFreePlan(plan);
  }, [activeSubscription, plans]);
  const { isBalanceLow, refetch, loading } = useNearBalance({ enabled: requiresNearBalance });
  const isLowBalance = useMemo(
    () => requiresNearBalance && isBalanceLow,
    [requiresNearBalance, isBalanceLow]
  );
  return { isLowBalance, refetch, loading };
}
