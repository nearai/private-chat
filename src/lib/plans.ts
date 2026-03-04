import type { Plan } from "@/types";

export function getPlan(
  plans: Plan[] | undefined,
  planName: string | undefined
): Plan | undefined {
  return planName ? plans?.find((p) => p.name === planName) : undefined;
}

/** Returns true if the plan is free (price === 0), e.g. NEAR-funded / pay-per-usage. */
export function isFreePlan(plan?: Plan | null): boolean {
  return plan?.price === 0;
}
