import { useEffect, useState } from "react";
import { AGENT_BILLING_URL, AGENT_HOST, AGENT_URL } from "@/api/constants";
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
import { eventEmitter } from "@/lib/event";

export function ModelNotAllowedDialog() {
  const [open, setOpen] = useState(false);
  const [model, setModel] = useState<string>("");
  const { activeSubscription } = useActiveSubscription();

  useEffect(() => {
    const handleModelNotAllowed = ({ model }: { model: string; plan?: string }) => {
      setModel(model);
      setOpen(true);
    };

    eventEmitter.on("model_not_allowed", handleModelNotAllowed);
    return () => {
      eventEmitter.off("model_not_allowed", handleModelNotAllowed);
    };
  }, []);

  const handleConfirm = () => {
    window.open(
      activeSubscription ? AGENT_BILLING_URL : AGENT_URL,
      "_blank",
      "noopener,noreferrer"
    );
    setOpen(false);
  };

  const handleLinkClick = () => {
    setOpen(false);
  };

  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Upgrade to access this model</AlertDialogTitle>
          <AlertDialogDescription asChild>
            <div className="space-y-2">
              <p>
                {model ? (
                  <>
                    <span className="font-medium">{model}</span> isn't included in your current plan.
                  </>
                ) : (
                  <>This model isn't included in your current plan.</>
                )}{" "}
                {activeSubscription ? (
                  <>
                    Upgrade your subscription at{" "}
                    <a
                      href={AGENT_BILLING_URL}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="underline hover:no-underline"
                      onClick={handleLinkClick}
                    >
                      {`${AGENT_HOST}/billing`}
                    </a>{" "}
                    to get access.
                  </>
                ) : (
                  <>
                    Subscribe to a plan at{" "}
                    <a
                      href={AGENT_URL}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="underline hover:no-underline"
                      onClick={handleLinkClick}
                    >
                      {AGENT_HOST}
                    </a>{" "}
                    to unlock it.
                  </>
                )}
              </p>
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
