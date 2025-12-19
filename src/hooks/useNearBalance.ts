import { useCallback, useEffect, useRef, useState } from "react";
import { fromHotConnect, Near } from "near-kit";
import { NearConnector } from "@hot-labs/near-connect";
import { LOCAL_STORAGE_KEYS } from "@/lib/constants";
import { usersClient } from "@/api/users/client";
import type { User } from "@/types";

export const MIN_NEAR_BALANCE = 1; // 1 NEAR

export const useNearBalance = () => {
  const [userInfo, setUserInfo] = useState<User | null>(null);
  const connectorRef = useRef<NearConnector | null>(null);
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
      const connector = connectorRef.current ?? new NearConnector({ network: "mainnet" });
      connectorRef.current = connector;
      const near = new Near({
        network: "mainnet",
        rpcUrl: "https://free.rpc.fastnear.com",
        wallet: fromHotConnect(connector),
      });

      const balanceStr = await near.getBalance(accountId);
      const balanceInNear = parseFloat(balanceStr);
      
      if (!isNaN(balanceInNear)) {
        setBalance(balanceInNear);
      }
    } catch (error) {
      console.error("Failed to fetch NEAR balance:", error);
    } finally {
      setLoading(false);
    }
  }, [userInfo])

  useEffect(() => {
    const token = localStorage.getItem(LOCAL_STORAGE_KEYS.TOKEN);
    if (!token) return;
    usersClient.getUserData().then((u) => {
      setUserInfo(u);
    });
  }, [])

  useEffect(() => {
    checkBalance();
  }, [trigger, checkBalance]);

  const isLowBalance = balance !== null && balance < MIN_NEAR_BALANCE;

  return { balance, isLowBalance, loading, refetch };
};
