import { useState, useEffect } from "react";
import { ArrowUpOnSquareIcon, XMarkIcon } from "@heroicons/react/24/outline";
import ImportGuideDialog from "./ImportGuideDialog";
import { LOCAL_STORAGE_KEYS } from "@/lib/constants";

const ImportGuideBanner = () => {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isClosed, setIsClosed] = useState(false);

  useEffect(() => {
    setIsClosed(localStorage.getItem(LOCAL_STORAGE_KEYS.IMPORT_GUIDE_BANNER_CLOSED) === "true");
  }, []);

  if (isClosed) {
    return null;
  }

  const handleClose = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsClosed(true);
    localStorage.setItem(LOCAL_STORAGE_KEYS.IMPORT_GUIDE_BANNER_CLOSED, "true");
  };

  return (
    <>
      <div className="fixed right-6 bottom-6 z-40 max-w-sm">
        <div className="relative overflow-hidden rounded-2xl border border-border bg-card shadow-2xl">
          <button
            onClick={() => setIsDialogOpen(true)}
            className="group flex w-full items-start gap-3 p-4 pr-12 text-left transition-colors hover:bg-secondary/10"
          >
            <div className="mt-0.5 shrink-0">
              <div className="rounded-lg bg-primary/10 p-2 transition-colors group-hover:bg-primary/20">
                <ArrowUpOnSquareIcon className="h-5 w-5 text-primary" />
              </div>
            </div>
            <div className="min-w-0 flex-1">
              <div className="font-semibold text-foreground text-sm leading-snug">
                <div>Didn't see your chats?</div>
                <div className="text-primary">Import them now!</div>
              </div>
            </div>
          </button>
          <button
            onClick={handleClose}
            className="group absolute top-3 right-3 rounded-lg p-1.5 transition-colors hover:bg-secondary/20 dark:hover:bg-secondary/10"
            aria-label="Close banner"
            title="Close"
          >
            <XMarkIcon className="h-4 w-4 text-muted-foreground transition-colors group-hover:text-foreground" />
          </button>
        </div>
      </div>
      <ImportGuideDialog isOpen={isDialogOpen} onClose={() => setIsDialogOpen(false)} />
    </>
  );
};

export default ImportGuideBanner;

