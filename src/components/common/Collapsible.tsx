import React, { type ReactNode, useState } from "react";
import { cn } from "@/lib/time";

interface CollapsibleProps {
  title?: string;
  children: ReactNode;
  className?: string;
  buttonClassName?: string;
  id?: string;
  open?: boolean;
  disabled?: boolean;
  hide?: boolean;
  chevron?: boolean;
  grow?: boolean;
  onChange?: (open: boolean) => void;
}

const ChevronUp: React.FC<{ className?: string; strokeWidth?: string }> = ({
  className = "w-3.5 h-3.5",
  strokeWidth = "3.5",
}) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    fill="none"
    viewBox="0 0 24 24"
    strokeWidth={strokeWidth}
    stroke="currentColor"
    className={className}
  >
    <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 15.75 7.5-7.5 7.5 7.5" />
  </svg>
);

const ChevronDown: React.FC<{ className?: string; strokeWidth?: string }> = ({
  className = "w-3.5 h-3.5",
  strokeWidth = "3.5",
}) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    fill="none"
    viewBox="0 0 24 24"
    strokeWidth={strokeWidth}
    stroke="currentColor"
    className={className}
  >
    <path strokeLinecap="round" strokeLinejoin="round" d="m19.5 8.25-7.5 7.5-7.5-7.5" />
  </svg>
);

const Collapsible: React.FC<CollapsibleProps> = ({
  title,
  children,
  className = "",
  buttonClassName = "w-fit text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 transition",
  id,
  open: controlledOpen,
  disabled = false,
  hide = false,
  chevron = true,
  grow = false,
  onChange,
}) => {
  const [internalOpen, setInternalOpen] = useState(false);

  // Use controlled open state if provided, otherwise use internal state
  const isOpen = controlledOpen !== undefined ? controlledOpen : internalOpen;

  const toggleOpen = () => {
    if (!disabled) {
      const newOpen = !isOpen;
      if (controlledOpen === undefined) {
        setInternalOpen(newOpen);
      }
      onChange?.(newOpen);
    }
  };

  return (
    <div id={id} className={className}>
      <div className={`${buttonClassName} cursor-pointer`} onClick={toggleOpen}>
        <div className="flex w-full flex-row items-center gap-2 font-medium">
          <div>{title}</div>
          {chevron && (
            <div className="flex translate-y-[2px] items-center justify-center">
              {isOpen ? <ChevronUp /> : <ChevronDown />}
            </div>
          )}
        </div>

        {grow && (
          <div
            className={cn(
              "overflow-hidden transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)]",
              isOpen && !hide ? "max-h-screen opacity-100" : "max-h-0 opacity-0"
            )}
          >
            {children}
          </div>
        )}
      </div>

      {!grow && isOpen && !hide && (
        <div className="transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)]">{children}</div>
      )}
    </div>
  );
};

export default Collapsible;
