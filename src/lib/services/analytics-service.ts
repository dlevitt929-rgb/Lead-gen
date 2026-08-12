import { db } from "@/lib/db";

export async function getAnalytics(userId: string) {
  const [leads, calls, demos, proposals, wonLeads, lostLeads] = await Promise.all([
    db.lead.findMany({ where: { userId }, include: { business: { include: { locations: { where: { isPrimary: true }, take: 1 } } } } }),
    db.call.findMany({ where: { userId } }),
    db.demo.count({ where: { userId } }),
    db.proposal.findMany({ where: { userId } }),
    db.lead.findMany({ where: { userId, status: "WON" }, include: { business: { include: { locations: { where: { isPrimary: true }, take: 1 } } } } }),
    db.lead.count({ where: { userId, status: "LOST" } }),
  ]);

  const leadsFound = leads.length;
  const callsMade = calls.length;
  const callsAnswered = calls.filter((c) => !["NO_ANSWER", "VOICEMAIL", "WRONG_NUMBER"].includes(c.outcome)).length;
  const interestedLeadIds = new Set(calls.filter((c) => c.outcome === "INTERESTED").map((c) => c.leadId));
  const interested = interestedLeadIds.size;
  const demosCreated = demos;
  const proposalsSent = proposals.filter((p) => p.sentAt !== null || p.status !== "DRAFT").length;
  const dealsWon = wonLeads.length;
  const dealsLost = lostLeads;

  const revenue = wonLeads.reduce((sum, l) => {
    const mid = l.estimatedValueMin && l.estimatedValueMax ? (l.estimatedValueMin + l.estimatedValueMax) / 2 : 0;
    return sum + mid;
  }, 0);
  const avgProjectValue = dealsWon > 0 ? Math.round(revenue / dealsWon) : 0;
  const conversionRate = leadsFound > 0 ? (dealsWon / leadsFound) * 100 : 0;

  const industryTally = new Map<string, number>();
  for (const l of wonLeads) {
    industryTally.set(l.business.categoryPrimary, (industryTally.get(l.business.categoryPrimary) ?? 0) + 1);
  }
  const bestIndustry = [...industryTally.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? null;

  const areaTally = new Map<string, number>();
  for (const l of wonLeads) {
    const area = l.business.locations[0]?.city ?? l.business.locations[0]?.suburb;
    if (area) areaTally.set(area, (areaTally.get(area) ?? 0) + 1);
  }
  const bestArea = [...areaTally.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? null;

  return {
    leadsFound,
    callsMade,
    callsAnswered,
    interested,
    demosCreated,
    proposalsSent,
    dealsWon,
    dealsLost,
    conversionRate,
    revenue: Math.round(revenue),
    avgProjectValue,
    bestIndustry,
    bestArea,
    funnel: [
      { stage: "Leads", value: leadsFound },
      { stage: "Calls", value: callsMade },
      { stage: "Conversations", value: callsAnswered },
      { stage: "Interested", value: interested },
      { stage: "Proposals", value: proposalsSent },
      { stage: "Customers", value: dealsWon },
    ],
  };
}
