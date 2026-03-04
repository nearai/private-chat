import { useCallback, useEffect, useState } from "react";
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

export const useNearBalance = () => {
  const [userInfo, setUserInfo] = useState<User | null>(null);
  const [balance, setBalance] = useState<bigint | null>(null);
  const [loading, setLoading] = useState(false);
  const [isLowBalanceAndBasicPlan, setIsLowBalanceAndBasicPlan] = useState(false);
  const isOnline = useIsOnline();

  const checkBalance = useCallback(async (): Promise<boolean> => {
    if (!userInfo || !isOnline) return false;
    const userData = userInfo.user;
    const nearAccount = userInfo.linked_accounts?.find((a) => a.provider === "near");
    if (!nearAccount) return false;

    setLoading(true);
    try {
      const accountId = userData.name;
      const [balanceResult, subscriptions] = await Promise.all([
        getNearBalance(accountId),
        usersClient.getSubscriptions().catch(() => [] as Awaited<ReturnType<typeof usersClient.getSubscriptions>>),
      ]);

      setBalance(balanceResult);
      const lowByBalance = balanceResult < toYoctoNear(MIN_NEAR_BALANCE);
      const basicWithLowBalance = subscriptions.some(
        (s) => s.plan === "basic" && (s.is_low_balance || s.isLowBalance)
      );
      setIsLowBalanceAndBasicPlan(lowByBalance || basicWithLowBalance);
      return !lowByBalance && !basicWithLowBalance;
    } catch (error) {
      console.error("Failed to fetch NEAR balance:", error);
      setBalance(null);
      setIsLowBalanceAndBasicPlan(false);
      return false;
    } finally {
      setLoading(false);
    }
  }, [userInfo, isOnline]);

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
    if (!isOnline) return;
    checkBalance();
  }, [checkBalance, isOnline]);

  return { balance, isLowBalanceAndBasicPlan, loading, refetch: checkBalance };
};
