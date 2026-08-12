import type { LeadStatus } from "@prisma/client";

export const LEAD_STATUSES: LeadStatus[] = [
  "NEW",
  "RESEARCHING",
  "CALL_TODAY",
  "CALLED",
  "NO_ANSWER",
  "CALL_BACK",
  "INTERESTED",
  "DEMO_REQUESTED",
  "PROPOSAL_SENT",
  "NEGOTIATING",
  "WON",
  "LOST",
  "DO_NOT_CONTACT",
];

export const LEAD_STATUS_LABEL: Record<LeadStatus, string> = {
  NEW: "New",
  RESEARCHING: "Researching",
  CALL_TODAY: "Call Today",
  CALLED: "Called",
  NO_ANSWER: "No Answer",
  CALL_BACK: "Call Back",
  INTERESTED: "Interested",
  DEMO_REQUESTED: "Demo Requested",
  PROPOSAL_SENT: "Proposal Sent",
  NEGOTIATING: "Negotiating",
  WON: "Won",
  LOST: "Lost",
  DO_NOT_CONTACT: "Do Not Contact",
};

// Kanban column grouping — a curated subset of statuses shown as CRM stages.
export const PIPELINE_STAGES: LeadStatus[] = [
  "NEW",
  "RESEARCHING",
  "CALL_TODAY",
  "CALL_BACK",
  "INTERESTED",
  "DEMO_REQUESTED",
  "PROPOSAL_SENT",
  "NEGOTIATING",
  "WON",
  "LOST",
];
