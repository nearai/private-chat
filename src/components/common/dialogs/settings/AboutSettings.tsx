import { APP_NAME } from "@/api/constants";

const AboutSettings = () => {
  const commitHash = import.meta.env.VITE_GIT_COMMIT_HASH;

  return (
    <div className="flex h-full flex-col justify-between text-sm">
      <div className="max-h-112 space-y-3 overflow-y-scroll lg:max-h-full">
        <div>
          <div className="mb-2.5 flex items-center space-x-2 font-medium text-sm">
            <div>{APP_NAME}</div>
          </div>
          {commitHash && commitHash !== "unknown" && (
            <div className="mt-3 text-xs">
              <span className="text-muted-foreground">Code Hash: </span>
              <span className="font-mono text-foreground">{commitHash}</span>
            </div>
          )}
        </div>

        <hr className="border-border" />

        <div className="flex space-x-1">
          <a
            href="https://x.com/near_ai"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 rounded-lg bg-background px-2 py-1 transition hover:opacity-80"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width={15}
              height={15}
              viewBox="0 0 24 24"
              fill="currentColor"
              aria-hidden="true"
            >
              <path d="M18.244 2H21.5l-7.19 8.21L22 22h-6.845l-5.36-7.49L3.64 22H.5l7.64-8.72L2 2h6.963l4.922 6.934L18.244 2Zm-2.395 18.25h1.807L8.06 3.64H6.117l9.732 16.61Z" />
            </svg>

            <span className="font-semibold text-sm">@near_ai</span>
          </a>
        </div>
      </div>
    </div>
  );
};

export default AboutSettings;
