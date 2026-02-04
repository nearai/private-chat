import Navbar from "@/components/chat/Navbar";
import { FileText, Lightbulb, Newspaper, BarChart3 } from "lucide-react";

const jobContent: Record<string, { title: string; description: string; icon: React.ReactNode; content: string }> = {
  "daily-news": {
    title: "Daily News Summary",
    description: "Get a curated summary of today's most important news",
    icon: <Newspaper className="size-6" />,
    content: `## Today's News Summary

**Technology**
- AI developments continue to advance rapidly
- New privacy regulations take effect
- Cloud computing costs decrease

**Business**
- Market trends show positive growth
- Startup funding increases
- Remote work policies evolve

**Science**
- Breakthrough in renewable energy
- Medical research shows promising results
- Space exploration milestones achieved

*Last updated: ${new Date().toLocaleDateString()}*`,
  },
  "weekly-update": {
    title: "Weekly Update",
    description: "Your weekly progress and insights",
    icon: <BarChart3 className="size-6" />,
    content: `## Weekly Update Report

**This Week's Highlights**
- Completed 12 tasks
- Attended 5 meetings
- Reviewed 8 documents

**Key Metrics**
- Productivity: 85%
- Goals Achieved: 7/10
- Team Collaboration: Excellent

**Upcoming Priorities**
1. Project deadline approaching
2. Team review scheduled
3. Client presentation preparation

*Week of ${new Date().toLocaleDateString()}*`,
  },
  "creative-ideas": {
    title: "Creative Ideas",
    description: "Brainstorming and creative concepts",
    icon: <Lightbulb className="size-6" />,
    content: `## Creative Ideas Collection

**Product Innovation**
💡 Smart notification system that learns user preferences
💡 AI-powered content curation tool
💡 Collaborative workspace enhancement

**Marketing Concepts**
🎨 Interactive user engagement campaigns
🎨 Personalized content delivery
🎨 Community-driven growth strategies

**Process Improvements**
⚡ Automated workflow optimization
⚡ Real-time collaboration tools
⚡ Enhanced data visualization

*Keep your creative juices flowing!*`,
  },
  "meeting-prep": {
    title: "Meeting Preparation",
    description: "Prepare for your upcoming meetings",
    icon: <FileText className="size-6" />,
    content: `## Meeting Preparation Checklist

**Upcoming Meetings**

**1. Team Standup - Today 10:00 AM**
- Review yesterday's progress
- Discuss blockers
- Plan today's tasks
- [ ] Prepare status update
- [ ] Review action items

**2. Client Review - Tomorrow 2:00 PM**
- Present project updates
- Discuss feedback
- Next steps planning
- [ ] Prepare presentation
- [ ] Review client requirements
- [ ] Prepare Q&A responses

**3. Strategy Session - Friday 11:00 AM**
- Long-term planning
- Resource allocation
- Timeline discussion
- [ ] Review strategic goals
- [ ] Prepare proposals

*Stay organized and prepared!*`,
  },
};

export default function JobContent({ jobId }: { jobId: string }) {
  const job = jobContent[jobId];

  if (!job) {
    return (
      <div className="flex h-full grow flex-col">
        <Navbar />
        <div className="flex h-full grow items-center justify-center">
          <p className="text-muted-foreground">Job not found</p>
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
              {job.icon}
            </div>
            <div>
              <h1 className="font-bold text-2xl">{job.title}</h1>
              <p className="text-muted-foreground text-sm">{job.description}</p>
            </div>
          </div>

          <div className="rounded-lg border border-border bg-card p-6">
            <div className="prose prose-sm dark:prose-invert max-w-none">
              <div className="whitespace-pre-wrap text-sm">{job.content}</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
