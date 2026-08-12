"use client";

import * as React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { EmptyState } from "@/components/shared/empty-state";
import { Clock3, Loader2, StickyNote, CalendarClock } from "lucide-react";
import { formatDateTime } from "@/lib/utils";
import type { Activity } from "@prisma/client";

const ACTIVITY_ICONS: Record<string, string> = {
  LEAD_DISCOVERED: "🔍",
  LEAD_SAVED: "📌",
  AUDIT_COMPLETED: "🩺",
  SCORE_COMPUTED: "🎯",
  CALL_LOGGED: "📞",
  NOTE_ADDED: "📝",
  STATUS_CHANGED: "🔄",
  FOLLOW_UP_SCHEDULED: "⏰",
  FOLLOW_UP_COMPLETED: "✅",
  DEMO_GENERATED: "✨",
  PROPOSAL_CREATED: "📄",
  PROPOSAL_SENT: "📤",
  TAG_ADDED: "🏷️",
  TAG_REMOVED: "🏷️",
  DO_NOT_CONTACT_MARKED: "🚫",
};

export function TimelinePanel({
  activities,
  hasLead,
  onAddNote,
  onScheduleFollowUp,
}: {
  activities: Activity[];
  hasLead: boolean;
  onAddNote: (body: string) => Promise<void>;
  onScheduleFollowUp: (dueAt: string, note: string) => Promise<void>;
}) {
  const [note, setNote] = React.useState("");
  const [savingNote, setSavingNote] = React.useState(false);
  const [followUpAt, setFollowUpAt] = React.useState("");
  const [followUpNote, setFollowUpNote] = React.useState("");
  const [savingFollowUp, setSavingFollowUp] = React.useState(false);

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1fr_320px]">
      <div className="space-y-2">
        {activities.length === 0 ? (
          <EmptyState icon={Clock3} title="No activity yet" description="Actions on this business will show up here as a timeline." />
        ) : (
          <ol className="space-y-3 border-l pl-4">
            {activities.map((a) => (
              <li key={a.id} className="relative">
                <span className="absolute -left-[21px] flex size-4 items-center justify-center rounded-full bg-background text-[10px]">
                  {ACTIVITY_ICONS[a.type] ?? "•"}
                </span>
                <p className="text-sm">{a.message}</p>
                <p className="text-xs text-muted-foreground">{formatDateTime(a.createdAt)}</p>
              </li>
            ))}
          </ol>
        )}
      </div>

      {hasLead && (
        <div className="space-y-4">
          <Card>
            <CardContent className="space-y-2 py-4">
              <p className="flex items-center gap-1.5 text-sm font-medium">
                <StickyNote className="size-4" /> Add a note
              </p>
              <Textarea placeholder="What happened on this call…" value={note} onChange={(e) => setNote(e.target.value)} rows={3} />
              <Button
                size="sm"
                disabled={!note.trim() || savingNote}
                onClick={async () => {
                  setSavingNote(true);
                  await onAddNote(note);
                  setNote("");
                  setSavingNote(false);
                }}
              >
                {savingNote && <Loader2 className="size-3.5 animate-spin" />}
                Save note
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="space-y-2 py-4">
              <p className="flex items-center gap-1.5 text-sm font-medium">
                <CalendarClock className="size-4" /> Schedule a follow-up
              </p>
              <Input type="datetime-local" value={followUpAt} onChange={(e) => setFollowUpAt(e.target.value)} />
              <Input placeholder="e.g. Call again after they've seen the demo" value={followUpNote} onChange={(e) => setFollowUpNote(e.target.value)} />
              <Button
                size="sm"
                disabled={!followUpAt || savingFollowUp}
                onClick={async () => {
                  setSavingFollowUp(true);
                  await onScheduleFollowUp(new Date(followUpAt).toISOString(), followUpNote);
                  setFollowUpAt("");
                  setFollowUpNote("");
                  setSavingFollowUp(false);
                }}
              >
                {savingFollowUp && <Loader2 className="size-3.5 animate-spin" />}
                Schedule
              </Button>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
