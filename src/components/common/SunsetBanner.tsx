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
      <p className="font-semibold">Private Chat is shutting down — export your data by November 15, 2026.</p>
      <p className="mt-1">
        From September 28, 2026, you can view and export conversations, but not create new ones. On November 15, 2026,
        private.near.ai shuts down and all legacy conversation data will be permanently deleted. Please export any
        conversations you want to keep before this date.
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
            <DialogTitle className="pr-10">
              Private Chat is shutting down — export your data by November 15, 2026
            </DialogTitle>
            <DialogDescription>
              We’ve made the decision to retire Private Chat (private.near.ai) so we can focus on the foundation of NEAR
              AI: private inference and secure model access. Thank you for being part of Private Chat. We want to give
              you time to save your conversations and explore the options available.
            </DialogDescription>
            <div className="space-y-4 text-foreground text-sm leading-relaxed">
              <h2 className="font-semibold text-base">What happens next</h2>
              <ul className="list-disc space-y-2 pl-5">
                <li>
                  <strong>September 28, 2026:</strong> Private Chat becomes read-only. You’ll be able to view and export
                  your conversations, but you won’t be able to create new ones.
                </li>
                <li>
                  <strong>November 15, 2026:</strong> private.near.ai shuts down, and{" "}
                  <strong>all legacy conversation data will be permanently deleted</strong>. Please export any
                  conversations you want to keep <strong>before this date</strong>.
                </li>
              </ul>
              <h2 className="font-semibold text-base">Where to go next</h2>
              <h3 className="font-semibold">Option 1: NEAR AI Cloud Playground</h3>
              <p>
                The newly released <ExternalLink href={PLAYGROUND_URL}>Playground</ExternalLink> provides:
              </p>
              <ul className="list-disc space-y-2 pl-5">
                <li>
                  Access to all NEAR AI models, including models running inside hardware-secured TEEs and Incognito
                  models.
                </li>
                <li>The same privacy guarantees as Private Chat, with no conversation data stored.</li>
                <li>
                  A space for evaluating models. Because conversations aren’t stored,{" "}
                  <strong>Playground has no conversation history or memory</strong>. It isn’t a direct replacement for
                  Private Chat.
                </li>
              </ul>
              <h3 className="font-semibold">Option 2: Use your preferred client</h3>
              <p>
                The NEAR AI Cloud API maintains full OpenAI compatibility, giving you flexibility in how you access
                private inference:
              </p>
              <ul className="list-disc space-y-2 pl-5">
                <li>
                  Connect a compatible client, such as <ExternalLink href="https://opencode.ai/">OpenCode</ExternalLink>{" "}
                  or Claude Code.
                </li>
                <li>
                  Use another interface, such as <ExternalLink href="https://teemoon.ai/">TeeMoon</ExternalLink>, or
                  deploy your own with <ExternalLink href="https://www.librechat.ai/">LibreChat</ExternalLink>.
                </li>
              </ul>
              <h2 className="font-semibold text-base">Why we’re making this change</h2>
              <p>
                Our primary goal is to deliver Private AI, starting with private inference and secure model access.
                Retiring Private Chat allows us to concentrate on hardware enclaves, attestation, and performance
                optimization.
              </p>
              <p>
                There are many clients and interfaces for interacting with AI. We believe our greatest contribution is
                making the underlying inference private, secure, and fast—and enabling those applications to build on
                it.
              </p>
              <p>
                If you have questions or need a feature in Playground, please reach out through the support chat in{" "}
                <ExternalLink href="https://cloud.near.ai">NEAR AI Cloud</ExternalLink>.
              </p>
              <p>
                We appreciate the time you’ve spent with Private Chat and the trust you’ve placed in NEAR AI. We look
                forward to continuing to build the future of Private AI with you.
              </p>
              <p>The NEAR AI Team</p>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </section>
  );
}
