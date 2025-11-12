import { ChatBubbleOvalLeftEllipsisIcon, Cog8ToothIcon, InformationCircleIcon } from "@heroicons/react/24/solid";
import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import TabbedContent from "@/components/common/TabbedContent";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import AboutSettings from "./AboutSettings";
import ChatsSettings from "./ChatsSettings";
import GeneralSettings from "./GeneralSettings";

interface SettingsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const SettingsDialog = ({ open, onOpenChange }: SettingsDialogProps) => {
  const { t } = useTranslation("translation", { useSuspense: false });

  const tabs = useMemo(
    () =>
      [
        {
          id: "general",
          label: t("General"),
          icon: Cog8ToothIcon,
          content: <GeneralSettings />,
        },
        {
          id: "chats",
          label: t("Chats"),
          icon: ChatBubbleOvalLeftEllipsisIcon,
          content: <ChatsSettings />,
        },
        {
          id: "about",
          label: t("About"),
          icon: InformationCircleIcon,
          content: <AboutSettings />,
        },
      ] as const,
    [t]
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t("Settings")}</DialogTitle>
          <DialogDescription className="sr-only" />
        </DialogHeader>

        <TabbedContent tabs={tabs} defaultTab="general" className="max-h-[32rem] md:min-h-[32rem]" />
      </DialogContent>
    </Dialog>
  );
};

export default SettingsDialog;
