import { Check, ChevronDown } from "lucide-react";
import OpenAIIcon from "@/assets/icons/open-ai-icon.png";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/time";
import { useChatStore } from "@/stores/useChatStore";
import type { Model } from "@/types";

interface ModelSelectorItemProps {
  value: string;
  index: number;
  availableModels: Model[];
  onChange: (index: number, modelId: string) => void;
  onRemove: (index: number) => void;
  showRemove: boolean;
}

function ModelSelectorItem({ value, index, availableModels, onChange, onRemove, showRemove }: ModelSelectorItemProps) {
  const selectedModelObj = value ? availableModels.find((m) => m.id === value) : null;

  return (
    <div className="flex w-full max-w-fit">
      <div className="w-full overflow-hidden">
        <div className="mr-1 max-w-full">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                type="button"
                className="flex w-full items-center gap-1.5 truncate rounded bg-transparent px-3 py-1.5 font-semibold text-sm outline-hidden dark:bg-[rgba(0,236,151,0.08)] dark:text-[rgba(0,236,151,1)]"
                aria-label="Select a model"
              >
                <span className="self-end pb-[1px] font-normal text-xs opacity-50">Model</span>
                {selectedModelObj ? selectedModelObj.id : "Select a model"}
                <ChevronDown className="ml-2 size-3 self-center" strokeWidth={2.5} />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent
              className="w-[32rem] max-w-[calc(100vw-1rem)] rounded-xl border-none bg-white shadow-lg ring-none dark:bg-gray-875 dark:text-white"
              align="start"
            >
              <div className="max-h-64 overflow-y-auto px-3 py-2">
                {availableModels.length === 0 ? (
                  <div className="block px-3 py-2 text-gray-700 text-sm dark:text-gray-100">No results found</div>
                ) : (
                  availableModels.map((model) => {
                    const isSelected = value === model.id;

                    return (
                      <DropdownMenuItem
                        key={model.id}
                        onClick={() => onChange(index, model.id)}
                        className={cn(
                          "mb-1 flex w-full cursor-pointer select-none flex-row items-center rounded-button rounded-lg py-2 pr-1.5 pl-3 text-left font-medium text-gray-700 text-sm outline-hidden transition-all duration-75 hover:bg-gray-100 dark:text-gray-100 dark:hover:bg-gray-800",
                          isSelected && "bg-gray-100 dark:bg-gray-800"
                        )}
                      >
                        <div className="flex flex-1 flex-col">
                          <div className="flex items-center gap-2">
                            <div className="flex min-w-fit items-center">
                              <div className="mr-2 flex size-5 items-center justify-center">
                                <img
                                  src={model.info?.meta?.profile_image_url ?? OpenAIIcon}
                                  alt="Model"
                                  className="size-3.5"
                                />
                              </div>
                              <div className="line-clamp-1">{model.id}</div>
                            </div>
                          </div>
                        </div>
                        {isSelected && (
                          <div className="ml-auto pr-2 pl-2 md:pr-0">
                            <Check className="h-5 w-5 text-green-500" />
                          </div>
                        )}
                      </DropdownMenuItem>
                    );
                  })
                )}
              </div>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {showRemove && (
        <div className="-translate-y-[0.5px] mx-1 self-center disabled:text-gray-600 disabled:hover:text-gray-600">
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

    return models.filter((modelId) => !otherSelectedModels.includes(modelId.id));
  };

  const disabledAdd = selectedModels.length >= models.length;
  console.log("models", models, selectedModels);
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
            <div className="-translate-y-[0.5px] mx-1 self-center disabled:text-gray-600 disabled:hover:text-gray-600">
              <button
                type="button"
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
                  className="size-3.5"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v12m6-6H6" />
                </svg>
              </button>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
