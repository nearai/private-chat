import { useCallback, useEffect, useState } from "react";
import { LOCAL_STORAGE_KEYS } from "@/lib/constants";
import { usersClient } from "@/api/users/client";
import type { User } from "@/types";
import { NEAR_RPC_URL } from "@/api/constants";

export const MIN_NEAR_BALANCE = 1; // 1 NEAR

async function getNearBalance(accountId: string, retries: number = 3) {
  const rpcUrl = NEAR_RPC_URL;
  
  for (let i = 0; i <= retries; i++) {
    try {
      const response = await fetch(rpcUrl, {
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
      // Wait before retrying (exponential backoff: 1s, 2s, 4s)
      await new Promise((resolve) => setTimeout(resolve, 500 * 2 ** i));
    }
  }
  
  throw new Error("Failed to fetch NEAR balance");
}

function toYoctoNear(amount: number) {
  return BigInt(amount) * 10n ** 24n;
}

export const useNearBalance = () => {
  const [userInfo, setUserInfo] = useState<User | null>(null);
  const [balance, setBalance] = useState<bigint | null>(null);
  const [loading, setLoading] = useState(false);
  const [isLowBalance, setIsLowBalance] = useState(false);

  const checkBalance = useCallback(async (): Promise<boolean> => {
    if (!userInfo) return false;
    const userData = userInfo.user;
    
    const nearAccount = userInfo.linked_accounts?.find(a => a.provider === 'near');
    if (!nearAccount) return false;

    setLoading(true);
    try {
      const accountId = userData.name;
      const balance = await getNearBalance(accountId);

      setBalance(balance);
      const status = balance >= toYoctoNear(MIN_NEAR_BALANCE);
      setIsLowBalance(!status);
      return status;
    } catch (error) {
      console.error("Failed to fetch NEAR balance:", error);
      setBalance(null);
      setIsLowBalance(false);
      return false;
    } finally {
      setLoading(false);
    }
  }, [userInfo])

  useEffect(() => {
    const token = localStorage.getItem(LOCAL_STORAGE_KEYS.TOKEN);
    if (!token) return;
    usersClient.getUserData().then((u) => {
      setUserInfo(u);
    }).catch((err) => {
      console.error("Failed to fetch user data:", err);
    });
  }, [])

  useEffect(() => {
    checkBalance();
  }, [checkBalance]);

  return { balance, isLowBalance, loading, refetch: checkBalance };
};
