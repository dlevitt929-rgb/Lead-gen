import { db } from "@/lib/db";
import type { CallOutcome, LeadStatus } from "@prisma/client";

export async function addNote(userId: string, leadId: string, body: string) {
  const lead = await db.lead.findFirst({ where: { id: leadId, userId } });
  if (!lead) throw new Error("Lead not found.");

  const note = await db.note.create({ data: { leadId, userId, body } });
  await db.activity.create({
    data: { userId, leadId, businessId: lead.businessId, type: "NOTE_ADDED", message: body.slice(0, 140) },
  });
  return note;
}

const OUTCOME_STATUS_MAP: Partial<Record<CallOutcome, LeadStatus>> = {
  NO_ANSWER: "NO_ANSWER",
  VOICEMAIL: "CALL_BACK",
  INTERESTED: "INTERESTED",
  NOT_INTERESTED: "LOST",
  CALL_BACK: "CALL_BACK",
  WRONG_NUMBER: "RESEARCHING",
  DO_NOT_CONTACT: "DO_NOT_CONTACT",
  ANSWERED: "CALLED",
};

export async function logCall(params: {
  userId: string;
  leadId: string;
  outcome: CallOutcome;
  notes?: string;
  durationSeconds?: number;
}) {
  const lead = await db.lead.findFirst({ where: { id: params.leadId, userId: params.userId } });
  if (!lead) throw new Error("Lead not found.");

  const call = await db.call.create({
    data: {
      leadId: params.leadId,
      userId: params.userId,
      outcome: params.outcome,
      notes: params.notes,
      durationSeconds: params.durationSeconds,
    },
  });

  const nextStatus = OUTCOME_STATUS_MAP[params.outcome];

  await db.lead.update({
    where: { id: params.leadId },
    data: {
      lastContactedAt: new Date(),
      status: nextStatus ?? lead.status,
      doNotContact: params.outcome === "DO_NOT_CONTACT" ? true : lead.doNotContact,
    },
  });

  await db.activity.create({
    data: {
      userId: params.userId,
      leadId: params.leadId,
      businessId: lead.businessId,
      type: "CALL_LOGGED",
      message: `Call logged — outcome: ${params.outcome.replace(/_/g, " ").toLowerCase()}.`,
    },
  });

  return call;
}

export async function scheduleFollowUp(userId: string, leadId: string, dueAt: Date, note?: string) {
  const lead = await db.lead.findFirst({ where: { id: leadId, userId } });
  if (!lead) throw new Error("Lead not found.");

  const followUp = await db.followUp.create({ data: { leadId, userId, dueAt, note } });
  await db.lead.update({ where: { id: leadId }, data: { nextActionAt: dueAt, nextActionNote: note } });

  await db.activity.create({
    data: {
      userId,
      leadId,
      businessId: lead.businessId,
      type: "FOLLOW_UP_SCHEDULED",
      message: `Follow-up scheduled for ${dueAt.toLocaleString("en-ZA")}${note ? ` — ${note}` : ""}.`,
    },
  });

  return followUp;
}

export async function completeFollowUp(userId: string, followUpId: string) {
  const followUp = await db.followUp.findFirst({ where: { id: followUpId, userId } });
  if (!followUp) throw new Error("Follow-up not found.");

  const updated = await db.followUp.update({
    where: { id: followUpId },
    data: { completed: true, completedAt: new Date() },
  });

  await db.activity.create({
    data: {
      userId,
      leadId: followUp.leadId,
      type: "FOLLOW_UP_COMPLETED",
      message: "Follow-up marked complete.",
    },
  });

  return updated;
}

export async function addTagToLead(userId: string, leadId: string, tagName: string, color?: string) {
  const lead = await db.lead.findFirst({ where: { id: leadId, userId } });
  if (!lead) throw new Error("Lead not found.");

  const tag = await db.tag.upsert({
    where: { userId_name: { userId, name: tagName } },
    update: {},
    create: { userId, name: tagName, color: color ?? "#6366f1" },
  });

  await db.leadTag.upsert({
    where: { leadId_tagId: { leadId, tagId: tag.id } },
    update: {},
    create: { leadId, tagId: tag.id },
  });

  return tag;
}

export async function removeTagFromLead(userId: string, leadId: string, tagId: string) {
  const lead = await db.lead.findFirst({ where: { id: leadId, userId } });
  if (!lead) throw new Error("Lead not found.");
  await db.leadTag.delete({ where: { leadId_tagId: { leadId, tagId } } });
}
