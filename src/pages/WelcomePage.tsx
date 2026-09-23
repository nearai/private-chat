import { CONVERSATION_WRITES_ENABLED } from "@/lib/read-only";
import type React from "react";
import { useState } from "react";
import { useNavigate } from "react-router";
import ChevronDown from "@/assets/icons/chevron-welcome.svg?react";
import NearAIIcon from "@/assets/icons/near-ai.svg?react";
import ChatPlaceholder from "@/components/chat/ChatPlaceholder";
import MessageInput from "@/components/chat/MessageInput";
import SunsetBanner from "@/components/common/SunsetBanner";
import { LOCAL_STORAGE_KEYS } from "@/lib/constants";
import { posthogSignupStarted } from "@/lib/posthog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuTrigger } from "../components/ui/dropdown-menu";
import { APP_ROUTES } from "./routes";

const WelcomePage: React.FC = () => {
  const navigate = useNavigate();
  const [inputValue, setInputValue] = useState("");

  const handleInputChange = (value: string) => {
    setInputValue(value);
    if (value.length > 0) {
      localStorage.setItem(LOCAL_STORAGE_KEYS.WELCOME_PAGE_PROMPT, value);
    }
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
    <div className="flex h-screen max-h-dvh w-full max-w-full flex-col">
      <SunsetBanner />
      <div className="flex w-full shrink-0 items-center justify-between p-4">
        <DropdownMenu>
          <DropdownMenuTrigger className="outline-none">
            <div className="flex cursor-pointer items-center">
              <NearAIIcon className="h-4.5" />
              <ChevronDown className="ml-3 size-4.5" />
            </div>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            className="z-50 w-full max-w-[400px] rounded-xl border border-border p-5 shadow-sm"
            sideOffset={10}
            alignOffset={10}
            align="start"
          >
            <div className="flex flex-col gap-y-3">
              <h5 className="font-semibold text-lg">View your Private Chat conversations.</h5>
              <p>Sign in to read and export your existing conversations.</p>

              <button
                type="button"
                className="rounded-lg bg-secondary/30 px-5 py-2.5 font-semibold text-sm transition hover:bg-secondary/60"
                onClick={gotoAuth}
              >
                Sign In & Sign Up
              </button>
            </div>
          </DropdownMenuContent>
        </DropdownMenu>

        <button
          type="button"
          className="rounded-lg bg-secondary/30 px-5 py-2.5 font-semibold text-sm transition hover:bg-secondary/60"
          onClick={gotoAuth}
        >
          Sign In & Sign Up
        </button>
      </div>

      {CONVERSATION_WRITES_ENABLED ? (
        <div className="min-h-0 flex-1 overflow-y-auto">
          <ChatPlaceholder inputValue={inputValue} setInputValue={handleInputChange}>
            <MessageInput
              messages={[]}
              onSubmit={gotoAuth}
              showUserProfile={false}
              prompt={inputValue}
              fullWidth={false}
              setPrompt={handleInputChange}
              toolsDisabled={true}
              autoFocusKey="welcome"
            />
          </ChatPlaceholder>
        </div>
      ) : (
        <div className="m-auto flex w-full flex-col items-center gap-3 py-6">
          <NearAIIcon className="h-6" />
          <p className="px-6 text-center text-muted-foreground">
            Private Chat is read-only. Sign in to view and export your conversations.
          </p>
          <MessageInput
            onSubmit={gotoAuth}
            showUserProfile={false}
            prompt={inputValue}
            fullWidth={false}
            setPrompt={setInputValue}
            toolsDisabled={true}
          />
        </div>
      )}

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
