import { useCallback, useEffect, useMemo, useState } from "react";
import { LOCAL_STORAGE_KEYS } from "@/lib/constants";
import { usersClient } from "@/api/users/client";
import type { User } from "@/types";
import { NEAR_RPC_URL } from "@/api/constants";
import { useIsOnline } from "@/hooks/useIsOnline";

export const MIN_NEAR_BALANCE = 1; // 1 NEAR

export async function getNearBalance(accountId: string, retries: number = 3) {
  for (let i = 0; i <= retries; i++) {
    try {
      const response = await fetch(NEAR_RPC_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          jsonrpc: "2.0",
          id: "dontcare",
          method: "query",
          params: {
            request_type: "view_account",
            finality: "final",
            account_id: accountId,
          },
        }),
      });

      const data = await response.json();

      if (data.error) {
        throw new Error(data.error.message || "Failed to query account balance");
      }

      return BigInt(data.result.amount);
    } catch (error) {
      if (i === retries) {
        throw error;
      }
      // Wait before retrying (exponential backoff)
      await new Promise((resolve) => setTimeout(resolve, 500 * 2 ** i));
    }
  }

  throw new Error("Failed to fetch NEAR balance");
}

export function toYoctoNear(amount: number) {
  return BigInt(amount) * 10n ** 24n;
}

export interface UseNearBalanceOptions {
  /** When false, skips fetching. Use when user doesn't need NEAR (e.g. paid plan). */
  enabled?: boolean;
}

export const useNearBalance = (options: UseNearBalanceOptions = {}) => {
  const { enabled = true } = options;
  const [userInfo, setUserInfo] = useState<User | null>(null);
  const [balance, setBalance] = useState<bigint | null>(null);
  const [loading, setLoading] = useState(false);
  const isOnline = useIsOnline();

  const isNearLinked = useMemo(() => {
    if (!userInfo) return false;
    const nearAccount = userInfo.linked_accounts?.find((a) => a.provider === "near");
    return !!nearAccount;
  }, [userInfo]);

  const isBalanceLow = useMemo(
    () => balance !== null && balance < toYoctoNear(MIN_NEAR_BALANCE),
    [balance]
  );

  const checkBalance = useCallback(async (): Promise<boolean> => {
    if (!userInfo || !isOnline || !isNearLinked) return false;

    setLoading(true);
    try {
      const accountId = userInfo.user.name;
      const balanceResult = await getNearBalance(accountId);
      setBalance(balanceResult);
      return balanceResult >= toYoctoNear(MIN_NEAR_BALANCE);
    } catch (error) {
      console.error("Failed to fetch NEAR balance:", error);
      setBalance(null);
      return false;
    } finally {
      setLoading(false);
    }
  }, [userInfo, isOnline, isNearLinked]);

  useEffect(() => {
    if (!isOnline) return;
    const token = localStorage.getItem(LOCAL_STORAGE_KEYS.TOKEN);
    if (!token) return;
    usersClient
      .getUserData()
      .then((u) => {
        setUserInfo(u);
      })
      .catch((err) => {
        console.error("Failed to fetch user data:", err);
      });
  }, [isOnline]);

  useEffect(() => {
    if (!enabled || !isOnline || balance !== null || !isNearLinked) return;
    checkBalance();
  }, [enabled, checkBalance, isOnline, balance, isNearLinked]);

  return { balance, isBalanceLow, loading, refetch: checkBalance };
};
