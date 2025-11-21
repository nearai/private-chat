import type { PropsWithChildren, ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { CompactTooltip } from "@/components/ui/tooltip";

// Button component for toggle
export const ParamButton = ({ children, onClick }: PropsWithChildren & { onClick: () => void }) => {
  return (
    <Button variant="ghost" onClick={onClick} type="button" className="h-auto rounded-sm p-1 text-xs">
      {children}
    </Button>
  );
};

// Base param control with tooltip and label
type ParamControlProps = PropsWithChildren & {
  label: string;
  tooltip: string;
  isCustom: boolean;
  onToggle: () => void;
  children?: ReactNode;
  customLabel?: string;
  defaultLabel?: string;
};

export const ParamControl = ({
  label,
  tooltip,
  isCustom,
  onToggle,
  children,
  customLabel,
  defaultLabel,
}: ParamControlProps) => {
  const { t } = useTranslation("translation", { useSuspense: false });

  return (
    <>
      <CompactTooltip content={tooltip}>
        <div className="flex w-full justify-between">
          <div className="self-center font-medium text-xs">{label}</div>
          <ParamButton onClick={onToggle}>
            <span className="self-center">{isCustom ? customLabel || t("Custom") : defaultLabel || t("Default")}</span>
          </ParamButton>
        </div>
      </CompactTooltip>
      {isCustom && children}
    </>
  );
};

// Range with number input
interface RangeInputProps {
  value: number;
  onChange: (value: number) => void;
  min: number | string;
  max: number | string;
  step: number | string;
  parse?: (value: string) => number;
}

export const RangeInput = ({ value, onChange, min, max, step, parse = parseFloat }: RangeInputProps) => {
  return (
    <div className="mt-0.5 flex items-center gap-2">
      <div className="flex-1">
        <Slider
          min={Number(min)}
          max={Number(max)}
          step={Number(step)}
          value={[value]}
          onValueChange={(value) => onChange(value[0])}
          className="h-2 w-full cursor-pointer appearance-none rounded-lg"
        />
      </div>
      <div>
        <input
          value={value}
          onChange={(e) => onChange(e.target.value ? parse(e.target.value) : 0)}
          type="number"
          className="w-16 bg-transparent text-center"
          min={min}
          max={max}
          step={step === "any" ? "any" : step}
        />
      </div>
    </div>
  );
};

// Simple text input
interface TextInputProps<T = string | number> {
  value: T;
  onChange: (value: T) => void;
  placeholder?: string;
  type?: "text" | "number";
  min?: string;
  parse?: (value: string) => T;
}

export const TextInput = <T extends string | number = string | number>({
  value,
  onChange,
  placeholder = "",
  type = "text",
  min,
  parse,
}: TextInputProps<T>) => {
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (parse && e.target.value) {
      onChange(parse(e.target.value));
    } else if (parse && !e.target.value && type === "number") {
      onChange(0 as T);
    } else {
      onChange(e.target.value as T);
    }
  };

  return (
    <div className="mt-0.5 flex">
      <input
        className="w-full rounded-lg px-4 py-2 text-sm outline-none"
        type={type}
        placeholder={placeholder}
        value={value}
        onChange={handleChange}
        min={min}
      />
    </div>
  );
};

// Toggle switch for boolean values
interface ToggleSwitchProps {
  value: boolean;
  onChange: (value: boolean) => void;
  enabledLabel?: string;
  disabledLabel?: string;
}

export const ToggleSwitch = ({
  value,
  onChange,
  enabledLabel = "Enabled",
  disabledLabel = "Disabled",
}: ToggleSwitchProps) => {
  return (
    <div className="mt-1 flex items-center justify-between">
      <div className="text-muted-foreground text-xs">{value ? enabledLabel : disabledLabel}</div>
      <div className="pr-2">
        <label className="relative inline-flex cursor-pointer items-center">
          <input
            type="checkbox"
            checked={value}
            onChange={(e) => onChange(e.target.checked)}
            className="peer sr-only"
          />
          <div className="peer h-5 w-9 rounded-full bg-secondary/30 after:absolute after:top-[2px] after:left-[2px] after:h-4 after:w-4 after:rounded-full after:border after:border-border after:bg-white after:transition-all after:content-[''] peer-checked:bg-primary peer-checked:after:translate-x-full peer-checked:after:border-white peer-focus:outline-none" />
        </label>
      </div>
    </div>
  );
};

// Cycle button wrapper for multi-state params
interface CycleParamProps {
  label: string;
  tooltip?: string;
  value: React.ReactNode;
  onCycle: () => void;
}

export const CycleParam = ({ label, tooltip, value, onCycle }: CycleParamProps) => {
  const content = (
    <div className="flex w-full justify-between py-0.5">
      <div className="self-center font-medium text-xs">{label}</div>
      <ParamButton onClick={onCycle}>
        <div className="self-center">{value}</div>
      </ParamButton>
    </div>
  );

  if (tooltip) {
    return <CompactTooltip content={tooltip}>{content}</CompactTooltip>;
  }

  return content;
};
