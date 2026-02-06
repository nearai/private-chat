import Navbar from "@/components/chat/Navbar";
import { MessageCircle } from "lucide-react";

const MOCK_CONVERSATION = [
  {
    role: "user" as const,
    content: "Hi! What can you help me with today?",
    time: "9:15 AM",
  },
  {
    role: "assistant" as const,
    content:
      "Hi! I'm your Private Assistant. I can help you with planning, reminders, checking your calendar, summarizing emails, and answering questions. You can also connect me to Google Calendar, Gmail, and other integrations from the sidebar.\n\nWhat would you like to do first?",
    time: "9:15 AM",
  },
  {
    role: "user" as const,
    content: "Can you remind me about the team standup at 10?",
    time: "9:22 AM",
  },
  {
    role: "assistant" as const,
    content:
      "I've set a reminder for your team standup at 10:00 AM. I'll notify you 5 minutes before so you have time to join.\n\nWould you like me to pull up the meeting link or any prep notes?",
    time: "9:22 AM",
  },
  {
    role: "user" as const,
    content: "Yes, share the meeting link.",
    time: "9:23 AM",
  },
  {
    role: "assistant" as const,
    content:
      "Here's your team standup link: **meet.example.com/standup**\n\nI've also added it to your calendar event. The standup is in 35 minutes—see you there!",
    time: "9:23 AM",
  },
];

export default function ImHereMockView() {
  return (
    <div className="flex h-full grow flex-col">
      <Navbar />
      <div className="flex h-full grow flex-col overflow-y-auto px-4 py-6">
        <div className="mx-auto w-full max-w-3xl">
          {/* Header */}
          <div className="mb-6 flex items-center gap-3">
            <div className="flex size-10 items-center justify-center rounded-full bg-primary/10 text-primary">
              <MessageCircle className="size-5" />
            </div>
            <div>
              <h1 className="font-semibold text-lg">Private Assistant</h1>
              <p className="text-muted-foreground text-sm">Conversation with your assistant</p>
            </div>
          </div>

          {/* Mock conversation */}
          <div className="space-y-4">
            {MOCK_CONVERSATION.map((message, index) => (
              <div
                key={index}
                className={
                  message.role === "user"
                    ? "flex justify-end"
                    : "flex justify-start"
                }
              >
                <div
                  className={
                    message.role === "user"
                      ? "max-w-[85%] rounded-2xl rounded-br-md bg-primary px-4 py-3 text-primary-foreground"
                      : "max-w-[85%] rounded-2xl rounded-bl-md bg-secondary px-4 py-3"
                  }
                >
                  <div className="whitespace-pre-wrap text-sm">{message.content}</div>
                  <div
                    className={
                      message.role === "user"
                        ? "mt-1.5 text-right text-primary-foreground/70 text-xs"
                        : "mt-1.5 text-muted-foreground text-xs"
                    }
                  >
                    {message.time}
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Mock input hint */}
          <div className="mt-8 rounded-lg border border-border border-dashed bg-muted/20 px-4 py-3 text-center text-muted-foreground text-sm">
            This is a mock view. In production, you can chat here with your Private Assistant using the default model.
          </div>
        </div>
      </div>
    </div>
  );
}
