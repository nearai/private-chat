import { DialogTrigger } from "@radix-ui/react-dialog";
import { Document, Page, pdfjs } from 'react-pdf';
import { useFile, useFileContent } from "@/api/chat/queries/useFiles";
import Spinner from "@/components/common/Spinner";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Tooltip } from "@/components/ui/tooltip";
import { formatFileSize, getLineCount } from "@/lib/index";
import { cn } from "@/lib";
import { decodeString } from "@/lib/time";
import type { ContentItem } from "@/types/openai";
import { useEffect, useState } from "react";
import 'react-pdf/dist/Page/TextLayer.css';
import 'react-pdf/dist/Page/AnnotationLayer.css';

pdfjs.GlobalWorkerOptions.workerSrc = `/lib/pdf.js`;

export default function FileDialog({
  file,
  smallView = false,
  loading = false,
  dismissible = false,
  onDismiss = () => {},
}: {
  file: ContentItem;
  smallView?: boolean;
  loading?: boolean;
  dismissible?: boolean;
  onDismiss?: () => void;
}) {
  const fileId =
    file.type === "input_file" ? file.file_id : file.type === "input_audio" ? file.audio_file_id : undefined;
  const { data: fileData } = useFile(fileId);
  const { isLoading: isFileContentLoading, data: fileContent } = useFileContent(fileId);
  const [processedFile, setProcessedFile] = useState<string | File | null>(null);
  const [numPages, setNumPages] = useState<number | null>(null);

  function onDocumentLoadSuccess({ numPages }: { numPages: number }) {
    setNumPages(numPages);
  }

  const renderContent = () => {
    if (file.type === "input_file" || file.type === "output_file") {
      return "File";
    } else if (file.type === "doc") {
      return "Document";
    } else if (file.type === "collection") {
      return "Collection";
    } else {
      return <span className="line-clamp-1 capitalize">{file.type}</span>;
    }
  };

  const renderFileContent = () => {
    if (!processedFile) return null;

    if (processedFile instanceof File && processedFile.type === 'application/pdf') {
      return (
        <div className="h-[75vh] w-full overflow-auto rounded border border-gray-200 bg-gray-50 p-2 dark:border-gray-700 dark:bg-gray-800">
          <Document
            file={processedFile}
            loading={<div className="flex items-center gap-2 text-sm"><Spinner className="size-4" /> Loading PDF…</div>}
            error={<div className="text-red-600 text-sm">Failed to load PDF.</div>}
            onLoadSuccess={onDocumentLoadSuccess}
          >
            {Array.from(new Array(numPages), (_, index) => (
              <Page
                key={`page_${index + 1}`}
                pageNumber={index + 1}
                width={800}
                className="mb-4 last:mb-0"
              />
            ))}
          </Document>
        </div>
      );
    }

    if (typeof processedFile === 'string') {
      return (
        <div className="flex w-full flex-col gap-1">
          <div className="shrink-0 capitalize">
            {getLineCount(processedFile)} extracted lines
          </div>

          <div className="flex shrink-0 items-center gap-1">
            Formatting may be inconsistent from source.
          </div>
          <div className="max-h-[75vh] w-full min-w-0 overflow-auto whitespace-pre-wrap break-all rounded border border-gray-200 bg-gray-50 p-4 text-sm dark:border-gray-700 dark:bg-gray-800">
            {processedFile}
          </div>
        </div>
      );
    }

    return null;
  }

  useEffect(() => {
    if (!fileContent || !fileData) return;

    const ext = fileData.filename.split('.').pop()?.toLowerCase();
    const fc: unknown = fileContent;

    // Blob/File path (preferred)
    if (fc instanceof Blob) {
      if (ext === 'pdf' || fc.type === 'application/pdf') {
        const fileObj = new File([fc], fileData.filename, { type: 'application/pdf' });
        setProcessedFile(fileObj);
      } else {
        // For non-PDF blobs, try to display as text
        (async () => {
          try {
            const text = await fc.text();
            setProcessedFile(text);
          } catch {
            setProcessedFile(null);
          }
        })();
      }
      return;
    }

    // String path (fallback)
    if (typeof fc === 'string') {
      if (ext === 'pdf' || fc.startsWith('%PDF-')) {
        // Convert raw/binary-like string to bytes -> Blob -> File
        const len = fc.length;
        const bytes = new Uint8Array(len);
        for (let i = 0; i < len; i++) {
          bytes[i] = fc.charCodeAt(i) & 0xff;
        }
        const blob = new Blob([bytes], { type: 'application/pdf' });
        const fileObj = new File([blob], fileData.filename, { type: 'application/pdf' });
        setProcessedFile(fileObj);
      } else {
        setProcessedFile(fc);
      }
      return;
    }
  }, [fileData, fileContent]);

  return (
    <Dialog>
      <DialogTrigger
        className={cn(
          "group relative flex w-60 items-center gap-1 overflow-hidden bg-card p-1.5 text-left",
          smallView ? "rounded-xl" : "rounded-2xl"
        )}
        type="button"
      >
        {!smallView && (
          <div className="rounded-xl bg-black/20 p-3 dark:bg-white/10">
            {!loading ? (
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="size-5">
                <path
                  fill-rule="evenodd"
                  d="M5.625 1.5c-1.036 0-1.875.84-1.875 1.875v17.25c0 1.035.84 1.875 1.875 1.875h12.75c1.035 0 1.875-.84 1.875-1.875V12.75A3.75 3.75 0 0 0 16.5 9h-1.875a1.875 1.875 0 0 1-1.875-1.875V5.25A3.75 3.75 0 0 0 9 1.5H5.625ZM7.5 15a.75.75 0 0 1 .75-.75h7.5a.75.75 0 0 1 0 1.5h-7.5A.75.75 0 0 1 7.5 15Zm.75 2.25a.75.75 0 0 0 0 1.5H12a.75.75 0 0 0 0-1.5H8.25Z"
                  clip-rule="evenodd"
                />
                <path d="M12.971 1.816A5.23 5.23 0 0 1 14.25 5.25v1.875c0 .207.168.375.375.375H16.5a5.23 5.23 0 0 1 3.434 1.279 9.768 9.768 0 0 0-6.963-6.963Z" />
              </svg>
            ) : (
              <Spinner />
            )}
          </div>
        )}

        {!smallView ? (
          <div className="-space-y-0.5 flex w-full min-w-0 flex-col justify-center px-2.5">
            <div className="mb-1 truncate font-medium text-sm dark:text-gray-100">
              {decodeString(fileData?.filename ?? "")}
            </div>

            <div className="line-clamp-1 flex justify-between text-gray-500 text-xs">
              {renderContent()}
              {fileData?.bytes && <span className="capitalize">{formatFileSize(fileData.bytes)}</span>}
            </div>
          </div>
        ) : (
          <Tooltip aria-label={decodeString(fileData?.filename ?? "")}>
            <div className="-space-y-0.5 flex w-full flex-col justify-center px-2.5">
              <div className="flex items-center justify-between text-sm dark:text-gray-100">
                {loading && (
                  <div className="mr-2 shrink-0">
                    <Spinner className="size-4" />
                  </div>
                )}
                <div className="line-clamp-1 flex-1 font-medium">{decodeString(fileData?.filename ?? "")}</div>
                <div className="shrink-0 text-gray-500 text-xs capitalize">{formatFileSize(fileData?.bytes ?? 0)}</div>
              </div>
            </div>
          </Tooltip>
        )}

        {dismissible && (
          <div className="-top-1 -right-1 absolute">
            <button
              className="invisible rounded-full border border-gray-50 bg-white text-black transition group-hover:visible"
              type="button"
              onClick={() => {
                onDismiss();
              }}
            >
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4">
                <path d="M6.28 5.22a.75.75 0 00-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 101.06 1.06L10 11.06l3.72 3.72a.75.75 0 101.06-1.06L11.06 10l3.72-3.72a.75.75 0 00-1.06-1.06L10 8.94 6.28 5.22z" />
              </svg>
            </button>
          </div>
        )}
      </DialogTrigger>
      <DialogContent className="min-h-[60vh]">
        <div className="flex w-full flex-col px-6 py-5 font-primary dark:text-gray-400">
          <div className="pb-2">
            <div className="flex items-start justify-between">
              <div>
                <div className="font-medium text-lg dark:text-gray-100">
                  <a
                    href="#"
                    className="line-clamp-1 hover:underline"
                    onClick={(e) => {
                      e.preventDefault();

                      const fc: unknown = fileContent;

                      // If we have a Blob/File, download it
                      if (fc instanceof Blob) {
                        const url = URL.createObjectURL(fc);
                        const a = document.createElement("a");
                        a.href = url;
                        a.download = fileData?.filename || "file";
                        a.click();
                        URL.revokeObjectURL(url);
                        return;
                      }

                      // Legacy object with url
                      if (fc && typeof fc === "object" && "url" in (fc as Record<string, unknown>)) {
                        const obj = fc as { url: string; type?: string };
                        window.open(obj.type === "file" ? `${obj.url}/content` : `${obj.url}`, "_blank");
                        return;
                      }

                      // Fallback: JSON download of unknown object
                      if (fc && typeof fc === "object") {
                        const jsonString = JSON.stringify(fc, null, 2);
                        const blob = new Blob([jsonString], { type: "application/json" });
                        const url = URL.createObjectURL(blob);

                        const a = document.createElement("a");
                        a.href = url;
                        a.download = fileData?.filename || "file.json";
                        a.click();

                        URL.revokeObjectURL(url);
                        return;
                      }
                    }}
                  >
                    {fileData?.filename ?? "File"}
                  </a>
                </div>
              </div>
            </div>

            <div>
              <div className="flex w-full flex-col items-center justify-between gap-1 md:flex-row">
                <div className="flex w-full flex-wrap gap-1 text-gray-500 text-sm">
                  {fileData?.bytes && (
                    <>
                      <div className="shrink-0 capitalize">{formatFileSize(fileData.bytes)}</div>•
                    </>
                  )}
                  {isFileContentLoading ? (
                    <div className="flex w-full items-center justify-center py-10">
                      <div className="flex items-center gap-2 text-sm">
                        <Spinner className="size-4" /> Loading file…
                      </div>
                    </div>
                  ) : (
                    renderFileContent()
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
