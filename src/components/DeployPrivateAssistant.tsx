import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { CheckCircle2, Loader2, Sparkles } from "lucide-react";

type ChannelType = "telegram" | "slack" | null;
type DeploymentStatus = "idle" | "paying" | "deploying" | "success";

interface DeployPrivateAssistantProps {
  onDeployComplete?: (assistantName: string, channel: ChannelType, botLink?: string) => void;
}

export default function DeployPrivateAssistant({ onDeployComplete }: DeployPrivateAssistantProps) {
  const [assistantName, setAssistantName] = useState("");
  const [channel, setChannel] = useState<ChannelType>(null);
  const [status, setStatus] = useState<DeploymentStatus>("idle");
  const [botLink, setBotLink] = useState<string | null>(null);

  const handleDeploy = async () => {
    if (!assistantName.trim() || !channel) return;

    // Step 1: Payment
    setStatus("paying");
    await new Promise((resolve) => setTimeout(resolve, 1500)); // Mock payment

    // Step 2: Deployment
    setStatus("deploying");
    await new Promise((resolve) => setTimeout(resolve, 2000)); // Mock deployment

    // Step 3: Success
    const mockBotLink = channel === "telegram" 
      ? `https://t.me/${assistantName.toLowerCase().replace(/\s+/g, "_")}_bot`
      : undefined;
    
    setBotLink(mockBotLink || null);
    setStatus("success");
    
    if (onDeployComplete) {
      onDeployComplete(assistantName, channel, mockBotLink || undefined);
    }
  };

  const canDeploy = assistantName.trim().length > 0 && channel !== null && status === "idle";
  const isProcessing = status === "paying" || status === "deploying";

  return (
    <div className="flex h-full grow flex-col items-center justify-center px-4">
        <div className="flex w-full max-w-2xl flex-col items-center gap-8">
          {/* Header */}
          <div className="flex flex-col items-center gap-4 text-center">
            <div className="flex items-center gap-2">
              <Sparkles className="h-8 w-8 text-primary" />
              <h1 className="font-bold text-3xl">Meet your Private Assistant</h1>
            </div>
            <p className="text-lg text-muted-foreground">
              Deploy your Private Assistant. Start talking with your assistant in 1 minute.
            </p>
          </div>

          {/* Deployment Card */}
          <div className="w-full rounded-2xl border border-border bg-card p-8 shadow-lg">
            <div className="flex flex-col gap-6">
              {/* Name Input */}
              <div className="flex flex-col gap-2">
                <label htmlFor="assistant-name" className="font-medium text-sm">
                  Assistant Name
                </label>
                <input
                  id="assistant-name"
                  type="text"
                  value={assistantName}
                  onChange={(e) => setAssistantName(e.target.value)}
                  placeholder="e.g., My Work Assistant"
                  className="h-11 rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                  disabled={isProcessing}
                />
              </div>

              {/* Channel Selection */}
              <div className="flex flex-col gap-2">
                <label htmlFor="channel-select" className="font-medium text-sm">
                  Channel
                </label>
                <Select
                  value={channel || undefined}
                  onValueChange={(value) => setChannel(value as ChannelType)}
                  disabled={isProcessing}
                >
                  <SelectTrigger id="channel-select" className="h-11">
                    <SelectValue placeholder="Select a channel" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="telegram">Telegram</SelectItem>
                    <SelectItem value="slack">Slack</SelectItem>
                  </SelectContent>
                </Select>
                {channel === "telegram" && (
                  <p className="text-muted-foreground text-xs">
                    We'll create a Telegram bot for you directly, just like @BotFather does.
                  </p>
                )}
                {channel === "slack" && (
                  <p className="text-muted-foreground text-xs">
                    You'll be guided to authorize us to create a Slack bot for you.
                  </p>
                )}
              </div>

              {/* Pricing Info */}
              <div className="rounded-lg bg-secondary/30 p-4">
                <div className="flex items-center justify-between">
                  <span className="font-medium">Basic Plan</span>
                  <span className="font-bold text-lg">$5</span>
                </div>
                <p className="mt-1 text-muted-foreground text-xs">
                  Deploy your private assistant with one CVM
                </p>
              </div>

              {/* Deploy Button */}
              <Button
                onClick={handleDeploy}
                disabled={!canDeploy || isProcessing}
                className="h-12 w-full text-base"
                size="default"
              >
                {status === "paying" && (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Processing payment...
                  </>
                )}
                {status === "deploying" && (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Deploying your assistant...
                  </>
                )}
                {status === "success" && (
                  <>
                    <CheckCircle2 className="mr-2 h-4 w-4" />
                    Deployed Successfully!
                  </>
                )}
                {status === "idle" && "Deploy Private Assistant ($5)"}
              </Button>
            </div>
          </div>

          {/* Success State */}
          {status === "success" && (
            <div className="w-full rounded-2xl border border-green-500/50 bg-green-500/10 p-6">
              <div className="flex flex-col gap-4">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-5 w-5 text-green-500" />
                  <h3 className="font-semibold text-lg">
                    Your {channel === "telegram" ? "Telegram" : "Slack"} bot is ready!
                  </h3>
                </div>
                <p className="text-muted-foreground text-sm">
                  You can now start talking with your Private Assistant.
                </p>
                {botLink && (
                  <a
                    href={botLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 font-medium text-primary-foreground transition-colors hover:bg-primary/90"
                  >
                    Open {channel === "telegram" ? "Telegram" : "Slack"} Bot
                  </a>
                )}
                {channel === "slack" && !botLink && (
                  <p className="text-muted-foreground text-sm">
                    Check your Slack workspace to find your new bot.
                  </p>
                )}
              </div>
            </div>
          )}

          {/* Info Section */}
          <div className="w-full rounded-lg bg-muted/30 p-6">
            <h3 className="mb-3 font-semibold">What you'll get:</h3>
            <ul className="space-y-2 text-muted-foreground text-sm">
              <li className="flex items-start gap-2">
                <span className="mt-0.5">✓</span>
                <span>One-click deployment (OpenClaw docker instance + Telegram/Slack bot)</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="mt-0.5">✓</span>
                <span>Chat with your assistant privately in Private Chat</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="mt-0.5">✓</span>
                <span>OpenClaw Dashboard to manage your assistant configs</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="mt-0.5">✓</span>
                <span>Integration options with Google Suite (Calendar, Gmail, Drive, etc.)</span>
              </li>
            </ul>
          </div>
        </div>
      </div>
  );
}
