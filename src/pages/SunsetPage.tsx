import { useEffect, useState } from "react";
import FeedbackIcon from "@/assets/icons/feedback.svg?react";
import NearAIIcon from "@/assets/icons/near-ai.svg?react";
import SunsetBanner from "@/components/common/SunsetBanner";
import { Button } from "@/components/ui/button";
import { openFeedback } from "@/lib/crisp";
import { isPrivateChatShutdown, SHUTDOWN_AT } from "@/lib/sunset";

export default function SunsetPage() {
  const [shutdown, setShutdown] = useState(isPrivateChatShutdown);

  useEffect(() => {
    if (shutdown) return;

    // Recheck on focus after a suspended tab, and at the cutoff for open tabs.
    const update = () => setShutdown(isPrivateChatShutdown());
    const timer = window.setTimeout(update, Math.max(0, SHUTDOWN_AT - Date.now()));
    window.addEventListener("focus", update);

    return () => {
      window.clearTimeout(timer);
      window.removeEventListener("focus", update);
    };
  }, [shutdown]);

  return (
    <main className="flex min-h-dvh items-center justify-center bg-background px-6 py-12 text-foreground">
      <div className="w-full max-w-xl space-y-8">
        <NearAIIcon className="h-6 w-auto" aria-label="NEAR AI" role="img" />
        <SunsetBanner />
        <section aria-labelledby="archive-heading" className="space-y-3 rounded-2xl border p-6">
          <h2 id="archive-heading" className="font-semibold text-lg">
            Request your conversation archive
          </h2>
          <p className="text-muted-foreground leading-relaxed">
            Use the Feedback button to contact us and request an encrypted archive of your conversations. Feedback
            remains available after the shutdown. We’ll verify ownership before arranging access.
          </p>
          <Button type="button" onClick={openFeedback} className="mt-2">
            <FeedbackIcon aria-hidden="true" />
            Feedback
          </Button>
        </section>
        <p className="text-muted-foreground text-sm leading-relaxed">
          Thank you for using Private Chat. You can continue exploring our models in the{" "}
          <a
            href="https://cloud.near.ai/playground"
            className="font-medium text-foreground underline underline-offset-4"
            target="_blank"
            rel="noopener noreferrer"
          >
            NEAR AI Cloud Playground
          </a>
          .
        </p>
      </div>
    </main>
  );
}
