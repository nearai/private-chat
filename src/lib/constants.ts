export const LOCAL_STORAGE_KEYS = {
  TOKEN: "sessionToken",
  SESSION: "sessionId",
  CONVERSATIONS: "conversations",
  USER_DATA: "userData",
  SIGNATURES: "messageSignatures",
  AGREED_TERMS: "agreedTerms",
  WELCOME_PAGE_PROMPT: "welcomePagePrompt",
  IMPORT_GUIDE_BANNER_CLOSED: "importGuideBannerClosed",
  REDIRECT_AFTER_LOGIN: "redirectAfterLogin",
};

export const OFFLINE_CACHE_KEYS = {
  CONVERSATION_LIST: LOCAL_STORAGE_KEYS.CONVERSATIONS,
  CONVERSATION_DETAIL_PREFIX: "offlineConversation:",
};

export const DEFAULT_SIGNING_ALGO = "ecdsa";

export const DEFAULT_CONVERSATION_TITLE = "New Conversation";
// The fallback title returned by the server if title generation failed
export const FALLBACK_CONVERSATION_TITLE = "Conversation";
export const TITLE_GENERATION_DELAY = 6000; // milliseconds

export const IMPORTED_MESSAGE_SIGNATURE_TIP = "Verification is not available for imported chats";

export const MOCK_MESSAGE_RESPONSE_ID_PREFIX = "mock_resp_";
export const RESPONSE_MESSAGE_CLASSNAME = "chat-response-message";
export const USER_MESSAGE_CLASSNAME = "chat-user-message";
export const IMPORT_TIMESTAMP_TOLERANCE_SECONDS = 59;

export const SUPPORTED_TEXT_EXTENSIONS = [
  ".txt", ".text", ".log", ".md", ".markdown", ".mdx", ".rst", ".adoc", ".asciidoc", ".org", ".wiki",
  ".tex", ".latex", ".bib", ".json", ".jsonc", ".json5", ".yaml", ".yml", ".xml", ".toml", ".ini", ".cfg", ".conf", ".env", ".properties",
  ".csv", ".tsv", ".psv", ".ndjson", ".html", ".htm", ".xhtml", ".css", ".scss", ".sass", ".less", ".styl",
  ".js", ".mjs", ".cjs", ".jsx", ".ts", ".tsx", ".vue", ".svelte", ".svx", ".astro", ".webmanifest",
  ".py", ".pyi", ".pyw", ".java", ".kt", ".kts", ".scala", ".sc", ".groovy", ".gvy", ".gradle",
  ".c", ".h", ".i", ".ii", ".cpp", ".cxx", ".cc", ".hxx", ".hpp", ".hh",
  ".rs", ".go", ".cs", ".csx", ".swift", ".m", ".mm",
  ".php", ".php3", ".php4", ".php5", ".phtml",
  ".rb", ".rake", ".gemspec", ".pl", ".pm", ".t",
  ".hs", ".lhs", ".ml", ".mli", ".re", ".res",
  ".fs", ".fsx", ".elm", ".clj", ".cljs", ".cljc", ".edn", ".rkt", ".scm", ".ss", ".lisp", ".lsp",
  ".sh", ".bash", ".zsh", ".fish", ".ksh", ".ps1", ".psm1", ".psd1", ".cmd", ".bat",
  ".asm", ".s", ".S", ".nasm",
  ".v", ".vhd", ".vhdl",
  ".dart", ".gd", ".shader", ".hlsl", ".glsl", ".vert", ".frag",
  ".r", ".jl", ".ipynb", ".matlab", ".mlx",
  ".sql", ".mysql", ".psql", ".sqlite", ".cql", ".cypher",
  ".graphql", ".gql",
  ".makefile", ".mk", ".cmake", ".cmake.in", ".bazel", ".build",
  ".pom", ".lock", ".dockerfile", ".dockerignore", ".helm",
  ".tf", ".tfvars", ".hcl", ".nomad", ".pkr.hcl",
  ".gitignore", ".gitattributes", ".gitmodules", ".hgignore", ".svnignore", ".editorconfig",
  ".desktop", ".service", ".plist", ".reg", ".inf", ".spec", ".feature", ".story", ".test", ".snap"
];

export const ACCEPTED_FILE_TYPES = SUPPORTED_TEXT_EXTENSIONS.join(",");
// export const ACCEPTED_FILE_TYPES = [".pdf", ...SUPPORTED_TEXT_EXTENSIONS].join(",");
