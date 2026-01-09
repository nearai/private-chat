import { ArrowPathIcon, XMarkIcon } from "@heroicons/react/24/outline";
import { Button } from "@/components/ui/button";

interface PWAUpdateBannerProps {
  onRefresh: () => void;
  onDismiss?: () => void;
}

const PWAUpdateBanner = ({ onRefresh, onDismiss }: PWAUpdateBannerProps) => {
  return (
    <div className="slide-in-from-top-5 fixed top-6 right-6 z-50 max-w-sm animate-in">
      <div className="relative overflow-hidden rounded-2xl border border-border bg-card shadow-2xl">
        <div className="flex items-start gap-3 p-4 pr-12">
          <div className="mt-0.5 shrink-0">
            <div className="rounded-lg bg-primary/10 p-2">
              <ArrowPathIcon className="h-5 w-5 text-primary" />
            </div>
          </div>
          <div className="min-w-0 flex-1">
            <div className="mb-2 font-semibold text-foreground text-sm leading-snug">
              <div>Update Available</div>
              <div className="mt-1 font-normal text-muted-foreground text-xs">
                A new version is ready. Refresh to get the latest features.
              </div>
            </div>
            <div className="mt-3 flex gap-2">
              <Button
                onClick={onRefresh}
                size="small"
                variant="default"
                className="flex-1"
              >
                Update Now
              </Button>
              {onDismiss && (
                <Button
                  onClick={onDismiss}
                  size="small"
                  variant="ghost"
                >
                  Later
                </Button>
              )}
            </div>
          </div>
        </div>
        {onDismiss && (
          <button
            onClick={onDismiss}
            className="group absolute top-3 right-3 rounded-lg p-1.5 transition-colors hover:bg-secondary/20 dark:hover:bg-secondary/10"
            aria-label="Close banner"
            title="Close"
          >
            <XMarkIcon className="h-4 w-4 text-muted-foreground transition-colors group-hover:text-foreground" />
          </button>
        )}
      </div>
    </div>
  );
};

export default PWAUpdateBanner;
