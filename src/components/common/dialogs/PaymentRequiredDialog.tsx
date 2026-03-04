import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useActiveSubscription } from "@/hooks/useActiveSubscription";
import { AGENT_BILLING_URL, AGENT_URL } from "@/lib/constants";
import { eventEmitter } from "@/lib/event";
import { useEffect, useState } from "react";

export function PaymentRequiredDialog() {
  const [open, setOpen] = useState(false);
  const { activeSubscription } = useActiveSubscription();

  useEffect(() => {
    const handlePaymentRequired = () => {
      setOpen(true);
    };

    eventEmitter.on("payment_required", handlePaymentRequired);
    return () => {
      eventEmitter.off("payment_required", handlePaymentRequired);
    };
  }, []);

  const handleConfirm = () => {
    window.open(activeSubscription ? AGENT_BILLING_URL : AGENT_URL, "_blank");
    setOpen(false);
  };

  const handleLinkClick = () => {
    setOpen(false);
  };

  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Not Enough Credits</AlertDialogTitle>
          <AlertDialogDescription asChild>
            <div className="space-y-2">
              {activeSubscription ? (
                <p>
                  You don't have enough credits. Please visit{" "}
                  <a
                    href={AGENT_BILLING_URL}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="underline hover:no-underline"
                    onClick={handleLinkClick}
                  >
                    agent.near.ai/billing
                  </a>{" "}
                  to upgrade your subscription plan or add more credits.
                </p>
              ) : (
                <p>
                  To continue using Private Chat, subscribe to a plan at{" "}
                  <a
                    href={AGENT_URL}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="underline hover:no-underline"
                    onClick={handleLinkClick}
                  >
                    agent.near.ai
                  </a>{" "}
                  and deploy your own private and secure AI agents.
                </p>
              )}
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Close</AlertDialogCancel>
          <AlertDialogAction onClick={handleConfirm}>
            {activeSubscription ? "Upgrade Plan" : "Subscribe Now"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
