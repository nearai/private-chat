import Bolt from "@heroicons/react/24/outline/BoltIcon";
import Fuse from "fuse.js";
import type React from "react";
import { useCallback, useEffect, useState } from "react";
import NearAIIcon from "@/assets/icons/near-icon-green.svg?react";

import { allPrompts } from "@/pages/welcome/data";

export interface Prompt {
  title: string[];
  content: string;
}

export interface ChatPlaceholderProps {
  inputValue: string;
  setInputValue: (value: string) => void;
  children: React.ReactNode;
}

const ChatPlaceholder: React.FC<ChatPlaceholderProps> = ({ inputValue, setInputValue, children }) => {
  const [filteredPrompts, setFilteredPrompts] = useState<Prompt[]>([]);
  const getFilteredPrompts = useCallback(
    (inputValue: string) => {
      const sortedPrompts = [...(allPrompts ?? [])].sort(() => Math.random() - 0.5);
      if (inputValue.length > 500) {
        setFilteredPrompts([]);
      } else {
        const fuse = new Fuse(sortedPrompts, {
          keys: ["content", "title"],
          threshold: 0.5,
        });

        const newFilteredPrompts =
          inputValue.trim() && fuse ? fuse.search(inputValue.trim()).map((result) => result.item) : sortedPrompts;

        if (filteredPrompts.length !== newFilteredPrompts.length) {
          setFilteredPrompts(newFilteredPrompts);
        }
      }
    },
    [filteredPrompts]
  );

  useEffect(() => {
    getFilteredPrompts(inputValue);
  }, [inputValue, getFilteredPrompts]);

  return (
    <div className="flex h-full w-full flex-col">
      <div className="m-auto w-full max-w-6xl translate-y-6 px-2 py-24 text-center 2xl:px-20">
        <div className="flex w-full items-center gap-4 text-center font-primary text-3xl text-gray-800 dark:text-gray-100">
          <div className="flex w-full flex-col items-center justify-center">
            <div className="flex w-fit max-w-2xl flex-col items-center justify-center gap-3 px-2 pb-3 sm:gap-3.5">
              <h1 className="flex items-center gap-2 text-3xl sm:text-3xl">
                <NearAIIcon className="h-6" /> AI
              </h1>
              <p className="text-base dark:text-gray-300">
                Chat with your personal assistant without worrying about leaking private information.
              </p>
            </div>
            {children}
            <div className="mx-auto mt-2 w-full max-w-2xl font-primary">
              <div className="mx-5">
                <div className="mb-1 flex items-center gap-1 font-medium text-gray-400 text-xs dark:text-gray-400">
                  <Bolt className="h-4 w-4" />
                  Suggested
                </div>
                <div className="h-40 w-full">
                  <div role="list" className="scrollbar-none max-h-40 items-start overflow-auto">
                    {filteredPrompts.map((prompt, idx) => (
                      <button
                        key={prompt.content}
                        role="listitem"
                        className="waterfall group flex w-full flex-1 shrink-0 flex-col justify-between rounded-xl bg-transparent px-3 py-2 font-normal text-base transition hover:bg-black/5 dark:hover:bg-white/5"
                        style={{ animationDelay: `${idx * 60}ms` }}
                        onClick={() => setInputValue(prompt.content)}
                      >
                        <div className="flex flex-col text-left">
                          {prompt.title && prompt.title[0] !== "" ? (
                            <>
                              <div className="line-clamp-1 font-medium transition dark:text-gray-300 dark:group-hover:text-gray-200">
                                {prompt.title[0]}
                              </div>
                              <div className="line-clamp-1 font-normal text-gray-400 text-xs dark:text-gray-400">
                                {prompt.title[1]}
                              </div>
                            </>
                          ) : (
                            <>
                              <div className="line-clamp-1 font-medium transition dark:text-gray-300 dark:group-hover:text-gray-200">
                                {prompt.content}
                              </div>
                              <div className="line-clamp-1 font-normal text-gray-600 text-xs dark:text-gray-400">
                                Prompt
                              </div>
                            </>
                          )}
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ChatPlaceholder;
