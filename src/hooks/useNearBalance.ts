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
  const [trigger, setTrigger] = useState(0);

  const refetch = () => setTrigger((t) => t + 1);

  const checkBalance = useCallback(async () => {
    if (!userInfo) return;
    const userData = userInfo.user;
    
    const nearAccount = userInfo.linked_accounts?.find(a => a.provider === 'near');
    if (!nearAccount) return;

    const accountId = userData.name;
    setLoading(true);
    try {
      if (!nearRef.current) {
        const connector =  new NearConnector({ network: "mainnet" });
        nearRef.current = new Near({
          network: "mainnet",
          rpcUrl: "https://rpc.mainnet.near.org",
          wallet: fromHotConnect(connector),
        });
      }

      const balanceStr = await nearRef.current.getBalance(accountId);
      const balanceInNear = parseFloat(balanceStr);
      
      if (!isNaN(balanceInNear)) {
        setBalance(balanceInNear);
      } else {
        setBalance(null);
      }
    } catch (error) {
      console.error("Failed to fetch NEAR balance:", error);
      setBalance(null);
    } finally {
      setLoading(false);
    }
  }, [userInfo])

  useEffect(() => {
    const token = localStorage.getItem(LOCAL_STORAGE_KEYS.TOKEN);
    if (!token) return;
    usersClient.getUserData().then((u) => {
      setUserInfo(u);
    })
    .catch((error) => {
      console.error("Failed to fetch user data:", error);
    });
  }, [])

  useEffect(() => {
    checkBalance();
  }, [trigger, checkBalance]);

  const isLowBalance = balance !== null && balance < MIN_NEAR_BALANCE;

  return { balance, isLowBalance, loading, refetch };
};
