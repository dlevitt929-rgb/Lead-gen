import { db } from "@/lib/db";
import { refreshBusinessData } from "@/lib/services/business-refresh-service";
import { discoverWebsite } from "@/lib/services/website-discovery-service";
import { runAndSaveAudit, NoWebsiteKnownError } from "@/lib/services/audit-service";
import { isAuditStale } from "@/lib/services/website-auditor";
import { recomputeLeadScore } from "@/lib/services/scoring-service";
import { createWebsiteConcept } from "@/lib/services/website-concept-service";
import { generateSalesAngle, type SalesAngle } from "@/lib/services/ai-sales-assistant";
import { saveLead } from "@/lib/services/lead-service";
import type { AuditIssue } from "@/lib/services/website-auditor";

export interface PrepareForCallStep {
  step: string;
  status: "done" | "skipped" | "failed";
  message: string;
}

export interface PrepareForCallResult {
  steps: PrepareForCallStep[];
  leadId: string;
  demoId: string | null;
  angle: SalesAngle | null;
}

/**
 * One-click "Prepare for Call" — chains every prep step a rep would
 * otherwise do by hand: refresh -> verify website -> audit -> re-score ->
 * generate a website concept (if missing) -> generate a sales angle -> add
 * to the call queue. Each step is best-effort and independently reported —
 * one failing step (e.g. no AI provider configured) never blocks the rest.
 */
export async function prepareForCall(userId: string, businessId: string): Promise<PrepareForCallResult> {
  const steps: PrepareForCallStep[] = [];

  try {
    const refreshResult = await refreshBusinessData(businessId);
    steps.push({ step: "Refresh business data", status: refreshResult.refreshed ? "done" : "skipped", message: refreshResult.message });
  } catch (err) {
    steps.push({ step: "Refresh business data", status: "failed", message: err instanceof Error ? err.message : "Refresh failed." });
  }

  const business = await db.business.findUnique({ where: { id: businessId }, include: { website: true } });
  if (!business) throw new Error("Business not found.");

  if (!business.website && business.websiteAbsenceStatus === "UNKNOWN") {
    try {
      const discovery = await discoverWebsite(businessId);
      steps.push({ step: "Verify website", status: "done", message: `${discovery.status === "PRESENT" ? `Found: ${discovery.url}` : discovery.status === "CONFIRMED_NONE" ? "Confirmed no website" : "Still unconfirmed"} (via ${discovery.source}).` });
    } catch (err) {
      steps.push({ step: "Verify website", status: "failed", message: err instanceof Error ? err.message : "Verification failed." });
    }
  } else {
    steps.push({
      step: "Verify website",
      status: "skipped",
      message: business.website ? "Website already known." : "Already confirmed no website.",
    });
  }

  const businessWithAudit = await db.business.findUnique({
    where: { id: businessId },
    include: { website: { include: { audits: { orderBy: { performedAt: "desc" }, take: 1 } } } },
  });
  const latestAudit = businessWithAudit?.website?.audits[0];

  if (businessWithAudit?.website) {
    if (!latestAudit || isAuditStale(latestAudit.performedAt)) {
      try {
        await runAndSaveAudit(businessId);
        steps.push({ step: "Website audit", status: "done", message: "Audit completed." });
      } catch (err) {
        const message = err instanceof NoWebsiteKnownError ? err.message : err instanceof Error ? err.message : "Audit failed.";
        steps.push({ step: "Website audit", status: "failed", message });
      }
    } else {
      steps.push({ step: "Website audit", status: "skipped", message: "A recent audit already exists." });
    }
  } else {
    steps.push({ step: "Website audit", status: "skipped", message: "No known website to audit." });
  }

  try {
    await recomputeLeadScore(businessId);
    steps.push({ step: "Recompute opportunity score", status: "done", message: "Score updated." });
  } catch (err) {
    steps.push({ step: "Recompute opportunity score", status: "failed", message: err instanceof Error ? err.message : "Scoring failed." });
  }

  const lead = await saveLead(userId, businessId);

  let existingDemo = await db.demo.findFirst({ where: { businessId, userId }, orderBy: { createdAt: "desc" } });
  if (!existingDemo) {
    try {
      existingDemo = await createWebsiteConcept({ userId, businessId, leadId: lead.id });
      steps.push({ step: "Generate website concept", status: "done", message: "Website concept generated." });
    } catch (err) {
      steps.push({ step: "Generate website concept", status: "failed", message: err instanceof Error ? err.message : "Could not generate a concept." });
    }
  } else {
    steps.push({ step: "Generate website concept", status: "skipped", message: "A concept already exists for this business." });
  }

  let angle: SalesAngle | null = null;
  try {
    const final = await db.business.findUnique({
      where: { id: businessId },
      include: {
        locations: { where: { isPrimary: true }, take: 1 },
        website: { include: { audits: { orderBy: { performedAt: "desc" }, take: 1 } } },
        leadScores: { orderBy: { computedAt: "desc" }, take: 1 },
      },
    });
    const rep = await db.user.findUnique({ where: { id: userId } });
    const issues = (final?.website?.audits[0]?.issuesJson as unknown as AuditIssue[]) ?? [];
    const score = final?.leadScores[0];
    const result = await generateSalesAngle({
      businessName: final!.name,
      categoryPrimary: final!.categoryPrimary,
      city: final?.locations[0]?.city,
      suburb: final?.locations[0]?.suburb,
      rating: final?.rating,
      reviewCount: final?.reviewCount,
      hasWebsite: Boolean(final?.website),
      websiteIssues: issues,
      opportunityScore: score?.score ?? 0,
      opportunityReasons: (score?.reasonsJson as unknown as string[]) ?? [],
      repName: rep?.name,
    });
    angle = result.data;
    steps.push({ step: "Generate sales angle", status: "done", message: result.source === "ai" ? "AI-generated." : "Rule-based (no AI provider configured)." });
  } catch (err) {
    steps.push({ step: "Generate sales angle", status: "failed", message: err instanceof Error ? err.message : "Could not generate a sales angle." });
  }

  await db.lead.update({ where: { id: lead.id }, data: { status: "CALL_TODAY", nextActionAt: new Date() } });
  await db.activity.create({
    data: { userId, businessId, leadId: lead.id, type: "STATUS_CHANGED", message: `${business?.name ?? "Lead"} prepared for a call and added to today's queue.` },
  });
  steps.push({ step: "Add to call queue", status: "done", message: "Marked Call Today and prioritized in your queue." });

  return { steps, leadId: lead.id, demoId: existingDemo?.id ?? null, angle };
}
