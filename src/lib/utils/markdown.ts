import { decode } from "he";

export const processResponseContent = (content: string): string => {
  return content.trim();
};

export const replaceTokens = (content: string, sourceIds: string[] = [], char?: string, user?: string): string => {
  const tokens = [
    { regex: /{{char}}/gi, replacement: char },
    { regex: /{{user}}/gi, replacement: user },
  ];

  // Replace tokens outside code blocks only
  const processOutsideCodeBlocks = (text: string, replacementFn: (segment: string) => string) => {
    return text
      .split(/(```[\s\S]*?```|`[\s\S]*?`)/)
      .map((segment) => {
        return segment.startsWith("```") || segment.startsWith("`") ? segment : replacementFn(segment);
      })
      .join("");
  };

  //biome-ignore lint/style/noParameterAssign: explanation
  content = processOutsideCodeBlocks(content, (segment) => {
    tokens.forEach(({ regex, replacement }) => {
      if (replacement !== undefined && replacement !== null) {
        //biome-ignore lint/style/noParameterAssign: explanation
        segment = segment.replace(regex, replacement);
      }
    });

    if (Array.isArray(sourceIds)) {
      sourceIds.forEach((sourceId, idx) => {
        const regex = new RegExp(`\\[${idx + 1}\\]`, "g");
        //biome-ignore lint/style/noParameterAssign: explanation
        segment = segment.replace(regex, `<source_id data="${idx + 1}" title="${sourceId}" />`);
      });
    }

    return segment;
  });

  return content;
};

export function unescapeHtml(html: string): string {
  return decode(html);
}

// Repairs common malformations in HTML generated from markdown code blocks
export function repairMalformedMarkup(raw: string): string {
  let html = raw;

  // --- DOCTYPE fix ---
  html = html.replace(/<>!DOCTYPE\s+html>/gi, "<!DOCTYPE html>");

  // --- COMMENT FIXES ---
  // <>!-- Something --> → <!-- Something -->
  html = html.replace(/<>!--/g, "<!--");

  // Missing "<" before comment: "!-- Foo -->" → "<!-- Foo -->"
  html = html.replace(/(^|\n)([ \t]*)!--/g, (_, a, spaces) => `${a}${spaces}<!--`);

  // --- Opening tags: <>tag → <tag ---
  html = html.replace(/<>[ ]*([a-zA-Z][\w-]*)/g, "<$1");

  // --- Closing tags: </>tag → </tag> ---
  html = html.replace(/<\/>[ ]*([a-zA-Z][\w-]*)/g, "</$1>");

  // --- Remove remaining bare "<>" safely ---
  html = html.replace(/<>/g, "");

  // --- Fix opening tags with extra > : <tag>> ---
  html = html.replace(/<([a-zA-Z][\w-]*)([^>]*)>>/g, "<$1$2>");

  // --- Handle <>>tag> → <tag> ---
  html = html.replace(/<>+([a-zA-Z][\w-]*)>/g, "<$1>");

  // --- Fix <html> lang="en"> ---
  html = html.replace(/<html>\s+([^>]+?)>/gi, "<html $1>");

  // --- Fix closing tags like </>>div> ---
  html = html.replace(/<\/>+([a-zA-Z][\w-]*)>+/g, "</$1>");

  // --- Fix </div>> → </div> ---
  html = html.replace(/<\/([a-zA-Z][\w-]*)>{2,}/g, "</$1>");

  // --- Fix </tag>> (clean any trailing > after closing tag) ---
  html = html.replace(/(<\/[a-zA-Z][\w-]*>)>+/g, "$1");

  // --- Fix <tag ...></>tag> → <tag ...></tag> ---
  html = html.replace(/<\/>[ ]*([a-zA-Z][\w-]*)>/g, "</$1>");

  // --- Fix <tag ...></>>tag> → <tag ...></tag> ---
  html = html.replace(/<\/>+([a-zA-Z][\w-]*)>+/g, "</$1>");

  // --- Remove accidental "<<tag" → "<tag" ---
  html = html.replace(/<<([a-zA-Z])/g, "<$1");

  // --- Prevent "<!<" → "<!" ---
  html = html.replace(/<!<(\w+)/g, "<!$1");

  // --- Reduce leftover sequences like "<{many}" → "<" ---
  html = html.replace(/<+</g, "<");

  // --- Fix start tags with closing patterns: <tag ...></>tag> ---
  // Already handled above but ensure coverage:
  html = html.replace(/<([a-zA-Z][\w-]*)[^>]*><\/>+\1>/g, "<$1></$1>");

  // DO NOT TRIM — preserve newlines and indentation
  return html;
}
