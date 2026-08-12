"use client";

import * as React from "react";
import Link from "next/link";
import { DndContext, useDraggable, useDroppable, type DragEndEvent, PointerSensor, useSensor, useSensors } from "@dnd-kit/core";
import { Star, Phone } from "lucide-react";
import { Card } from "@/components/ui/card";
import { ScoreBadge } from "@/components/shared/score-badge";
import { formatCurrencyRange } from "@/lib/utils";
import { PIPELINE_STAGES, LEAD_STATUS_LABEL } from "@/lib/lead-status";
import { cn } from "@/lib/utils";
import type { OpportunityRow } from "@/types/lead";
import type { LeadStatus } from "@prisma/client";

function LeadCard({ lead }: { lead: OpportunityRow }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({ id: lead.id });
  const score = lead.business.leadScores[0];
  const phone = lead.business.contacts.find((c) => c.type === "PHONE")?.value;

  return (
    <div
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      style={transform ? { transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`, zIndex: 50 } : undefined}
      className={cn("touch-none", isDragging && "opacity-60")}
    >
      <Card className="cursor-grab gap-2 p-3 active:cursor-grabbing">
        <div className="flex items-start justify-between gap-2">
          <Link href={`/business/${lead.business.id}`} onClick={(e) => isDragging && e.preventDefault()} className="text-sm font-medium hover:underline">
            {lead.business.name}
          </Link>
          {score && <ScoreBadge score={score.score} quality={score.quality} size="sm" />}
        </div>
        <p className="text-xs capitalize text-muted-foreground">{lead.business.categoryPrimary}</p>
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          {lead.business.rating && (
            <span className="flex items-center gap-0.5">
              <Star className="size-3 fill-warning text-warning" />
              {lead.business.rating.toFixed(1)}
            </span>
          )}
          {phone && (
            <span className="flex items-center gap-0.5">
              <Phone className="size-3" />
              {phone}
            </span>
          )}
        </div>
        {(lead.estimatedValueMin || lead.estimatedValueMax) && (
          <p className="text-xs font-medium text-primary">{formatCurrencyRange(lead.estimatedValueMin, lead.estimatedValueMax)}</p>
        )}
      </Card>
    </div>
  );
}

function Column({ status, leads }: { status: LeadStatus; leads: OpportunityRow[] }) {
  const { setNodeRef, isOver } = useDroppable({ id: status });

  return (
    <div
      ref={setNodeRef}
      className={cn("flex w-72 shrink-0 flex-col rounded-xl border bg-muted/30 transition-colors", isOver && "border-primary bg-primary/5")}
    >
      <div className="flex items-center justify-between border-b px-3 py-2.5">
        <span className="text-sm font-medium">{LEAD_STATUS_LABEL[status]}</span>
        <span className="rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">{leads.length}</span>
      </div>
      <div className="flex-1 space-y-2 overflow-y-auto p-2.5" style={{ maxHeight: "calc(100vh - 220px)" }}>
        {leads.map((lead) => (
          <LeadCard key={lead.id} lead={lead} />
        ))}
      </div>
    </div>
  );
}

export function KanbanBoard({ leads, onMove }: { leads: OpportunityRow[]; onMove: (leadId: string, status: LeadStatus) => void }) {
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }));

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over) return;
    const newStatus = over.id as LeadStatus;
    const lead = leads.find((l) => l.id === active.id);
    if (lead && lead.status !== newStatus) {
      onMove(lead.id, newStatus);
    }
  }

  return (
    <DndContext sensors={sensors} onDragEnd={handleDragEnd}>
      <div className="flex gap-3 overflow-x-auto pb-4">
        {PIPELINE_STAGES.map((status) => (
          <Column key={status} status={status} leads={leads.filter((l) => l.status === status)} />
        ))}
      </div>
    </DndContext>
  );
}
