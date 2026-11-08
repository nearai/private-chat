import { isPrivateChatShutdown, SHUTDOWN_DATE } from "@/lib/sunset";

export default function SunsetBanner() {
  return (
    <section aria-label="Private Chat shutdown notice" className="space-y-3">
      <h1 className="font-semibold text-3xl tracking-tight sm:text-4xl">
        {isPrivateChatShutdown() ? "Private Chat has shut down" : "Private Chat is sunsetting"}
      </h1>
      <p className="text-muted-foreground leading-relaxed">
        {isPrivateChatShutdown()
          ? `Private Chat shut down on ${SHUTDOWN_DATE} at 00:00 UTC.`
          : `Private Chat will shut down completely on ${SHUTDOWN_DATE} at 00:00 UTC.`}{" "}
        Chatting, browsing history, and self-service exports are no longer available.
      </p>
    </section>
  );
}
