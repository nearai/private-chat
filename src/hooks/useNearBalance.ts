import { useCallback, useEffect, useRef, useState } from "react";
import { JsonRpcProvider } from "@near-js/providers";
import { NEAR } from "@near-js/tokens";
import { LOCAL_STORAGE_KEYS } from "@/lib/constants";
import { usersClient } from "@/api/users/client";
import type { User } from "@/types";
import { NEAR_RPC_URL } from "@/api/constants";

export const MIN_NEAR_BALANCE = 1; // 1 NEAR

export const useNearBalance = () => {
  const [userInfo, setUserInfo] = useState<User | null>(null);
  const rpcProviderRef = useRef<JsonRpcProvider | null>(null);
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
      if (!rpcProviderRef.current) {
        rpcProviderRef.current = new JsonRpcProvider({
          url: NEAR_RPC_URL
        });
      }

      const accountId = userData.name;
      const account = await rpcProviderRef.current.viewAccount(accountId);
      const balance = account.amount;
      
      if (balance) {
        setBalance(balance);
        const status = balance >= NEAR.toUnits(MIN_NEAR_BALANCE);
        setIsLowBalance(!status);
        return status;
      } else {
        setBalance(null);
        setIsLowBalance(false);
        return false;
      }
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
