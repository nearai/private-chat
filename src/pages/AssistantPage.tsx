import Navbar from "@/components/chat/Navbar";
import DeployPrivateAssistant from "@/components/DeployPrivateAssistant";
import { useViewStore } from "@/stores/useViewStore";
import IntegrationContent from "./assistant/IntegrationContent";
import ImHereMockView from "./assistant/ImHereMockView";
import type { ChatStartStreamOptions } from "@/types";

type AssistantPageProps = {
  startStream: (options: ChatStartStreamOptions) => Promise<void>;
  stopStream?: () => void;
};

export default function AssistantPage(_props: AssistantPageProps) {
  const { selectedAssistantItem, assistantChatMode, agentDeployed, setAgentDeployed } = useViewStore();

  const handleDeployComplete = (assistantName: string, channel: string | null, botLink?: string) => {
    setAgentDeployed(true);
    console.log("Deployment completed:", { assistantName, channel, botLink });
  };

  // "I'm Here" mode: show mock conversation history only when agent is deployed
  if (assistantChatMode && agentDeployed) {
    return <ImHereMockView />;
  }
  // If in "I'm Here" mode but agent not deployed (e.g. storage cleared), show deploy UI
  if (assistantChatMode && !agentDeployed) {
    return (
      <div id="chat-container" className="relative flex h-full grow flex-col">
        <Navbar />
        <DeployPrivateAssistant onDeployComplete={handleDeployComplete} />
      </div>
    );
  }

  // Show content based on selected integration
  const integrationIds = ["google-calendar", "gmail", "slack"];
  if (selectedAssistantItem && integrationIds.includes(selectedAssistantItem)) {
    return <IntegrationContent integrationId={selectedAssistantItem} />;
  }

  // Default: show deployment interface
  return (
    <div id="chat-container" className="relative flex h-full grow flex-col">
      <Navbar />
      <DeployPrivateAssistant onDeployComplete={handleDeployComplete} />
    </div>
  );
}
