import { DialogTrigger } from "@radix-ui/react-dialog";
import { useFile, useFileContent } from "@/api/chat/queries/useFiles";
import Spinner from "@/components/common/Spinner";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Tooltip } from "@/components/ui/tooltip";
import { formatFileSize, getLineCount } from "@/lib/index";
import { decodeString } from "@/lib/time";
import type { ContentItem } from "@/types/openai";

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
  // const [showModal, setShowModal] = useState(false);
  const fileId =
    file.type === "input_file" ? file.file_id : file.type === "input_audio" ? file.audio_file_id : undefined;
  const { data: fileData } = useFile(fileId);
  console.log("fileData", fileData);
  const { data: fileContent } = useFileContent(fileId);
  console.log("fileContent", fileContent);

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

  return (
    <Dialog>
      <DialogTrigger
        className={`group relative flex w-60 items-center gap-1 bg-gray-850 p-1.5 ${
          smallView ? "rounded-xl" : "rounded-2xl"
        } text-left`}
        type="button"
        // onClick={async () => {
        //   if (fileData?.content) {
        //     setShowModal(!showModal);
        //   } else {
        //     if (file.url) {
        //       if (file.type === "file") {
        //         window.open(`${file.url}/content`, "_blank")?.focus();
        //       } else {
        //         window.open(`${file.url}`, "_blank")?.focus();
        //       }
        //     }
        //   }
        // }}
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
          <div className="-space-y-0.5 flex w-full flex-col justify-center px-2.5">
            <div className="mb-1 line-clamp-1 font-medium text-sm dark:text-gray-100">
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
      <DialogContent>
        <div className="flex w-full flex-col justify-center px-6 py-5 font-primary dark:text-gray-400">
          <div className="pb-2">
            <div className="flex items-start justify-between">
              <div>
                <div className="font-medium text-lg dark:text-gray-100">
                  <a
                    href="#"
                    className="line-clamp-1 hover:underline"
                    onClick={(e) => {
                      e.preventDefault();
                      if (fileContent?.url) {
                        window.open(
                          fileContent.type === "file" ? `${fileContent.url}/content` : `${fileContent.url}`,
                          "_blank"
                        );
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
                <div className="flex flex-wrap gap-1 text-gray-500 text-sm">
                  {fileData?.bytes && (
                    <>
                      <div className="shrink-0 capitalize">{formatFileSize(fileData.bytes)}</div>•
                    </>
                  )}

                  {fileContent && (
                    <>
                      <div className="shrink-0 capitalize">
                        {getLineCount(fileContent.content ?? "")} extracted lines
                      </div>

                      <div className="flex shrink-0 items-center gap-1">
                        Formatting may be inconsistent from source.
                      </div>
                    </>
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
