import { useMutation } from "@tanstack/react-query";
import type { StartStreamProps } from "@/types";
import { chatClient } from "../client";

export const useResponse = () => {
  const sendPrompt = useMutation({
    mutationFn: async ({
      prompt,
      model,
      conversationId,
    }: {
      prompt: string;
      model: string;
      conversationId: string;
    }) => {
      return chatClient.sentPrompt(prompt, "user", model, conversationId);
    },
  });

  const generateChatTitle = useMutation({
    mutationFn: async ({ prompt, model }: { prompt: string; model: string }) => {
      const res = await chatClient.generateChatTitle(prompt, model);
      const msg = res.output?.find((item) => item.type === "message");
      const text = msg?.content?.find((c) => c.type === "output_text")?.text;
      return (text ?? "").trim();
    },
  });

  const startStream = useMutation({
    mutationFn: async (props: StartStreamProps) => {
      return chatClient.startStream(props);
    },
  });

  return { sendPrompt, generateChatTitle, startStream };
};
