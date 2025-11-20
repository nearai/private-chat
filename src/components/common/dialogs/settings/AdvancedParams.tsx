import { useTranslation } from "react-i18next";
import type { Settings } from "@/types";
import { CycleParam, ParamControl, RangeInput, TextInput, ToggleSwitch } from "./ParamComponents";

interface AdvancedParamsProps {
  admin?: boolean;
  params: NonNullable<Settings["params"]>;
  onChange: (params: AdvancedParamsProps["params"]) => void;
}

const AdvancedParams = ({ admin = false, params, onChange }: AdvancedParamsProps) => {
  const { t } = useTranslation("translation", { useSuspense: false });

  const updateParam = <K extends keyof AdvancedParamsProps["params"]>(
    key: K,
    value: AdvancedParamsProps["params"][K]
  ) => {
    onChange({ ...params, [key]: value });
  };

  const cycleStreamResponse = () => {
    const current = params.stream_response ?? null;
    const next = current === null ? true : current === true ? false : null;
    updateParam("stream_response", next);
  };

  const toggleFunctionCalling = () => {
    updateParam("function_calling", params.function_calling === null ? "native" : null);
  };

  return (
    <div className="flex flex-col gap-2 text-xs">
      {/* Stream Chat Response */}
      <CycleParam
        label={t("Stream Chat Response")}
        tooltip={t(
          "When enabled, the model will respond to each chat message in real-time, generating a response as soon as the user sends a message. This mode is useful for live chat applications, but may impact performance on slower hardware."
        )}
        value={params.stream_response === true ? t("On") : params.stream_response === false ? t("Off") : t("Default")}
        onCycle={cycleStreamResponse}
      />

      {/* Function Calling */}
      <CycleParam
        label={t("Function Calling")}
        tooltip={t(
          "Default mode works with a wider range of models by calling tools once before execution. Native mode leverages the model’s built-in tool-calling capabilities, but requires the model to inherently support this feature."
        )}
        value={params.function_calling === "native" ? t("Native") : t("Default")}
        onCycle={toggleFunctionCalling}
      />

      {/* Seed */}
      <ParamControl
        label={t("Seed")}
        tooltip={t(
          "Sets the random number seed to use for generation. Setting this to a specific number will make the model generate the same text for the same prompt."
        )}
        isCustom={params.seed !== null}
        onToggle={() => updateParam("seed", params.seed === null ? 0 : null)}
      >
        <TextInput<number>
          value={params.seed!}
          onChange={(value) => updateParam("seed", value)}
          placeholder={t("Enter Seed")}
          type="number"
          min="0"
          parse={parseInt}
        />
      </ParamControl>

      {/* Stop Sequence */}
      <ParamControl
        label={t("Stop Sequence")}
        tooltip={t(
          "Sets the stop sequences to use. When this pattern is encountered, the LLM will stop generating text and return. Multiple stop patterns may be set by specifying multiple separate stop parameters in a modelfile."
        )}
        isCustom={params.stop !== null}
        onToggle={() => updateParam("stop", params.stop === null ? "" : null)}
      >
        <TextInput<string>
          value={params.stop!}
          onChange={(value) => updateParam("stop", value)}
          placeholder={t("Enter stop sequence")}
          type="text"
        />
      </ParamControl>

      {/* Temperature */}
      <ParamControl
        label={t("Temperature")}
        tooltip={t(
          "The temperature of the model. Increasing the temperature will make the model answer more creatively."
        )}
        isCustom={params.temperature !== null}
        onToggle={() => updateParam("temperature", params.temperature === null ? 0.8 : null)}
      >
        <RangeInput
          value={params.temperature!}
          onChange={(value) => updateParam("temperature", value)}
          min="0"
          max="2"
          step="0.05"
        />
      </ParamControl>

      {/* Reasoning Effort */}
      <ParamControl
        label={t("Reasoning Effort")}
        tooltip={t(
          "Constrains effort on reasoning for reasoning models. Only applicable to reasoning models from specific providers that support reasoning effort."
        )}
        isCustom={params.reasoning_effort !== null}
        onToggle={() => updateParam("reasoning_effort", params.reasoning_effort === null ? "medium" : null)}
      >
        <TextInput
          value={params.reasoning_effort!}
          onChange={(value) => updateParam("reasoning_effort", value)}
          placeholder={t("Enter reasoning effort")}
          type="text"
        />
      </ParamControl>

      {/* Logit Bias */}
      <ParamControl
        label={t("Logit Bias")}
        tooltip={t(
          "Boosting or penalizing specific tokens for constrained responses. Bias values will be clamped between -100 and 100 (inclusive). (Default: none)"
        )}
        isCustom={params.logit_bias !== null}
        onToggle={() => updateParam("logit_bias", params.logit_bias === null ? "" : null)}
      >
        <TextInput
          value={params.logit_bias!}
          onChange={(value) => updateParam("logit_bias", value)}
          placeholder={t('Enter comma-seperated "token:bias_value" pairs (example: 5432:100, 413:-100)')}
          type="text"
        />
      </ParamControl>

      {/* Mirostat */}
      <ParamControl
        label={t("Mirostat")}
        tooltip={t("Enable Mirostat sampling for controlling perplexity.")}
        isCustom={params.mirostat !== null}
        onToggle={() => updateParam("mirostat", params.mirostat === null ? 0 : null)}
      >
        <RangeInput
          value={params.mirostat!}
          onChange={(value) => updateParam("mirostat", value)}
          min="0"
          max="2"
          step="1"
          parse={parseInt}
        />
      </ParamControl>

      {/* Mirostat Eta */}
      <ParamControl
        label={t("Mirostat Eta")}
        tooltip={t(
          "Influences how quickly the algorithm responds to feedback from the generated text. A lower learning rate will result in slower adjustments, while a higher learning rate will make the algorithm more responsive."
        )}
        isCustom={params.mirostat_eta !== null}
        onToggle={() => updateParam("mirostat_eta", params.mirostat_eta === null ? 0.1 : null)}
      >
        <RangeInput
          value={params.mirostat_eta!}
          onChange={(value) => updateParam("mirostat_eta", value)}
          min="0"
          max="1"
          step="0.05"
        />
      </ParamControl>

      {/* Mirostat Tau */}
      <ParamControl
        label={t("Mirostat Tau")}
        tooltip={t(
          "Controls the balance between coherence and diversity of the output. A lower value will result in more focused and coherent text."
        )}
        isCustom={params.mirostat_tau !== null}
        onToggle={() => updateParam("mirostat_tau", params.mirostat_tau === null ? 5.0 : null)}
      >
        <RangeInput
          value={params.mirostat_tau!}
          onChange={(value) => updateParam("mirostat_tau", value)}
          min="0"
          max="10"
          step="0.5"
        />
      </ParamControl>

      {/* Top K */}
      <ParamControl
        label={t("Top K")}
        tooltip={t(
          "Reduces the probability of generating nonsense. A higher value (e.g. 100) will give more diverse answers, while a lower value (e.g. 10) will be more conservative."
        )}
        isCustom={params.top_k !== null}
        onToggle={() => updateParam("top_k", params.top_k === null ? 40 : null)}
      >
        <RangeInput
          value={params.top_k!}
          onChange={(value) => updateParam("top_k", value)}
          min="0"
          max="1000"
          step="0.5"
        />
      </ParamControl>

      {/* Top P */}
      <ParamControl
        label={t("Top P")}
        tooltip={t(
          "Works together with top-k. A higher value (e.g., 0.95) will lead to more diverse text, while a lower value (e.g., 0.5) will generate more focused and conservative text."
        )}
        isCustom={params.top_p !== null}
        onToggle={() => updateParam("top_p", params.top_p === null ? 0.9 : null)}
      >
        <RangeInput
          value={params.top_p!}
          onChange={(value) => updateParam("top_p", value)}
          min="0"
          max="1"
          step="0.05"
        />
      </ParamControl>

      {/* Min P */}
      <ParamControl
        label={t("Min P")}
        tooltip={t(
          "Alternative to the top_p, and aims to ensure a balance of quality and variety. The parameter p represents the minimum probability for a token to be considered, relative to the probability of the most likely token. For example, with p=0.05 and the most likely token having a probability of 0.9, logits with a value less than 0.045 are filtered out."
        )}
        isCustom={params.min_p !== null}
        onToggle={() => updateParam("min_p", params.min_p === null ? 0.0 : null)}
      >
        <RangeInput
          value={params.min_p!}
          onChange={(value) => updateParam("min_p", value)}
          min="0"
          max="1"
          step="0.05"
        />
      </ParamControl>

      {/* Frequency Penalty */}
      <ParamControl
        label={t("Frequency Penalty")}
        tooltip={t(
          "Sets a scaling bias against tokens to penalize repetitions, based on how many times they have appeared. A higher value (e.g., 1.5) will penalize repetitions more strongly, while a lower value (e.g., 0.9) will be more lenient. At 0, it is disabled."
        )}
        isCustom={params.frequency_penalty !== null}
        onToggle={() => updateParam("frequency_penalty", params.frequency_penalty === null ? 1.1 : null)}
      >
        <RangeInput
          value={params.frequency_penalty!}
          onChange={(value) => updateParam("frequency_penalty", value)}
          min="-2"
          max="2"
          step="0.05"
        />
      </ParamControl>

      {/* Presence Penalty */}
      <ParamControl
        label={t("Presence Penalty")}
        tooltip={t(
          "Sets a flat bias against tokens that have appeared at least once. A higher value (e.g., 1.5) will penalize repetitions more strongly, while a lower value (e.g., 0.9) will be more lenient. At 0, it is disabled."
        )}
        isCustom={params.presence_penalty !== null}
        onToggle={() => updateParam("presence_penalty", params.presence_penalty === null ? 0.0 : null)}
      >
        <RangeInput
          value={params.presence_penalty!}
          onChange={(value) => updateParam("presence_penalty", value)}
          min="-2"
          max="2"
          step="0.05"
        />
      </ParamControl>

      {/* Repeat Last N */}
      <ParamControl
        label={t("Repeat Last N")}
        tooltip={t("Sets how far back for the model to look back to prevent repetition.")}
        isCustom={params.repeat_last_n !== null}
        onToggle={() => updateParam("repeat_last_n", params.repeat_last_n === null ? 64 : null)}
      >
        <RangeInput
          value={params.repeat_last_n!}
          onChange={(value) => updateParam("repeat_last_n", value)}
          min="-1"
          max="128"
          step="1"
          parse={parseInt}
        />
      </ParamControl>

      {/* Tfs Z */}
      <ParamControl
        label={t("Tfs Z")}
        tooltip={t(
          "Tail free sampling is used to reduce the impact of less probable tokens from the output. A higher value (e.g., 2.0) will reduce the impact more, while a value of 1.0 disables this setting."
        )}
        isCustom={params.tfs_z !== null}
        onToggle={() => updateParam("tfs_z", params.tfs_z === null ? 1 : null)}
      >
        <RangeInput
          value={params.tfs_z!}
          onChange={(value) => updateParam("tfs_z", value)}
          min="0"
          max="2"
          step="0.05"
        />
      </ParamControl>

      {/* Tokens To Keep On Context Refresh (num_keep) */}
      <ParamControl
        label={t("Tokens To Keep On Context Refresh (num_keep)")}
        tooltip={t(
          "This option controls how many tokens are preserved when refreshing the context. For example, if set to 2, the last 2 tokens of the conversation context will be retained. Preserving context can help maintain the continuity of a conversation, but it may reduce the ability to respond to new topics."
        )}
        isCustom={params.num_keep !== null}
        onToggle={() => updateParam("num_keep", params.num_keep === null ? 24 : null)}
      >
        <RangeInput
          value={params.num_keep!}
          onChange={(value) => updateParam("num_keep", value)}
          min="-1"
          max="10240000"
          step="1"
          parse={parseInt}
        />
      </ParamControl>

      {/* Max Tokens (num_predict) */}
      <ParamControl
        label={t("Max Tokens (num_predict)")}
        tooltip={t(
          "This option sets the maximum number of tokens the model can generate in its response. Increasing this limit allows the model to provide longer answers, but it may also increase the likelihood of unhelpful or irrelevant content being generated."
        )}
        isCustom={params.max_tokens !== null}
        onToggle={() => updateParam("max_tokens", params.max_tokens === null ? 128 : null)}
      >
        <RangeInput
          value={params.max_tokens!}
          onChange={(value) => updateParam("max_tokens", value)}
          min="-2"
          max="131072"
          step="1"
          parse={parseInt}
        />
      </ParamControl>

      {/* Repeat Penalty (Ollama) */}
      <ParamControl
        label={t("Repeat Penalty (Ollama)")}
        tooltip={t(
          "Control the repetition of token sequences in the generated text. A higher value (e.g., 1.5) will penalize repetitions more strongly, while a lower value (e.g., 1.1) will be more lenient. At 1, it is disabled."
        )}
        isCustom={params.repeat_penalty !== null}
        onToggle={() => updateParam("repeat_penalty", params.repeat_penalty === null ? 1.1 : null)}
      >
        <RangeInput
          value={params.repeat_penalty!}
          onChange={(value) => updateParam("repeat_penalty", value)}
          min="-2"
          max="2"
          step="0.05"
        />
      </ParamControl>

      {/* Context Length (Ollama) */}
      <ParamControl
        label={`${t("Context Length")} (${t("Ollama")})`}
        tooltip={t("Sets the size of the context window used to generate the next token.")}
        isCustom={params.num_ctx !== null}
        onToggle={() => updateParam("num_ctx", params.num_ctx === null ? 2048 : null)}
      >
        <RangeInput
          value={params.num_ctx!}
          onChange={(value) => updateParam("num_ctx", value)}
          min="-1"
          max="10240000"
          step="1"
          parse={parseInt}
        />
      </ParamControl>

      {/* Batch Size (num_batch) */}
      <ParamControl
        label={t("Batch Size (num_batch)")}
        tooltip={t(
          "The batch size determines how many text requests are processed together at once. A higher batch size can increase the performance and speed of the model, but it also requires more memory."
        )}
        isCustom={params.num_batch !== null}
        onToggle={() => updateParam("num_batch", params.num_batch === null ? 512 : null)}
      >
        <RangeInput
          value={params.num_batch!}
          onChange={(value) => updateParam("num_batch", value)}
          min="256"
          max="8192"
          step="256"
          parse={parseInt}
        />
      </ParamControl>

      {/* Admin-only settings */}
      {admin && (
        <>
          {/* use_mmap (Ollama) */}
          <ParamControl
            label={t("use_mmap (Ollama)")}
            tooltip={t(
              "Enable Memory Mapping (mmap) to load model data. This option allows the system to use disk storage as an extension of RAM by treating disk files as if they were in RAM. This can improve model performance by allowing for faster data access. However, it may not work correctly with all systems and can consume a significant amount of disk space."
            )}
            isCustom={params.use_mmap !== null}
            onToggle={() => updateParam("use_mmap", params.use_mmap === null ? true : null)}
          >
            <ToggleSwitch
              value={params.use_mmap!}
              onChange={(value) => updateParam("use_mmap", value)}
              enabledLabel="Enabled"
              disabledLabel="Disabled"
            />
          </ParamControl>

          {/* use_mlock (Ollama) */}
          <ParamControl
            label={t("use_mlock (Ollama)")}
            tooltip={t(
              "Enable Memory Locking (mlock) to prevent model data from being swapped out of RAM. This option locks the model's working set of pages into RAM, ensuring that they will not be swapped out to disk. This can help maintain performance by avoiding page faults and ensuring fast data access."
            )}
            isCustom={params.use_mlock !== null}
            onToggle={() => updateParam("use_mlock", params.use_mlock === null ? true : null)}
          >
            <ToggleSwitch
              value={params.use_mlock!}
              onChange={(value) => updateParam("use_mlock", value)}
              enabledLabel="Enabled"
              disabledLabel="Disabled"
            />
          </ParamControl>

          {/* num_thread (Ollama) */}
          <ParamControl
            label={t("num_thread (Ollama)")}
            tooltip={t(
              "Set the number of worker threads used for computation. This option controls how many threads are used to process incoming requests concurrently. Increasing this value can improve performance under high concurrency workloads but may also consume more CPU resources."
            )}
            isCustom={params.num_thread !== null}
            onToggle={() => updateParam("num_thread", params.num_thread === null ? 2 : null)}
          >
            <RangeInput
              value={params.num_thread!}
              onChange={(value) => updateParam("num_thread", value)}
              min="1"
              max="256"
              step="1"
              parse={parseInt}
            />
          </ParamControl>

          {/* num_gpu (Ollama) */}
          <ParamControl
            label={t("num_gpu (Ollama)")}
            tooltip={t(
              "Set the number of layers, which will be off-loaded to GPU. Increasing this value can significantly improve performance for models that are optimized for GPU acceleration but may also consume more power and GPU resources."
            )}
            isCustom={params.num_gpu !== null}
            onToggle={() => updateParam("num_gpu", params.num_gpu === null ? 0 : null)}
          >
            <RangeInput
              value={params.num_gpu!}
              onChange={(value) => updateParam("num_gpu", value)}
              min="0"
              max="256"
              step="1"
              parse={parseInt}
            />
          </ParamControl>
        </>
      )}
    </div>
  );
};

export default AdvancedParams;
