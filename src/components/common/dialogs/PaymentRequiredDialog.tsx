import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { IRONCLAW_URL } from "@/lib/constants";
import { eventEmitter } from "@/lib/event";
import { useEffect, useState } from "react";

export function PaymentRequiredDialog() {
  const [open, setOpen] = useState(false);

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
    window.open(IRONCLAW_URL, "_blank");
    setOpen(false);
  };

  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Subscription Expired</AlertDialogTitle>
          <AlertDialogDescription>
            Your tokens have been exhausted. Please renew your subscription to continue using the service.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogAction onClick={handleConfirm}>
            Renew Subscription
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
