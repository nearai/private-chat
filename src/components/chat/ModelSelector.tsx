import { CheckIcon, ChevronDown } from "lucide-react";
import { useState } from "react";
import OpenAIIcon from "@/assets/icons/openai.svg";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/time";
import { useChatStore } from "@/stores/useChatStore";
import type { ModelV1 } from "@/types";
import { Button } from "../ui/button";

interface ModelSelectorItemProps {
  value: string;
  index: number;
  availableModels: ModelV1[];
  onChange: (index: number, modelId: string) => void;
  onRemove: (index: number) => void;
  showRemove: boolean;
}

function ModelSelectorItem({ value, index, availableModels, onChange, onRemove, showRemove }: ModelSelectorItemProps) {
  const selectedModelObj = value ? availableModels.find((m) => m.modelId === value) : null;
  const [open, setOpen] = useState(false);

  return (
    <div className="flex w-full max-w-fit">
      <div className="mr-1 max-w-full">
        <DropdownMenu open={open} onOpenChange={setOpen}>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              className={cn(
                "flex w-full items-center gap-1.5 truncate rounded-lg bg-transparent px-3 py-1.5 font-normal text-base leading-[normal] outline-hidden hover:bg-secondary/30",
                open && "bg-secondary/30"
              )}
              aria-label="Select a model"
            >
              {selectedModelObj ? (
                <>
                  <img src={selectedModelObj.metadata?.modelIcon ?? OpenAIIcon} alt="Model" className="size-5" />
                  {selectedModelObj.modelId}
                </>
              ) : (
                "Select a model"
              )}
              <ChevronDown className="h-5 w-5 opacity-60" strokeWidth={2.5} />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="max-h-64" align="start">
            <>
              {availableModels.length === 0 ? (
                <DropdownMenuItem className="block text-sm">No results found</DropdownMenuItem>
              ) : (
                availableModels.map((model) => {
                  const isSelected = value === model.modelId;

                  return (
                    <DropdownMenuItem
                      key={model.modelId}
                      onClick={() => onChange(index, model.modelId)}
                      className={cn("cursor-pointer", isSelected && "pointer-events-none")}
                    >
                      <div className="flex flex-1 items-center gap-2">
                        <img src={model.metadata?.modelIcon ?? OpenAIIcon} alt="Model" className="size-5" />
                        <div className="line-clamp-1">{model.modelId}</div>
                      </div>
                      <div className="flex size-6 shrink-0 items-center justify-center">
                        {isSelected && <CheckIcon className="size-4" />}
                      </div>
                    </DropdownMenuItem>
                  );
                })
              )}
            </>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {showRemove && (
        <div className="-translate-y-[0.5px] mx-1 self-center disabled:opacity-40">
          <button
            type="button"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onRemove(index);
            }}
            aria-label="Remove Model"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth="2"
              stroke="currentColor"
              className="size-3"
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 12h-15" />
            </svg>
          </button>
        </div>
      )}
    </div>
  );
}

export default function ModelSelector() {
  const { models, selectedModels, setSelectedModels } = useChatStore();

  const handleModelChange = (index: number, modelId: string) => {
    const newModels = [...selectedModels];
    newModels[index] = modelId;
    setSelectedModels(newModels);
  };

  const handleAddModel = () => {
    if (selectedModels.length < models.length) {
      setSelectedModels([...selectedModels]);
    }
  };

  const handleRemoveModel = (index: number) => {
    if (selectedModels.length > 1) {
      const newModels = [...selectedModels];
      newModels.splice(index, 1);
      setSelectedModels(newModels);
    }
  };

  const getAvailableModelsForIndex = (currentIndex: number) => {
    const otherSelectedModels = selectedModels.filter((_, idx) => idx !== currentIndex);

    return models.filter((modelId) => !otherSelectedModels.includes(modelId.modelId));
  };

  const disabledAdd = selectedModels.length >= models.length;

  return (
    <div className="flex w-full flex-col items-start">
      {selectedModels.map((selectedModel, selectedModelIdx) => (
        <div key={selectedModel} className="flex w-full items-center">
          <ModelSelectorItem
            value={selectedModel}
            index={selectedModelIdx}
            availableModels={getAvailableModelsForIndex(selectedModelIdx)}
            onChange={handleModelChange}
            onRemove={handleRemoveModel}
            showRemove={selectedModelIdx > 0}
          />
          {selectedModelIdx === 0 && !disabledAdd && (
            <Button
              variant="ghost"
              size="icon"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                handleAddModel();
              }}
              aria-label="Add Model"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth="2"
                stroke="currentColor"
                className="size-5"
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v12m6-6H6" />
              </svg>
            </Button>
          )}
        </div>
      ))}
    </div>
  );
}
