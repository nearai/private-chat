import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import Collapsible from "@/components/common/Collapsible";
import { SelectNative } from "@/components/ui/select-native";
import { changeLanguage, getLanguages } from "@/i18n";
import { LOCAL_STORAGE_KEYS } from "@/lib/constants";
import { useSettingsStore } from "@/stores/useSettingsStore";
import { useUserStore } from "@/stores/useUserStore";
import type { Settings } from "@/types";
import AdvancedParams from "./AdvancedParams";
import { CycleParam, ParamControl, TextInput } from "./ParamComponents";

interface Language {
  code: string;
  title: string;
}

const GeneralSettings = () => {
  const { t, i18n } = useTranslation("translation", { useSuspense: false });
  const { settings, setSettings } = useSettingsStore();
  const { user } = useUserStore();

  const [saved, setSaved] = useState(false);
  const [languages, setLanguages] = useState<Language[]>([]);
  const [lang, setLang] = useState(i18n.language || "en-US");
  const [notificationEnabled, setNotificationEnabled] = useState(false);
  const [system, setSystem] = useState(localStorage.getItem(LOCAL_STORAGE_KEYS.SYSTEM_PROMPT) || "");

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
    setSystem(settings.system || localStorage.getItem(LOCAL_STORAGE_KEYS.SYSTEM_PROMPT) || "");

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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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

  const handleSave = () => {
    localStorage.setItem(LOCAL_STORAGE_KEYS.SYSTEM_PROMPT, system);
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

    // toast.success(t("Settings saved successfully!"));
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
      <div className="max-h-[28rem] overflow-y-auto pr-2 lg:max-h-full">
        <div>
          <div className="mb-1 font-medium text-sm">{t("WebUI Settings")}</div>

          {/* Language Selector */}
          <div className="flex w-full justify-between">
            <div className="self-center font-medium text-xs">{t("Language")}</div>
            <div className="relative flex items-center">
              <SelectNative
                className="w-fit rounded-sm bg-gray-900 px-2 py-2 pr-8 text-right text-xs outline-none"
                value={lang}
                onChange={(e) => handleLanguageChange(e.target.value)}
              >
                {languages.map((language) => (
                  <option key={language.code} value={language.code}>
                    {language.title}
                  </option>
                ))}
              </SelectNative>
            </div>
          </div>

          {/* Notifications Toggle */}
          <CycleParam
            label={t("Notifications")}
            value={notificationEnabled ? t("On") : t("Off")}
            onCycle={toggleNotification}
          />

          <hr className="my-2 border-gray-50 dark:border-gray-700/10" />

          <Collapsible title={"System Prompt"} className="w-full">
            <div className="mt-2">
              <textarea
                value={system}
                onChange={(e) => setSystem(e.target.value)}
                className="w-full resize-none bg-gray-900 p-1.5 text-xs outline-hidden"
                rows={4}
                placeholder={"Enter system prompt"}
              />
            </div>
          </Collapsible>
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
                className="w-full resize-none rounded border border-gray-200 bg-white p-2 text-sm outline-none dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300"
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
                          className="w-full rounded border border-gray-200 p-2 text-sm outline-none dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300"
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
        <button
          className="rounded-full bg-black px-3.5 py-1.5 font-medium text-sm text-white transition hover:bg-gray-900 dark:bg-white dark:text-black dark:hover:bg-gray-100"
          onClick={handleSave}
        >
          {saved ? t("Saved") : t("Save")}
        </button>
      </div>
    </div>
  );
};

export default GeneralSettings;
