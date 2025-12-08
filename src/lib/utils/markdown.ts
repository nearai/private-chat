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

export function repairMalformedHtml(raw: string): string {
  let html = raw;

  html = html.replace(/<>!DOCTYPE\s+html>/gi, "<!DOCTYPE html>");

  // FIX OPENING TAGS LIKE <>tag → <tag>
  html = html.replace(/<>[ ]*([a-zA-Z][\w-]*)/g, "<$1");

  // FIX CLOSING TAGS LIKE </>tag → </tag>
  html = html.replace(/<\/>[ ]*([a-zA-Z][\w-]*)/g, "</$1>");

  // REMOVE ANY ISOLATED <>
  html = html.replace(/<>/g, "");

  // FIX OPEN TAG WITH EXTRA > : <tag>> → <tag>
  html = html.replace(/<([a-zA-Z][\w-]*)([^>]*)>>/g, "<$1$2>");

  // FIX <>>tag> → <tag>
  html = html.replace(/<>+([a-zA-Z][\w-]*)>/g, "<$1>");

  // FIX <html> lang="en"> → <html lang="en">
  html = html.replace(/<html>\s+([^>]+?)>/gi, "<html $1>");

  // FIX CLOSING TAGS WITH EXTRA > : </>>tag> → </tag>
  html = html.replace(/<\/>+([a-zA-Z][\w-]*)>+/g, "</$1>");

  // FIX CASES LIKE <tag ...></>tag> → <tag ...></tag>
  html = html.replace(/<\/>[ ]*([a-zA-Z][\w-]*)>/g, "</$1>");

  // FIX CASES LIKE <tag ...></>>tag> → <tag ...></tag>
  html = html.replace(/<\/>+([a-zA-Z][\w-]*)>+/g, "</$1>");

  // PREVENT "<<tag" by collapsing to "<tag"
  html = html.replace(/<<([a-zA-Z])/g, "<$1");

  // PREVENT "<!<" → "<!"
  html = html.replace(/<!<(\w+)/g, "<!$1");

  // Remove leftover sequences like "<{many}" → "<"
  html = html.replace(/<+</g, "<");

  // DO NOT trim, DO NOT collapse spaces, DO NOT remove \n
  return html;
}
