import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import ChatsIcon from "@/assets/icons/chats.svg?react";
import AboutIcon from "@/assets/icons/info.svg?react";
import SettingsIcon from "@/assets/icons/settings.svg?react";
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
          icon: SettingsIcon,
          content: <GeneralSettings />,
        },
        {
          id: "chats",
          label: t("Chats"),
          icon: ChatsIcon,
          content: (
            <ChatsSettings
              onImportFinish={() => {
                onOpenChange(false);
              }}
            />
          ),
        },
        {
          id: "about",
          label: t("About"),
          icon: AboutIcon,
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

        <TabbedContent tabs={tabs} defaultTab="general" className="max-h-128 md:min-h-128" />
      </DialogContent>
    </Dialog>
  );
};

export default SettingsDialog;
