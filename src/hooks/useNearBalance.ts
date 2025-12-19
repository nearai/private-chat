import { useCallback, useEffect, useRef, useState } from "react";
import { fromHotConnect, Near } from "near-kit";
import { NearConnector } from "@hot-labs/near-connect";
import { LOCAL_STORAGE_KEYS } from "@/lib/constants";
import { usersClient } from "@/api/users/client";
import type { User } from "@/types";

export const MIN_NEAR_BALANCE = 1; // 1 NEAR

export const useNearBalance = () => {
  const [userInfo, setUserInfo] = useState<User | null>(null);
  const nearRef = useRef<Near | null>(null);
  const [balance, setBalance] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [isLowBalance, setIsLowBalance] = useState(false);

  const checkBalance = useCallback(async (): Promise<boolean> => {
    if (!userInfo) return false;
    const userData = userInfo.user;
    
    const nearAccount = userInfo.linked_accounts?.find(a => a.provider === 'near');
    if (!nearAccount) return false;

    const accountId = userData.name;
    setLoading(true);
    try {
      if (!nearRef.current) {
        const connector =new NearConnector({ network: "mainnet" });
        nearRef.current = new Near({
          network: "mainnet",
          rpcUrl: "https://free.rpc.fastnear.com",
          wallet: fromHotConnect(connector),
        });
      }
     
      const balanceStr = await nearRef.current.getBalance(accountId);
      const balanceInNear = parseFloat(balanceStr);
      
      if (!isNaN(balanceInNear)) {
        setBalance(balanceInNear);
        const status = balanceInNear >= MIN_NEAR_BALANCE;
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
