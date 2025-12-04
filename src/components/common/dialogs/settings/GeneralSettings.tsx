import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { useUpdateUserSettings, useUserSettings } from "@/api/users/queries";

import { useTheme, type Theme } from "@/components/common/ThemeProvider";
import { Button } from "@/components/ui/button";

import { changeLanguage, getLanguages } from "@/i18n";
import { useChatStore } from "@/stores/useChatStore";
import { useSettingsStore } from "@/stores/useSettingsStore";
import { useUserStore } from "@/stores/useUserStore";
import type { Settings } from "@/types";
import AdvancedParams from "./AdvancedParams";
import { CycleParam, ParamControl, SelectParam, SwitchParam, TextInput } from "./ParamComponents";

interface Language {
  code: string;
  title: string;
}

const GeneralSettings = () => {
  const { t, i18n } = useTranslation("translation", { useSuspense: false });
  const { settings, setSettings } = useSettingsStore();
  const { user } = useUserStore();
  const { data: remoteSettings } = useUserSettings();
  const { mutateAsync: updateUserSettings, isPending: isUpdatingSettings } = useUpdateUserSettings();
  const { theme, setTheme } = useTheme();

  const [saved, setSaved] = useState(false);
  const [languages, setLanguages] = useState<Language[]>([]);
  const [lang, setLang] = useState(i18n.language || "en-US");
  const [notificationEnabled, setNotificationEnabled] = useState(false);
  const [system, setSystem] = useState("");
  const { webSearchEnabled, setWebSearchEnabled } = useChatStore();

  const [formAppearance, setFormAppearance] = useState<Theme>(theme);
  const [formWebSearchEnabled, setFormWebSearchEnabled] = useState(webSearchEnabled); 
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [requestFormat, setRequestFormat] = useState<string | null>(null);
  const [keepAlive, setKeepAlive] = useState<string | null>(null);
  const [params, setParams] = useState<NonNullable<Settings["params"]>>({
    stream_response: null,
    function_calling: null,
    seed: null,
    temperature: null,
    reasoning_effort: null,
    logit_bias: null,
    frequency_penalty: null,
    presence_penalty: null,
    repeat_penalty: null,
    repeat_last_n: null,
    mirostat: null,
    mirostat_eta: null,
    mirostat_tau: null,
    top_k: null,
    top_p: null,
    min_p: null,
    stop: null,
    tfs_z: null,
    num_ctx: null,
    num_batch: null,
    num_keep: null,
    max_tokens: null,
    use_mmap: null,
    use_mlock: null,
    num_thread: null,
    num_gpu: null,
  });

  useEffect(() => {
    const loadLanguages = async () => {
      const langs = await getLanguages();
      setLanguages(langs);
    };
    loadLanguages();
    setNotificationEnabled(settings.notificationEnabled ?? false);
    setSystem(settings.system || "");

    let rf = settings.requestFormat ?? null;
    if (rf !== null && rf !== "json") {
      rf = typeof rf === "object" ? JSON.stringify(rf, null, 2) : String(rf);
    }
    setRequestFormat(rf);

    setKeepAlive(settings.keepAlive?.toString() ?? null);

    if (settings.params) {
      const settingsParams = settings.params;

      setParams((prevParams) => ({
        ...prevParams,
        stream_response: settingsParams.stream_response ?? null,
        function_calling: settingsParams.function_calling ?? null,
        seed: settingsParams.seed ?? null,
        temperature: settingsParams.temperature ?? null,
        reasoning_effort: settingsParams.reasoning_effort ?? null,
        frequency_penalty: settingsParams.frequency_penalty ?? null,
        presence_penalty: settingsParams.presence_penalty ?? null,
        repeat_penalty: settingsParams.repeat_penalty ?? null,
        repeat_last_n: settingsParams.repeat_last_n ?? null,
        mirostat: settingsParams.mirostat ?? null,
        mirostat_eta: settingsParams.mirostat_eta ?? null,
        mirostat_tau: settingsParams.mirostat_tau ?? null,
        top_k: settingsParams.top_k ?? null,
        top_p: settingsParams.top_p ?? null,
        min_p: settingsParams.min_p ?? null,
        tfs_z: settingsParams.tfs_z ?? null,
        num_ctx: settingsParams.num_ctx ?? null,
        num_batch: settingsParams.num_batch ?? null,
        num_keep: settingsParams.num_keep ?? null,
        max_tokens: settingsParams.max_tokens ?? null,
        use_mmap: settingsParams.use_mmap ?? null,
        use_mlock: settingsParams.use_mlock ?? null,
        num_thread: settingsParams.num_thread ?? null,
        num_gpu: settingsParams.num_gpu ?? null,
        stop: settingsParams.stop ?? null,
        logit_bias: settingsParams.logit_bias ?? null,
      }));
    }
  }, []);

  useEffect(() => {
    if (!remoteSettings) return;

    setNotificationEnabled(remoteSettings.settings.notification);
    setSystem(remoteSettings.settings.system_prompt || "");
    setFormAppearance((remoteSettings.settings.appearance as Theme) || "System");
    setFormWebSearchEnabled(remoteSettings.settings.web_search || false);
  }, [remoteSettings]);

  const toggleNotification = async () => {
    const permission = await Notification.requestPermission();

    if (permission === "granted") {
      const newValue = !notificationEnabled;
      setNotificationEnabled(newValue);
      setSettings({ notificationEnabled: newValue });
    } else {
      toast.error(
        t(
          "Response notifications cannot be activated as the website permissions have been denied. Please visit your browser settings to grant the necessary access."
        )
      );
    }
  };

  const toggleRequestFormat = () => {
    const newFormat = requestFormat === null ? "json" : null;
    setRequestFormat(newFormat);
  };

  const handleLanguageChange = (newLang: string) => {
    setLang(newLang);
    changeLanguage(newLang);
  };

  const handleSave = async () => {
    // let finalRequestFormat: Settings["requestFormat"] = requestFormat;

    // if (finalRequestFormat !== null && finalRequestFormat !== "json") {
    //   if (!validateJSON(finalRequestFormat as string)) {
    //     toast.error(t("Invalid JSON schema"));
    //     return;
    //   }
    //   finalRequestFormat = JSON.parse(finalRequestFormat as string);
    // }

    // setSettings({
    //   system: system !== "" ? system : undefined,
    //   params: {
    //     stream_response:
    //       params.stream_response !== null ? params.stream_response : undefined,
    //     function_calling:
    //       params.function_calling !== null
    //         ? params.function_calling
    //         : undefined,
    //     seed: params.seed !== null ? params.seed : undefined,
    //     stop: params.stop !== null ? params.stop : undefined,
    //     temperature:
    //       params.temperature !== null ? params.temperature : undefined,
    //     reasoning_effort:
    //       params.reasoning_effort !== null
    //         ? params.reasoning_effort
    //         : undefined,
    //     logit_bias: params.logit_bias !== null ? params.logit_bias : undefined,
    //     frequency_penalty:
    //       params.frequency_penalty !== null
    //         ? params.frequency_penalty
    //         : undefined,
    //     presence_penalty:
    //       params.presence_penalty !== null
    //         ? params.presence_penalty
    //         : undefined,
    //     repeat_penalty:
    //       params.repeat_penalty !== null ? params.repeat_penalty : undefined,
    //     repeat_last_n:
    //       params.repeat_last_n !== null ? params.repeat_last_n : undefined,
    //     mirostat: params.mirostat !== null ? params.mirostat : undefined,
    //     mirostat_eta:
    //       params.mirostat_eta !== null ? params.mirostat_eta : undefined,
    //     mirostat_tau:
    //       params.mirostat_tau !== null ? params.mirostat_tau : undefined,
    //     top_k: params.top_k !== null ? params.top_k : undefined,
    //     top_p: params.top_p !== null ? params.top_p : undefined,
    //     min_p: params.min_p !== null ? params.min_p : undefined,
    //     tfs_z: params.tfs_z !== null ? params.tfs_z : undefined,
    //     num_ctx: params.num_ctx !== null ? params.num_ctx : undefined,
    //     num_batch: params.num_batch !== null ? params.num_batch : undefined,
    //     num_keep: params.num_keep !== null ? params.num_keep : undefined,
    //     max_tokens: params.max_tokens !== null ? params.max_tokens : undefined,
    //     use_mmap: params.use_mmap !== null ? params.use_mmap : undefined,
    //     use_mlock: params.use_mlock !== null ? params.use_mlock : undefined,
    //     num_thread: params.num_thread !== null ? params.num_thread : undefined,
    //     num_gpu: params.num_gpu !== null ? params.num_gpu : undefined,
    //   },
    //   keepAlive: keepAlive
    //     ? Number.isNaN(Number(keepAlive))
    //       ? keepAlive
    //       : parseInt(keepAlive, 10)
    //     : undefined,
    //   requestFormat:
    //     finalRequestFormat !== null ? finalRequestFormat : undefined,
    // });

    try {
      // update remote settings
      await updateUserSettings({
        notification: notificationEnabled,
        system_prompt: system || "",
        appearance: formAppearance,
        web_search: formWebSearchEnabled,
      });
      // update local storage
      setWebSearchEnabled(formWebSearchEnabled);
      setTheme(formAppearance);
      toast.success(t("Settings saved successfully!"));
    } catch (error) {
      toast.error(t("Failed to update settings. Please try again."));
      console.error(error);
      return;
    }

    setSaved(true);
    setTimeout(() => {
      setSaved(false);
    }, 2000);
  };

  const handleParamsChange = (newParams: NonNullable<Settings["params"]>) => {
    setParams(newParams);
  };

  const isAdmin = user?.role === "admin";
  const hasPermissions = user?.permissions?.chat;

  return (
    <div className="flex h-full flex-col justify-between text-sm">
      <div className="max-h-112 overflow-y-auto pr-2 lg:max-h-full">
        <div className="flex flex-col gap-5">
          <div className="font-bold text-base">{t("General")}</div>

          <SelectParam
            label={t("Language")}
            value={lang}
            onChange={(value) => handleLanguageChange(value)}
            options={languages.map((language) => ({ value: language.code, label: language.title }))}
          />

          <SelectParam
            label={t("Appearance")}
            value={formAppearance}
            onChange={(value) => setFormAppearance(value as Theme)}
            options={[
              { value: "Dark", label: t("Dark") },
              { value: "Light", label: t("Light") },
              { value: "System", label: t("System") },
            ]}
          />

          <SwitchParam
            label={t("Notifications")}
            description={t("Notifications Description")}
            value={notificationEnabled}
            onChange={toggleNotification}
          />

          <SwitchParam
            label={t("Web Search")}
            value={formWebSearchEnabled}
            description={t("Web Search Description")}
            onChange={() => setFormWebSearchEnabled(!formWebSearchEnabled)}
          />

          <hr className="my-2 border-border" />

          <div className="flex w-full flex-col items-start gap-6">
            <div className="flex grow flex-col items-start gap-1 font-medium text-sm">
              {t("System Prompt")}
              <div className="font-light text-sm">{t("System Prompt Description")}</div>
            </div>
            <textarea
              value={system}
              onChange={(e) => setSystem(e.target.value)}
              className="inline-flex min-h-24 w-full flex-col items-start justify-start gap-4 rounded-2xl border border-border bg-input p-4 font-['Inter'] font-normal text-sm placeholder:text-muted-foreground placeholder:opacity-40 dark:placeholder:opacity-60"
              rows={4}
              placeholder={t("Enter system prompt here")}
            />
          </div>
        </div>

        {/* Admin/Permission-based settings */}
        {(isAdmin || hasPermissions) && (
          <>
            <hr className="my-3 border-border" />

            <div>
              <div className="my-2.5 font-medium text-sm">{t("System Prompt")}</div>
              <textarea
                value={system}
                onChange={(e) => setSystem(e.target.value)}
                className="w-full resize-none rounded-md border border-border bg-input p-2 text-sm outline-none placeholder:text-muted-foreground placeholder:opacity-40 dark:placeholder:opacity-60"
                rows={4}
                placeholder={t("Enter system prompt here")}
              />
            </div>

            <div className="mt-2 space-y-3 pr-1.5">
              <CycleParam
                label={t("Advanced Parameters")}
                value={showAdvanced ? t("Hide") : t("Show")}
                onCycle={() => setShowAdvanced(!showAdvanced)}
              />

              {showAdvanced && (
                <>
                  <AdvancedParams admin={isAdmin} params={params} onChange={handleParamsChange} />

                  <hr className="border-border" />

                  {/* Keep Alive */}
                  <div className="w-full">
                    <ParamControl
                      label={t("Keep Alive")}
                      tooltip="Control how long the model stays loaded in memory. Set to '5m' for 5 minutes, '1h' for 1 hour, or '-1' to keep loaded indefinitely."
                      isCustom={keepAlive !== null}
                      onToggle={() => setKeepAlive(keepAlive === null ? "5m" : null)}
                    >
                      <TextInput
                        value={keepAlive || ""}
                        onChange={(value) => setKeepAlive(value)}
                        placeholder={t("e.g. '30s','10m'. Valid time units are 's', 'm', 'h'.")}
                      />
                    </ParamControl>
                  </div>

                  {/* Request Format */}
                  <div>
                    <ParamControl
                      label={t("Request Mode")}
                      tooltip="Enable JSON mode to force the model to respond with valid JSON. You can also provide a JSON schema to constrain the response format."
                      isCustom={requestFormat !== null}
                      onToggle={toggleRequestFormat}
                      customLabel={t("JSON")}
                    >
                      <div className="mt-0.5 flex">
                        <textarea
                          className="w-full rounded-md border border-border bg-input p-2 text-sm outline-none placeholder:text-muted-foreground placeholder:opacity-40 dark:placeholder:opacity-60"
                          placeholder={t('e.g. "json" or a JSON schema')}
                          value={requestFormat || ""}
                          onChange={(e) => setRequestFormat(e.target.value)}
                          rows={4}
                        />
                      </div>
                    </ParamControl>
                  </div>
                </>
              )}
            </div>
          </>
        )}
      </div>

      {/* Save Button */}
      <div className="flex justify-end pt-3 font-medium text-sm">
        <Button disabled={isUpdatingSettings} size="small" onClick={handleSave}>
          {saved ? t("Saved") : isUpdatingSettings ? t("Saving...") : t("Save")}
        </Button>
      </div>
    </div>
  );
};

export default GeneralSettings;
