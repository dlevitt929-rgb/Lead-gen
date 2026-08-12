"use client";

import * as React from "react";
import Link from "next/link";
import { toast } from "sonner";
import { KanbanSquare, Rows3, PhoneOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/shared/empty-state";
import { ScoreBadge } from "@/components/shared/score-badge";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { KanbanBoard } from "@/components/crm/kanban-board";
import { formatRelativeTime, formatCurrencyRange } from "@/lib/utils";
import { LEAD_STATUSES, LEAD_STATUS_LABEL } from "@/lib/lead-status";
import type { OpportunitiesResponse, OpportunityRow } from "@/types/lead";
import type { LeadStatus } from "@prisma/client";

export function CrmClient() {
  const [view, setView] = React.useState<"kanban" | "table">("kanban");
  const [leads, setLeads] = React.useState<OpportunityRow[] | null>(null);

  const load = React.useCallback(async () => {
    const res = await fetch("/api/leads?pageSize=500&sortBy=recent&sortDir=desc");
    if (res.ok) {
      const data: OpportunitiesResponse = await res.json();
      setLeads(data.leads);
    }
  }, []);

  React.useEffect(() => {
    load();
  }, [load]);

  async function handleMove(leadId: string, status: LeadStatus) {
    setLeads((prev) => prev?.map((l) => (l.id === leadId ? { ...l, status } : l)) ?? prev);
    const res = await fetch(`/api/leads/${leadId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    if (!res.ok) {
      toast.error("Could not update status.");
      load();
    } else {
      toast.success(`Moved to ${LEAD_STATUS_LABEL[status]}.`);
    }
  }

  if (leads === null) {
    return (
      <div className="space-y-2 p-6">
        <Skeleton className="h-8 w-64" />
        <div className="flex gap-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-96 w-72" />
          ))}
        </div>
      </div>
    );
  }

  if (leads.length === 0) {
    return (
      <div className="p-6">
        <EmptyState
          icon={PhoneOff}
          title="Your pipeline is empty"
          description="Save leads from Lead Finder to start tracking them through your sales process."
          action={
            <Button asChild>
              <Link href="/lead-finder">Find leads</Link>
            </Button>
          }
        />
      </div>
    );
  }

  return (
    <div className="space-y-4 p-6">
      <div className="flex items-center gap-2">
        <Button variant={view === "kanban" ? "secondary" : "outline"} size="sm" onClick={() => setView("kanban")}>
          <KanbanSquare className="size-3.5" /> Kanban
        </Button>
        <Button variant={view === "table" ? "secondary" : "outline"} size="sm" onClick={() => setView("table")}>
          <Rows3 className="size-3.5" /> Table
        </Button>
      </div>

      {view === "kanban" ? (
        <KanbanBoard leads={leads} onMove={handleMove} />
      ) : (
        <div className="overflow-hidden rounded-xl border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Score</TableHead>
                <TableHead>Business</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Last contacted</TableHead>
                <TableHead>Next action</TableHead>
                <TableHead>Est. value</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {leads.map((lead) => {
                const score = lead.business.leadScores[0];
                return (
                  <TableRow key={lead.id}>
                    <TableCell>{score ? <ScoreBadge score={score.score} quality={score.quality} size="sm" /> : "—"}</TableCell>
                    <TableCell className="font-medium">
                      <Link href={`/business/${lead.business.id}`} className="hover:underline">
                        {lead.business.name}
                      </Link>
                    </TableCell>
                    <TableCell>
                      <Select value={lead.status} onValueChange={(v) => handleMove(lead.id, v as LeadStatus)}>
                        <SelectTrigger className="h-8 w-40 text-xs">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {LEAD_STATUSES.map((s) => (
                            <SelectItem key={s} value={s}>
                              {LEAD_STATUS_LABEL[s]}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell className="text-muted-foreground">{formatRelativeTime(lead.lastContactedAt)}</TableCell>
                    <TableCell className="text-muted-foreground">
                      {lead.nextActionAt ? (
                        <Badge variant="outline">{formatRelativeTime(lead.nextActionAt)}</Badge>
                      ) : (
                        "—"
                      )}
                    </TableCell>
                    <TableCell className="text-muted-foreground">{formatCurrencyRange(lead.estimatedValueMin, lead.estimatedValueMax)}</TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
