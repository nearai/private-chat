import { type UseQueryOptions, useQuery } from "@tanstack/react-query";
import { queryKeys } from "@/api/query-keys";
import type { FileContentResponse, FilesOpenaiResponse } from "@/types/openai";
import { chatClient } from "../client";

type UseFilesOptions = Omit<UseQueryOptions<FilesOpenaiResponse, Error>, "queryKey" | "queryFn">;

export const useFiles = (options?: UseFilesOptions) => {
  return useQuery({
    queryKey: queryKeys.chat.files,
    queryFn: () => chatClient.getFiles(),
    ...options,
  });
};

export const useFile = (id: string | undefined) => {
  return useQuery({
    queryKey: queryKeys.chat.file(id ?? ""),
    queryFn: () => chatClient.getFile(id ?? ""),
  });
};

export const useFileContent = (id: string | undefined) => {
  return useQuery<FileContentResponse, Error>({
    queryKey: queryKeys.chat.fileContent(id ?? ""),
    queryFn: () => chatClient.getFileContent(id ?? ""),
  });
};
