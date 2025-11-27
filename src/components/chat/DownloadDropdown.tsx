import ArrowDownTrayIcon from "@heroicons/react/24/outline/ArrowDownTrayIcon";
import FileSaver from "file-saver";
import html2canvas from "html2canvas-pro";
import jsPDF from "jspdf";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { chatClient } from "@/api/chat/client";
import {
  DropdownMenuItem,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
} from "@/components/ui/dropdown-menu";

import { useSettingsStore } from "@/stores/useSettingsStore";
import {
  type ConversationModelOutput,
  type ConversationReasoning,
  ConversationTypes,
  type ConversationUserInput,
  type ConversationWebSearchCall,
} from "@/types";

type DownloadDropdownProps = {
  chatId: string;
};

const DownloadDropdown = ({ chatId }: DownloadDropdownProps) => {
  const { t } = useTranslation("translation", { useSuspense: false });
  const { settings } = useSettingsStore();

  const downloadAsJSON = async () => {
    try {
      const chatData = await chatClient.getConversationItems(chatId);
      if (!chatData) return;
      const blob = new Blob([JSON.stringify(chatData.data)], {
        type: "application/json",
      });
      FileSaver.saveAs(blob, `chat-export-${Date.now()}.json`);
      toast.success(t("Download JSON successfully"));
    } catch (error) {
      console.error("Failed to download JSON:", error);
    }
  };

  const downloadAsTXT = async () => {
    try {
      const [conversationMetadata, conversationItems] = await Promise.all([
        chatClient.getConversation(chatId),
        chatClient.getConversationItems(chatId),
      ]);
      if (!conversationItems || !conversationMetadata) return;

      const formatMessageContent = (
        message: ConversationUserInput | ConversationModelOutput | ConversationWebSearchCall | ConversationReasoning
      ) => {
        switch (message.type) {
          case ConversationTypes.MESSAGE:
            return message.content.map((content) => content.text || "").join("\n");
          case ConversationTypes.WEB_SEARCH_CALL:
            return message.action.query;
          case ConversationTypes.REASONING:
            return message.content;
          default:
            return "";
        }
      };

      const chatText = conversationItems.data.reduce((a, message) => {
        return `${a}### ${message?.role ? message.role.toUpperCase() : "SYSTEM"}\n${formatMessageContent(message)}\n\n`;
      }, "");

      const blob = new Blob([chatText.trim()], {
        type: "text/plain",
      });
      FileSaver.saveAs(blob, `chat-${conversationMetadata.metadata.title}.txt`);
      toast.success(t("Download TXT successfully"));
    } catch (error) {
      console.error("Failed to download TXT:", error);
    }
  };

  const downloadAsPDF = async () => {
    try {
      const [conversationMetadata, conversationItems] = await Promise.all([
        chatClient.getConversation(chatId),
        chatClient.getConversationItems(chatId),
      ]);
      if (!conversationItems || !conversationMetadata) return;
      const containerElement = document.getElementById("messages-container");

      if (containerElement) {
        const isDarkMode = settings.theme === "dark";

        const virtualWidth = 1024;
        const virtualHeight = 1400;

        const clonedElement = containerElement.cloneNode(true) as HTMLElement;
        clonedElement.style.width = `${virtualWidth}px`;
        clonedElement.style.height = "auto";

        document.body.appendChild(clonedElement);

        const canvas = await html2canvas(clonedElement, {
          backgroundColor: "#f5f8f9",
          useCORS: true,
          scale: 2,
          width: virtualWidth,
          windowWidth: virtualWidth,
          windowHeight: virtualHeight,
        });

        document.body.removeChild(clonedElement);

        const imgData = canvas.toDataURL("image/png");

        // A4 page settings
        const pdf = new jsPDF("p", "mm", "a4");
        const imgWidth = 210;
        const pageHeight = 297;

        const imgHeight = (canvas.height * imgWidth) / canvas.width;
        let heightLeft = imgHeight;
        let position = 0;

        // Set page background for dark mode
        if (isDarkMode) {
          pdf.setFillColor(245, 248, 249);
          pdf.rect(0, 0, imgWidth, pageHeight, "F");
        }

        pdf.addImage(imgData, "PNG", 0, position, imgWidth, imgHeight);
        heightLeft -= pageHeight;

        // Handle additional pages
        while (heightLeft > 0) {
          position -= pageHeight;
          pdf.addPage();

          if (isDarkMode) {
            pdf.setFillColor(0, 0, 0);
            pdf.rect(0, 0, imgWidth, pageHeight, "F");
          }

          pdf.addImage(imgData, "PNG", 0, position, imgWidth, imgHeight);
          heightLeft -= pageHeight;
        }

        pdf.save(`chat-${conversationMetadata.metadata.title}.pdf`);
        toast.success(t("Download PDF successfully"));
      }
    } catch (error) {
      console.error("Error generating PDF:", error);
    }
  };

  return (
    <DropdownMenuSub>
      <DropdownMenuSubTrigger className="flex cursor-pointer flex-row gap-2 rounded-md px-3 py-2">
        <ArrowDownTrayIcon className="h-4 w-4" strokeWidth={2} />
        <span>{t("Download")}</span>
      </DropdownMenuSubTrigger>
      <DropdownMenuSubContent className="w-full min-w-[200px] rounded-xl px-1 py-1.5" sideOffset={8}>
        <DropdownMenuItem className="flex cursor-pointer flex-row gap-2 rounded-md px-3 py-2" onClick={downloadAsJSON}>
          <span className="line-clamp-1">{t("Export chat (.json)")}</span>
        </DropdownMenuItem>
        <DropdownMenuItem className="flex cursor-pointer flex-row gap-2 rounded-md px-3 py-2" onClick={downloadAsTXT}>
          <span className="line-clamp-1">{t("Plain text (.txt)")}</span>
        </DropdownMenuItem>
        <DropdownMenuItem className="flex cursor-pointer flex-row gap-2 rounded-md px-3 py-2" onClick={downloadAsPDF}>
          <span className="line-clamp-1">{t("PDF document (.pdf)")}</span>
        </DropdownMenuItem>
      </DropdownMenuSubContent>
    </DropdownMenuSub>
  );
};

export default DownloadDropdown;
