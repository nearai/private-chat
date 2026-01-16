import type { ResponseOutputText } from "openai/resources/responses/responses.mjs";
import Collapsible from "@/components/common/Collapsible";
import { decodeString } from "@/lib/time";

export default function Citations({
  citations,
}: {
  citations: Array<
    | ResponseOutputText.FileCitation
    | ResponseOutputText.URLCitation
    | ResponseOutputText.ContainerFileCitation
    | ResponseOutputText.FilePath
  >;
}) {
  const citationsArray = Object.values(
    citations.reduce(
      (acc, source) => {
        if (source.type === "url_citation") {
          if (!acc[source.url]) {
            acc[source.url] = { url: source.url, data: [source] };
          } else {
            acc[source.url] = {
              ...acc[source.url],
              data: [...acc[source.url].data, source],
            };
          }
        }
        return acc;
      },
      {} as Record<string, { url: string; data: ResponseOutputText.URLCitation[] }>
    )
  );

  return (
    <div className="-mx-0.5 flex flex-wrap items-center gap-1 py-0.5">
      {citationsArray.length < 3 ? (
        <div className="flex flex-wrap gap-1 font-medium text-xs">
          {citationsArray.map((citation, idx) => {
            return (
              <a
                key={idx}
                id={`source-${idx}-${idx + 1}`}
                className="no-toggle flex max-w-96 rounded-xl bg-white p-1 outline-hidden dark:bg-gray-800 dark:text-gray-300"
                href={citation.url}
                target="_blank"
              >
                <div className="flex size-4 items-center justify-center rounded-full bg-gray-50 dark:bg-gray-800">
                  {idx + 1}
                </div>

                <div className="mx-1 min-w-0 flex-1 gap-1 truncate text-black/60 transition hover:text-black dark:text-gray-200">
                  {decodeString(citation.url)}
                </div>
              </a>
            );
          })}
        </div>
      ) : (
        <Collapsible title="References from" grow>
          <div className="mt-1 flex flex-wrap gap-1 font-medium text-xs">
            {citationsArray.map((citation, idx) => {
              return (
                <a
                  key={idx}
                  id={`source-${idx}-${idx + 1}`}
                  className="no-toggle flex max-w-96 rounded-xl bg-white p-1 outline-hidden dark:bg-gray-800 dark:text-gray-200"
                  href={citation.url}
                  onClick={(e) => {
                    e.stopPropagation();
                  }}
                  target="_blank"
                >
                  <div className="flex size-4 items-center justify-center rounded-full bg-gray-50 dark:bg-gray-800">
                    {idx + 1}
                  </div>

                  <div
                    className="mx-1 min-w-0 flex-1 gap-1 truncate text-black/60 transition hover:text-black dark:text-gray-200"
                  >
                    {decodeString(citation.url)}
                  </div>
                </a>
              );
            })}
          </div>
        </Collapsible>
      )}
    </div>
  );
}
