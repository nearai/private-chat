import { XMarkIcon } from "@heroicons/react/24/outline";
import { useEffect, useState } from "react";
import IronclawLogo from "@/assets/images/ironclaw.ico";
import { LOCAL_STORAGE_KEYS } from "@/lib/constants";

const IronClawBanner = () => {
  const [isClosed, setIsClosed] = useState(false);

  useEffect(() => {
    setIsClosed(localStorage.getItem(LOCAL_STORAGE_KEYS.IRONCLAW_BANNER_CLOSED) === "true");
  }, []);

  if (isClosed) {
    return null;
  }

  const handleClose = (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    setIsClosed(true);
    localStorage.setItem(LOCAL_STORAGE_KEYS.IRONCLAW_BANNER_CLOSED, "true");
  };

  return (
    <div className="fade-in slide-in-from-bottom-4 pointer-events-auto w-full max-w-sm animate-in duration-500">
      <div className="relative overflow-hidden rounded-2xl border border-border bg-card shadow-2xl transition-transform hover:scale-[1.02]">
        <a
          href="https://www.ironclaw.com/"
          target="_blank"
          rel="noopener noreferrer"
          className="group flex w-full items-center gap-4 p-4 pr-12 text-left transition-colors hover:bg-secondary/10"
        >
          <div className="shrink-0">
            <div className="flex size-8 items-center justify-center overflow-hidden rounded-full bg-black/5 dark:bg-white/10">
              <img
                src={IronclawLogo}
                alt="IronClaw"
                className="size-8 rounded-full object-cover"
                onError={(e) => {
                  e.currentTarget.style.display = "none";
                  e.currentTarget.parentElement?.classList.add("bg-primary/20");
                }}
              />
              <span className="hidden font-bold text-primary text-xs">IC</span>
            </div>
          </div>
          <div className="min-w-0 flex-1">
            <div className="font-medium text-foreground text-sm leading-snug">
              Unleash Your AI Agent with <span className="font-bold text-[#FF5A5F]">IronClaw</span>
            </div>
            <div className="mt-0.5 text-muted-foreground text-xs">Check out the release 🚀</div>
          </div>
        </a>
        <button
          onClick={handleClose}
          className="group absolute top-2 right-2 rounded-full p-1.5 transition-colors hover:bg-secondary/20 dark:hover:bg-secondary/10"
          aria-label="Close banner"
          title="Close"
        >
          <XMarkIcon className="h-4 w-4 text-muted-foreground transition-colors group-hover:text-foreground" />
        </button>
      </div>
    </div>
  );
};

export default IronClawBanner;
