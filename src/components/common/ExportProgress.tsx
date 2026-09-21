import { StopIcon } from "@heroicons/react/24/solid";
import { Button } from "@/components/ui/button";
import { useExportStore } from "@/stores/useExportStore";

export function ExportProgress() {
  const progress = useExportStore((state) => state.progress);
  const stop = useExportStore((state) => state.stop);
  if (!progress) return null;

  const { phase, completed, total, itemsRead } = progress;
  const percent = phase === "reading" && total > 0 ? Math.round((completed / total) * 100) : null;
  const label =
    phase === "preparing"
      ? "Preparing export..."
      : phase === "generating"
        ? "Generating export file..."
        : `Reading conversations (${completed}/${total})`;

  return (
    <div className="space-y-2 text-sm">
      <div className="flex items-center justify-between gap-3">
        <span role="status">{label}</span>
        {percent !== null && <span className="tabular-nums">{percent}%</span>}
      </div>
      {phase === "reading" && completed < total && (
        <p className="text-muted-foreground text-xs">
          Conversation {completed + 1} of {total}: {itemsRead} items read
        </p>
      )}
      <div className="flex items-center gap-3">
        <div
          role="progressbar"
          aria-label={label}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={percent ?? undefined}
          aria-valuetext={phase === "reading" ? `${completed} of ${total} conversations read` : label}
          className="h-1.5 flex-1 overflow-hidden rounded-full bg-secondary"
        >
          <div
            className={
              percent === null
                ? "h-full w-1/3 animate-pulse rounded-full bg-primary motion-reduce:animate-none"
                : "h-full rounded-full bg-primary transition-[width] duration-300 motion-reduce:transition-none"
            }
            style={percent === null ? undefined : { width: `${percent}%` }}
          />
        </div>
        <Button type="button" variant="secondary" size="icon" aria-label="Stop export" onClick={stop}>
          <StopIcon className="size-3" aria-hidden="true" />
        </Button>
      </div>
    </div>
  );
}

export function ExportProgressNotification() {
  const active = useExportStore((state) => state.progress !== null);
  if (!active) return null;

  return (
    <aside
      aria-label="Chat export"
      className="fixed right-4 bottom-4 z-50 w-80 max-w-[calc(100vw-2rem)] rounded-xl border border-border bg-background p-4 text-foreground shadow-lg"
    >
      <ExportProgress />
    </aside>
  );
}
