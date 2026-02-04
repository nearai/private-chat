import Navbar from "@/components/chat/Navbar";
import DeployPrivateAssistant from "@/components/DeployPrivateAssistant";

export default function AssistantPage() {
  const handleDeployComplete = (assistantName: string, channel: string | null, botLink?: string) => {
    // Handle deployment completion - could navigate to a chat or show success message
    console.log("Deployment completed:", { assistantName, channel, botLink });
  };

  return (
    <div id="chat-container" className="relative flex h-full grow flex-col">
      <Navbar />
      <DeployPrivateAssistant onDeployComplete={handleDeployComplete} />
    </div>
  );
}
