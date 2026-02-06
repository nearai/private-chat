import Navbar from "@/components/chat/Navbar";
import { MessageSquare } from "lucide-react";

const conversationContent: Record<string, { title: string; messages: Array<{ role: "user" | "assistant"; content: string; time: string }> }> = {
  "conv-1": {
    title: "Planning Discussion",
    messages: [
      {
        role: "user",
        content: "Can you help me plan the project timeline for Q1?",
        time: "2:30 PM",
      },
      {
        role: "assistant",
        content: "I'd be happy to help! Let's break down the Q1 timeline. Based on your current milestones, I suggest:\n\n1. Weeks 1-2: Planning and setup\n2. Weeks 3-6: Core development\n3. Weeks 7-10: Testing and refinement\n4. Weeks 11-12: Final review and launch\n\nWould you like me to create a detailed schedule?",
        time: "2:31 PM",
      },
      {
        role: "user",
        content: "Yes, please create a detailed schedule with specific tasks.",
        time: "2:32 PM",
      },
      {
        role: "assistant",
        content: "I'll prepare a comprehensive schedule with task assignments and deadlines. This will include dependencies, resource allocation, and milestone checkpoints. I'll have it ready for review by tomorrow.",
        time: "2:33 PM",
      },
    ],
  },
  "conv-2": {
    title: "Project Review",
    messages: [
      {
        role: "user",
        content: "Let's review the current project status.",
        time: "10:15 AM",
      },
      {
        role: "assistant",
        content: "Current project status:\n\n✅ Completed: Initial setup, team onboarding\n🔄 In Progress: Core features development (60%)\n⏳ Pending: Testing phase, documentation\n\nKey achievements this week:\n- Completed user authentication system\n- Implemented core API endpoints\n- Started frontend development\n\nWould you like details on any specific area?",
        time: "10:16 AM",
      },
      {
        role: "user",
        content: "What are the main blockers?",
        time: "10:17 AM",
      },
      {
        role: "assistant",
        content: "Current blockers:\n\n1. API integration testing - waiting on third-party service\n2. Design system finalization - pending approval\n3. Database optimization - needs performance review\n\nI can help prioritize these and suggest workarounds.",
        time: "10:18 AM",
      },
    ],
  },
  "conv-3": {
    title: "Task Coordination",
    messages: [
      {
        role: "user",
        content: "Help me coordinate tasks between team members.",
        time: "3:45 PM",
      },
      {
        role: "assistant",
        content: "I can help with task coordination! Here's the current team workload:\n\n**Frontend Team:**\n- Alice: Working on dashboard UI (2 days remaining)\n- Bob: Implementing forms component (1 day remaining)\n\n**Backend Team:**\n- Charlie: API development (3 days remaining)\n- Diana: Database optimization (ongoing)\n\nWould you like me to suggest task reassignments or identify bottlenecks?",
        time: "3:46 PM",
      },
      {
        role: "user",
        content: "Identify any bottlenecks please.",
        time: "3:47 PM",
      },
      {
        role: "assistant",
        content: "Bottleneck analysis:\n\n⚠️ **Critical:** Backend API delays are blocking frontend integration\n⚠️ **Moderate:** Design approval needed before UI finalization\n✅ **Low:** Database work can proceed independently\n\nRecommendation: Prioritize API completion and schedule design review meeting.",
        time: "3:48 PM",
      },
    ],
  },
};

export default function ConversationContent({ conversationId }: { conversationId: string }) {
  const conversation = conversationContent[conversationId];

  if (!conversation) {
    return (
      <div className="flex h-full grow flex-col">
        <Navbar />
        <div className="flex h-full grow items-center justify-center">
          <p className="text-muted-foreground">Conversation not found</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full grow flex-col">
      <Navbar />
      <div className="flex h-full grow flex-col overflow-y-auto px-4 py-8">
        <div className="mx-auto w-full max-w-3xl">
          <div className="mb-6 flex items-center gap-4">
            <div className="flex size-12 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <MessageSquare className="size-6" />
            </div>
            <div>
              <h1 className="font-bold text-2xl">{conversation.title}</h1>
              <p className="text-muted-foreground text-sm">Assistant Conversation</p>
            </div>
          </div>

          <div className="space-y-4">
            {conversation.messages.map((message, index) => (
              <div
                key={index}
                className={message.role === "user" ? "flex justify-end" : "flex justify-start"}
              >
                <div
                  className={message.role === "user" ? "max-w-[80%] rounded-lg bg-primary px-4 py-3 text-primary-foreground" : "max-w-[80%] rounded-lg bg-secondary px-4 py-3"}
                >
                  <div className="text-sm">{message.content}</div>
                  <div className={`mt-1 text-xs ${message.role === "user" ? "text-primary-foreground/70" : "text-muted-foreground"}`}>
                    {message.time}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
