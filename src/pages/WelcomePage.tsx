import type React from "react";
import { useState } from "react";
import { useNavigate } from "react-router";
import ChevronDown from "@/assets/icons/chevron-welcome.svg?react";
import NearAIIcon from "@/assets/icons/near-icon-green.svg?react";
import ChatPlaceholder from "@/components/chat/ChatPlaceholder";
import MessageInput from "@/components/chat/MessageInput";
import { LOCAL_STORAGE_KEYS } from "@/lib/constants";
import { posthogSignupStarted } from "@/lib/posthog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuTrigger } from "../components/ui/dropdown-menu";
import { APP_ROUTES } from "./routes";

const WelcomePage: React.FC = () => {
  const navigate = useNavigate();
  const [inputValue, setInputValue] = useState("");

  const handleInputChange = (value: string) => {
    setInputValue(value);
    localStorage.setItem(LOCAL_STORAGE_KEYS.WELCOME_PAGE_PROMPT, value);
  };
  const gotoAuth = async () => {
    const token = localStorage.getItem(LOCAL_STORAGE_KEYS.TOKEN);
    if (token) {
      navigate(APP_ROUTES.HOME);
    } else {
      posthogSignupStarted(APP_ROUTES.AUTH);
      navigate(APP_ROUTES.AUTH);
    }
  };

  return (
    <div className="flex h-screen max-h-[100dvh] w-full max-w-full flex-col text-gray-700 dark:bg-gray-900 dark:text-gray-100">
      <div className="absolute top-0 left-0 flex w-full items-center justify-between p-4">
        <DropdownMenu>
          <DropdownMenuTrigger>
            <div className="flex cursor-pointer items-center">
              <NearAIIcon className="h-[18px]" />
              <ChevronDown className="ml-3 size-4.5" />
            </div>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            className="z-50 w-full max-w-[400px] rounded-xl border border-gray-300/30 p-5 shadow-sm dark:border-[rgba(51,51,51,0.2)] dark:bg-gray-875 dark:text-white"
            sideOffset={10}
            alignOffset={10}
          >
            <div className="flex flex-col gap-y-3">
              <h5 className="font-semibold text-lg">Chat with private AI models for free.</h5>
              <p>Get access to your personal AI models without worrying leaking private information.</p>

              <button
                type="button"
                className="rounded-lg bg-gray-700/5 px-5 py-2.5 font-semibold text-sm transition hover:bg-gray-700 dark:bg-gray-750 dark:text-gray-300 dark:hover:bg-gray-100/10 dark:hover:text-white"
                onClick={gotoAuth}
              >
                Sign In & Sign Up
              </button>
            </div>
          </DropdownMenuContent>
        </DropdownMenu>

        <button
          type="button"
          className="rounded-lg bg-gray-700/5 px-5 py-2.5 font-semibold text-sm transition hover:bg-gray-700/10 dark:bg-gray-750 dark:text-gray-300 dark:hover:bg-gray-100/10 dark:hover:text-white"
          onClick={gotoAuth}
        >
          Sign In & Sign Up
        </button>
      </div>

      <ChatPlaceholder inputValue={inputValue} setInputValue={handleInputChange}>
        <MessageInput
          messages={[]}
          onSubmit={gotoAuth}
          showUserProfile={false}
          prompt={inputValue}
          fullWidth={false}
          setPrompt={handleInputChange}
          toolsDisabled={true}
        />
      </ChatPlaceholder>

      <style>{`
				@keyframes fadeInUp {
					0% {
						opacity: 0;
						transform: translateY(20px);
					}
					100% {
						opacity: 1;
						transform: translateY(0);
					}
				}

				.waterfall {
					opacity: 0;
					animation-name: fadeInUp;
					animation-duration: 200ms;
					animation-fill-mode: forwards;
					animation-timing-function: ease;
				}
			`}</style>
    </div>
  );
};

export default WelcomePage;
