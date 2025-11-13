import type {
  ResponseInputFile,
  ResponseInputMessageItem,
  ResponseOutputMessage,
} from "openai/resources/responses/responses.mjs";

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
  message: ResponseInputMessageItem | ResponseOutputMessage,
  type: "input_text" | "output_text" | "reasoning_text" = "input_text"
) => {
  return message.content.map((content) => (content.type === type ? content.text : "")).join("");
};

export const extractCitations = (message: ResponseOutputMessage) => {
  return message.content.filter((content) => content.type === "output_text").flatMap((content) => content.annotations);
};

export const extractFiles = (message: ResponseInputMessageItem, type: "input_file" | "output_file" = "input_file") => {
  return message.content.filter((content) => content.type === type) as ResponseInputFile[];
};

export const generateContentFileDataForOpenAI = (file: FileContentItem): ContentItem => {
  if (file.type === "input_audio") return { type: file.type, audio_file_id: file.id };
  if (file.type === "input_image") return { type: file.type, image_url: file.image_url };
  return { type: file.type, file_id: file.id };
};

export type ContentItem = {
  type: "input_text" | "input_file" | "input_audio" | "input_image";
  text?: string;
  file_id?: string;
  audio_file_id?: string;
  image_url?: string;
};
