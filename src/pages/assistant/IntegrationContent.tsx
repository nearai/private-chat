import Navbar from "@/components/chat/Navbar";
import { Calendar, Mail, MessageSquare, CheckCircle2, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";

const integrationContent: Record<string, { title: string; description: string; icon: React.ReactNode; status: "connected" | "disconnected"; details: string }> = {
  "google-calendar": {
    title: "Google Calendar",
    description: "Sync your calendar events and schedule",
    icon: <Calendar className="size-6" />,
    status: "connected",
    details: `## Google Calendar Integration

**Status:** ✅ Connected
**Last Sync:** ${new Date().toLocaleString()}

**Features Enabled:**
- Event creation and updates
- Meeting reminders
- Schedule conflict detection
- Calendar sharing

**Upcoming Events:**
- Team Meeting - Today 2:00 PM
- Project Review - Tomorrow 10:00 AM
- Client Call - Friday 3:00 PM

**Settings:**
- Sync frequency: Real-time
- Reminder notifications: Enabled
- Conflict alerts: Enabled`,
  },
  "gmail": {
    title: "Gmail",
    description: "Manage your emails and communications",
    icon: <Mail className="size-6" />,
    status: "connected",
    details: `## Gmail Integration

**Status:** ✅ Connected
**Last Sync:** ${new Date().toLocaleString()}

**Features Enabled:**
- Email reading and sending
- Smart email categorization
- Priority inbox management
- Email templates

**Recent Activity:**
- 12 unread emails
- 3 important emails flagged
- 2 scheduled sends pending

**Settings:**
- Auto-categorization: Enabled
- Smart replies: Enabled
- Email notifications: Enabled`,
  },
  "slack": {
    title: "Slack",
    description: "Connect with your team on Slack",
    icon: <MessageSquare className="size-6" />,
    status: "disconnected",
    details: `## Slack Integration

**Status:** ❌ Not Connected

**To connect:**
1. Click the "Connect" button below
2. Authorize the application
3. Select workspace and channels
4. Configure notification preferences

**Available Features:**
- Channel monitoring
- Message notifications
- Team mentions
- File sharing

**Note:** This integration requires workspace admin approval.`,
  },
};

export default function IntegrationContent({ integrationId }: { integrationId: string }) {
  const integration = integrationContent[integrationId];

  if (!integration) {
    return (
      <div className="flex h-full grow flex-col">
        <Navbar />
        <div className="flex h-full grow items-center justify-center">
          <p className="text-muted-foreground">Integration not found</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full grow flex-col">
      <Navbar />
      <div className="flex h-full grow flex-col overflow-y-auto px-4 py-8">
        <div className="mx-auto w-full max-w-3xl">
          <div className="mb-6 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="flex size-12 items-center justify-center rounded-lg bg-primary/10 text-primary">
                {integration.icon}
              </div>
              <div>
                <h1 className="font-bold text-2xl">{integration.title}</h1>
                <p className="text-muted-foreground text-sm">{integration.description}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {integration.status === "connected" ? (
                <>
                  <CheckCircle2 className="size-5 text-green-500" />
                  <span className="text-green-500 text-sm">Connected</span>
                </>
              ) : (
                <>
                  <XCircle className="size-5 text-red-500" />
                  <span className="text-red-500 text-sm">Disconnected</span>
                </>
              )}
            </div>
          </div>

          <div className="rounded-lg border border-border bg-card p-6">
            <div className="prose prose-sm dark:prose-invert max-w-none">
              <div className="whitespace-pre-wrap text-sm">{integration.details}</div>
            </div>
          </div>

          {integration.status === "disconnected" && (
            <div className="mt-4 flex justify-end">
              <Button>Connect</Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
