export type FileContentItem =
  | { type: "input_file" | "input_audio"; id: string; name: string }
  | { type: "input_image"; id: string; name: string; image_url: string };

export type FileOpenAIResponse = {
  id: string;
  object: string; // The object type, which is always file https://platform.openai.com/docs/api-reference/files/object
  bytes: number;
  created_at: number;
  expires_at: number;
  filename: string;
  purpose:
    | "assistants"
    | "assistants_output"
    | "batch"
    | "batch_output"
    | "fine-tune"
    | "fine-tune-results"
    | "vision"
    | "user_data";
};

export type FilesOpenaiResponse = {
  object: "list";
  data: FileOpenAIResponse[];
  first_id: string;
  last_id: string;
  has_more: boolean;
};

export const extractMessageContent = (
  content: ContentItem[],
  type: "input_text" | "output_text" | "reasoning_text" = "input_text"
) => {
  return content.map((item) => (item.type === type ? item.text || "" : "")).join("");
};

export const extractCitations = (content: ContentItem[]): string[] => {
  return content
    .filter((item) => item.type === "input_text" && item.annotations)
    .flatMap((item) => item.annotations || []);
};

export const extractFiles = (
  content: ContentItem[],
  type: "input_file" | "output_file" = "input_file"
): ContentItem[] => {
  return content.flatMap((item) => {
    if (item.type === type) return [item];
    if (item.type === "input_text") {
      const match = item.text?.match(/\[File:\s*(file-[a-zA-Z0-9-]+)\]/i);
      return match ? [{ type, file_id: match[1] }] : [];
    }
    return [];
  });
};

export const generateContentFileDataForOpenAI = (file: FileContentItem): ContentItem => {
  if (file.type === "input_audio") return { type: file.type, audio_file_id: file.id };
  if (file.type === "input_image") return { type: file.type, image_url: file.image_url };
  return { type: file.type, file_id: file.id };
};

export type ContentItem = {
  type:
    | "input_text"
    | "output_text"
    | "input_file"
    | "output_file"
    | "input_audio"
    | "input_image"
    | "doc"
    | "collection";
  text?: string;
  file_id?: string;
  audio_file_id?: string;
  image_url?: string;
  annotations?: string[];
};
