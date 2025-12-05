import { useUserSettings } from "@/api/users/queries";
import { useTheme } from "@/components/common/ThemeProvider";
import { useChatStore } from "@/stores/useChatStore";
import { useEffect } from "react";

export default function useInitRemoteSettings() {
  const { setTheme } = useTheme();
  const { setWebSearchEnabled } = useChatStore();
  const { data: remoteSettings, isLoading } = useUserSettings();

  useEffect(() => {
    if (!remoteSettings?.settings) return;
    if (remoteSettings.settings.appearance) {
      setTheme(remoteSettings.settings.appearance);
    }
    setWebSearchEnabled(remoteSettings.settings.web_search);
  }, [remoteSettings, setTheme, setWebSearchEnabled]);

  return {
    isSettingsLoading: isLoading,
  };
}
