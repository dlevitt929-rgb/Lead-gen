"use client";

import * as React from "react";
import Link from "next/link";
import { toast } from "sonner";
import { Phone, PhoneOff, CheckCircle2, Clock, XCircle, Loader2, MapPin, Star, ExternalLink, X, MessageCircle, Globe, ShieldCheck, Sparkles, Send, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ScoreBadge } from "@/components/shared/score-badge";
import { formatDate } from "@/lib/utils";
import type { OpportunityRow } from "@/types/lead";
import type { SalesAngle } from "@/lib/services/ai-sales-assistant";
import type { CallOutcome, LeadStatus } from "@prisma/client";

export function CallWorkspace({ queue, onExit, onQueueChange }: { queue: OpportunityRow[]; onExit: () => void; onQueueChange: (q: OpportunityRow[]) => void }) {
  const [totalInSession] = React.useState(queue.length);
  const [angle, setAngle] = React.useState<SalesAngle | null>(null);
  const [loadingAngle, setLoadingAngle] = React.useState(false);
  const [loggingOutcome, setLoggingOutcome] = React.useState(false);
  const [showFollowUpFor, setShowFollowUpFor] = React.useState(false);
  const [followUpDate, setFollowUpDate] = React.useState("");

  const lead = queue[0];
  const score = lead?.business.leadScores[0];
  const phone = lead?.business.contacts.find((c) => c.type === "PHONE")?.value;
  const whatsappHref = phone ? `https://wa.me/${phone.replace(/[^0-9]/g, "")}` : null;
  const completed = totalInSession - queue.length;

  React.useEffect(() => {
    if (!lead) return;
    setAngle(null);
    setShowFollowUpFor(false);
    setLoadingAngle(true);
    fetch(`/api/businesses/${lead.business.id}/sales-angle`, { method: "POST" })
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => setAngle(data?.data ?? null))
      .catch(() => undefined)
      .finally(() => setLoadingAngle(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lead?.id]);

  async function logOutcome(outcome: CallOutcome, dueAt?: string, statusOverride?: LeadStatus) {
    if (!lead) return;
    setLoggingOutcome(true);
    try {
      await fetch(`/api/leads/${lead.id}/calls`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ outcome }),
      });
      if (statusOverride) {
        await fetch(`/api/leads/${lead.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status: statusOverride }),
        });
      }
      if (dueAt) {
        await fetch(`/api/leads/${lead.id}/follow-ups`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ dueAt, note: "Call back" }),
        });
      }
      onQueueChange(queue.slice(1));
      toast.success("Call logged.");
    } catch {
      toast.error("Could not log this call.");
    } finally {
      setLoggingOutcome(false);
      setShowFollowUpFor(false);
      setFollowUpDate("");
    }
  }

  if (!lead) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-4 p-6 text-center">
        <CheckCircle2 className="size-12 text-success" />
        <div>
          <p className="text-lg font-semibold">Queue complete</p>
          <p className="text-sm text-muted-foreground">Nice work — every lead in this queue has been called.</p>
        </div>
        <Button onClick={onExit}>Back to queue setup</Button>
      </div>
    );
  }

  const location = lead.business.locations[0];
  const problems = (score?.reasonsJson as unknown as string[] | undefined) ?? [];

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center gap-3 border-b px-6 py-3">
        <Progress value={(completed / totalInSession) * 100} className="h-1.5 flex-1" />
        <span className="text-xs text-muted-foreground">
          {completed + 1} of {totalInSession}
        </span>
        <Button variant="ghost" size="icon" onClick={onExit}>
          <X className="size-4" />
        </Button>
      </div>

      <div className="mx-auto w-full max-w-2xl flex-1 space-y-5 overflow-y-auto p-6">
        <Card>
          <CardContent className="space-y-3 py-5">
            <div className="flex items-start justify-between gap-3">
              <div>
                <Link href={`/business/${lead.business.id}`} target="_blank" className="text-xl font-semibold hover:underline">
                  {lead.business.name}
                </Link>
                <p className="text-sm capitalize text-muted-foreground">{lead.business.categoryPrimary}</p>
              </div>
              <div className="flex flex-col items-end gap-1">
                {score && <ScoreBadge score={score.score} quality={score.quality} size="lg" />}
                {score?.confidence && (
                  <Badge variant="outline" className="text-[10px]">
                    Confidence: {score.confidence}
                  </Badge>
                )}
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
              {lead.business.rating && (
                <span className="flex items-center gap-1">
                  <Star className="size-3.5 fill-warning text-warning" /> {lead.business.rating.toFixed(1)} ({lead.business.reviewCount})
                </span>
              )}
              {location && (
                <span className="flex items-center gap-1">
                  <MapPin className="size-3.5" /> {[location.suburb, location.city].filter(Boolean).join(", ")}
                </span>
              )}
              <Link href={`/business/${lead.business.id}`} target="_blank" className="flex items-center gap-1 text-primary hover:underline">
                Full details <ExternalLink className="size-3" />
              </Link>
            </div>
            <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
              {lead.business.website ? (
                <span className="flex items-center gap-1">
                  <ShieldCheck className="size-3.5 text-success" /> Verified website
                </span>
              ) : lead.business.websiteAbsenceStatus === "CONFIRMED_NONE" ? (
                <span className="flex items-center gap-1">
                  <Globe className="size-3.5" /> Confirmed no website
                </span>
              ) : (
                <span className="flex items-center gap-1">
                  <Globe className="size-3.5" /> Website presence unconfirmed
                </span>
              )}
              {lead.business.websiteCheckedAt && <span>Last checked {formatDate(lead.business.websiteCheckedAt)}</span>}
              {lead.business.demos.length > 0 && (
                <Link href={`/demo/${lead.business.demos[0].id}`} target="_blank" className="flex items-center gap-1 text-primary hover:underline">
                  <Sparkles className="size-3.5" /> View website concept
                </Link>
              )}
            </div>
            <p className="text-2xl font-semibold tabular-nums">{phone ?? "No public number found"}</p>
            <div className="flex gap-2">
              {phone && (
                <Button size="lg" className="flex-1" asChild>
                  <a href={`tel:${phone}`}>
                    <Phone /> Call
                  </a>
                </Button>
              )}
              {whatsappHref && (
                <Button size="lg" variant="outline" asChild>
                  <a href={whatsappHref} target="_blank" rel="noreferrer">
                    <MessageCircle />
                  </a>
                </Button>
              )}
            </div>
          </CardContent>
        </Card>

        {lead.business.website && lead.business.website.audits.length > 0 && (
          <Card>
            <CardContent className="space-y-2 py-4">
              <p className="text-sm font-medium">Current website issues</p>
              <ul className="list-disc space-y-1 pl-4 text-sm text-muted-foreground">
                {((lead.business.website.audits[0].issuesJson as { message: string }[]) ?? []).slice(0, 4).map((iss, i) => (
                  <li key={i}>{iss.message}</li>
                ))}
                {((lead.business.website.audits[0].issuesJson as { message: string }[]) ?? []).length === 0 && <li>No issues detected in the last audit.</li>}
              </ul>
            </CardContent>
          </Card>
        )}

        {problems.length > 0 && (
          <Card>
            <CardContent className="space-y-2 py-4">
              <p className="text-sm font-medium">Why this lead is worth calling</p>
              <ul className="list-disc space-y-1 pl-4 text-sm text-muted-foreground">
                {problems.slice(0, 4).map((p, i) => (
                  <li key={i}>{p}</li>
                ))}
              </ul>
            </CardContent>
          </Card>
        )}

        <Card>
          <CardContent className="space-y-2 py-4">
            <p className="text-sm font-medium">Suggested opener</p>
            {loadingAngle ? (
              <p className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="size-3.5 animate-spin" /> Preparing talking points…
              </p>
            ) : angle ? (
              <p className="text-sm leading-relaxed text-muted-foreground">{angle.coldCallOpener}</p>
            ) : (
              <p className="text-sm text-muted-foreground">Talking points unavailable — proceed with your own approach.</p>
            )}
          </CardContent>
        </Card>

        {angle && angle.questionsToAsk.length > 0 && (
          <Card>
            <CardContent className="space-y-2 py-4">
              <p className="text-sm font-medium">Questions to ask</p>
              <ul className="list-disc space-y-1 pl-4 text-sm text-muted-foreground">
                {angle.questionsToAsk.slice(0, 3).map((q, i) => (
                  <li key={i}>{q}</li>
                ))}
              </ul>
            </CardContent>
          </Card>
        )}
      </div>

      <div className="border-t bg-card p-4">
        {showFollowUpFor ? (
          <div className="mx-auto flex max-w-2xl items-center gap-2">
            <Input type="datetime-local" value={followUpDate} onChange={(e) => setFollowUpDate(e.target.value)} className="flex-1" />
            <Button disabled={!followUpDate || loggingOutcome} onClick={() => logOutcome("CALL_BACK", new Date(followUpDate).toISOString())}>
              Confirm follow-up
            </Button>
            <Button variant="ghost" onClick={() => setShowFollowUpFor(false)}>
              Cancel
            </Button>
          </div>
        ) : (
          <div className="mx-auto max-w-2xl space-y-2">
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              <Button size="lg" variant="secondary" disabled={loggingOutcome} onClick={() => logOutcome("NO_ANSWER")}>
                <PhoneOff /> No Answer
              </Button>
              <Button size="lg" variant="success" disabled={loggingOutcome} onClick={() => logOutcome("INTERESTED")}>
                <CheckCircle2 /> Interested
              </Button>
              <Button size="lg" variant="outline" disabled={loggingOutcome} onClick={() => setShowFollowUpFor(true)}>
                <Clock /> Call Later
              </Button>
              <Button size="lg" variant="outline" disabled={loggingOutcome} onClick={() => logOutcome("NOT_INTERESTED")}>
                <XCircle /> Not Interested
              </Button>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <Button size="sm" variant="outline" disabled={loggingOutcome} onClick={() => logOutcome("INTERESTED", undefined, "DEMO_REQUESTED")}>
                <Send className="size-3.5" /> Demo Sent
              </Button>
              <Button size="sm" variant="outline" disabled={loggingOutcome} onClick={() => logOutcome("INTERESTED", undefined, "PROPOSAL_SENT")}>
                <FileText className="size-3.5" /> Proposal
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
