import { NearConnector } from "@hot-labs/near-connect";
import { fromHotConnect, generateNonce, Near } from "near-kit";
import { useEffect, useRef, useState } from "react";
import { useSearchParams } from "react-router";
import { authClient } from "@/api/auth/client";
import { useConfig } from "@/api/config/queries";
import NearAIIcon from "@/assets/icons/near-ai.svg?react";
import Spinner from "@/components/common/Spinner";
import { Button } from "@/components/ui/button";
import { CHAT_API_BASE_URL } from "@/api/constants";

const NearLogin = () => {
  const [searchParams] = useSearchParams();
  const [status, setStatus] = useState("Initializing...");
  const [error, setError] = useState<string | null>(null);
  const connectorRef = useRef<NearConnector | null>(null);
  const { data: config } = useConfig();
  const hasAttemptedRef = useRef(false);

  // Params from URL
  const callbackUrl = searchParams.get("frontend_callback");
  const oauthChannel = searchParams.get("oauth_channel");

  useEffect(() => {
    if (!config || hasAttemptedRef.current) return;
    
    // Only attempt once to avoid double invocation
    hasAttemptedRef.current = true;
    
    const performLogin = async () => {
      try {
        setStatus("Connecting to NEAR wallet...");
        
        const connector = connectorRef.current ?? new NearConnector({ network: "mainnet" });
        connectorRef.current = connector;

        await connector.connect();

        const near = new Near({
          network: "mainnet",
          wallet: fromHotConnect(connector),
        });

        setStatus("Requesting signature...");
        
        const nonce = generateNonce();
        const recipient = new URL(CHAT_API_BASE_URL).host;
        const message = `Sign in to ${config.name}`;

        // console.log("NEAR Login: Requesting signature for message:", message, "to recipient:", recipient);
        const signedMessage = await near.signMessage({ message, recipient, nonce });
        
        setStatus("Verifying signature...");
        const response = await authClient.sendNearAuth(
          signedMessage,
          { message, nonce, recipient },
          true,
        );

        setStatus("Redirecting...");

        // Construct redirect URL
        if (callbackUrl) {
          const redirectUrl = new URL(callbackUrl);
          redirectUrl.searchParams.set("token", response.token);
          redirectUrl.searchParams.set("session_id", response.session_id);
          redirectUrl.searchParams.set("is_new_user", String(response.is_new_user));
          if (oauthChannel) {
            redirectUrl.searchParams.set("oauth_channel", oauthChannel);
          }
          
          window.location.replace(redirectUrl.toString());
        } else {
          setError("No callback URL provided.");
        }
      } catch (err) {
        console.error("NEAR Login Error:", err);
        setError("Login failed. Please close this window and try again.");
      }
    };

    performLogin();
  }, [config, callbackUrl, oauthChannel]);

  const handleRetry = () => {
    window.location.reload();
  };

  useEffect(() => {
    return () => {
       hasAttemptedRef.current = false;
    };
  }, [])

  if (error) {
    return (
      <div className="flex h-screen flex-col items-center justify-center space-y-4 bg-background p-8 text-center text-foreground">
        <NearAIIcon className="h-8" />
        <h1 className="font-bold text-red-500 text-xl">Authentication Failed</h1>
        <p className="text-muted-foreground">{error}</p>
        <Button onClick={handleRetry} variant="default">Retry</Button>
      </div>
    );
  }

  return (
    <div className="flex h-screen flex-col items-center justify-center space-y-6 bg-background p-8 text-center text-foreground">
      <NearAIIcon className="h-8 animate-pulse" />
      <div className="space-y-2">
        <h1 className="font-bold text-2xl">Signing in to NEAR AI</h1>
        <p className="text-muted-foreground">{status}</p>
      </div>
      <Spinner className="h-8 w-8 text-primary" />
    </div>
  );
};

export default NearLogin;
