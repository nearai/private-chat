import type { ReactNode } from "react";
import { Dialog, DialogContent, DialogDescription, DialogTitle, DialogTrigger } from "@/components/ui/dialog";

const PLAYGROUND_URL = "https://cloud.near.ai/playground";

function ExternalLink({ href, children }: { href: string; children: ReactNode }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="font-medium underline underline-offset-4 hover:opacity-80"
    >
      {children}
    </a>
  );
}

export default function SunsetBanner() {
  return (
    <section
      aria-label="Private Chat shutdown notice"
      className="shrink-0 border-amber-200 border-b bg-amber-50 px-4 py-3 text-amber-950 text-sm dark:border-amber-900 dark:bg-amber-950 dark:text-amber-100"
    >
      <p className="font-semibold">Private Chat is shutting down. Data available until November 15.</p>
      <p className="mt-1">
        Read-only from September 28. On November 15, private.near.ai shuts down and all legacy conversation data will be
        permanently deleted.
      </p>
      <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-2">
        <ExternalLink href={PLAYGROUND_URL}>Explore NEAR AI Cloud Playground</ExternalLink>
        <Dialog>
          <DialogTrigger asChild>
            <button type="button" className="font-medium underline underline-offset-4 hover:opacity-80">
              Learn more
            </button>
          </DialogTrigger>
          <DialogContent className="max-h-[85dvh] gap-4 overflow-y-auto p-6 sm:max-w-2xl">
            <DialogTitle className="pr-10">Private Chat is shutting down</DialogTitle>
            <DialogDescription>
              We’re deprecating Private Chat (private.near.ai). Your conversation data is available until November 15.
            </DialogDescription>
            <div className="space-y-4 text-foreground text-sm leading-relaxed">
              <ul className="list-disc space-y-2 pl-5">
                <li>
                  <strong>September 28:</strong> Private Chat becomes read-only. You’ll be able to view your
                  conversations, but not create new ones.
                </li>
                <li>
                  <strong>November 15:</strong> private.near.ai shuts down, and all legacy conversation data will be
                  permanently deleted.
                </li>
              </ul>
              <h2 className="font-semibold text-base">Where to go instead?</h2>
              <p>
                Try the <ExternalLink href={PLAYGROUND_URL}>Playground in NEAR AI Cloud</ExternalLink>. It offers all
                NEAR AI models, including models running inside hardware-secured TEEs and Incognito models, with the
                same privacy guarantees as Private Chat.
              </p>
              <p>
                Playground does not store any data, so it has no conversation history or memory. It is built mainly to
                evaluate models, rather than as a replacement for Private Chat.
              </p>
              <p>
                You can also use your preferred client. The NEAR AI Cloud API maintains full OpenAI compatibility, so
                you can use applications such as <ExternalLink href="https://opencode.ai/">OpenCode</ExternalLink> or
                Claude Code, or deploy your own UI such as{" "}
                <ExternalLink href="https://teemoon.ai/">TeeMoon</ExternalLink> or{" "}
                <ExternalLink href="https://www.librechat.ai/">LibreChat</ExternalLink>, with NEAR AI private inference.
              </p>
              <h2 className="font-semibold text-base">Why are we doing this?</h2>
              <p>
                Our primary goal is delivering Private AI, starting with private inference and secure model access.
                We’re concentrating on hardware enclaves, attestation, and performance optimization. Other web clients
                can provide the interface while we focus on delivering the best private inference.
              </p>
              <p>
                Have questions or need a feature in Playground? Please contact us through the support chat in{" "}
                <ExternalLink href="https://cloud.near.ai">NEAR AI Cloud</ExternalLink>.
              </p>
              <p>
                Thank you for using NEAR AI products. We look forward to building the future together with Private AI.
              </p>
              <p>The NEAR AI Team</p>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </section>
  );
}
