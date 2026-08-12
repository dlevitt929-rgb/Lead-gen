import { db } from "@/lib/db";
import { auditWebsite, overallScoreFromAudit, websiteStatusFromScore } from "@/lib/services/website-auditor";
import { recomputeLeadScore } from "@/lib/services/scoring-service";
import type { Prisma } from "@prisma/client";

export async function runAndSaveAudit(businessId: string) {
  const business = await db.business.findUnique({ where: { id: businessId }, include: { website: true } });
  if (!business?.website) {
    throw new Error("This business has no known website to audit.");
  }

  const audit = await auditWebsite(business.website.url);
  const overall = overallScoreFromAudit(audit);
  const status = websiteStatusFromScore(overall);

  const website = await db.website.update({
    where: { id: business.website.id },
    data: {
      finalUrl: audit.finalUrl,
      hasSsl: audit.hasSsl,
      httpStatus: audit.httpStatus,
      title: audit.title,
      metaDescription: audit.metaDescription,
      hasViewportMeta: audit.hasViewportMeta,
      technologyGuess: audit.technologyGuess,
      status,
      lastFetchedAt: new Date(),
      lastFetchError: audit.issues.find((i) => i.category === "availability")?.message ?? null,
    },
  });

  const savedAudit = await db.websiteAudit.create({
    data: {
      websiteId: website.id,
      source: audit.source,
      performanceScore: audit.performanceScore,
      mobileScore: audit.mobileScore,
      seoScore: audit.seoScore,
      accessibilityScore: audit.accessibilityScore,
      designScore: audit.designScore,
      conversionScore: audit.conversionScore,
      loadTimeMs: audit.loadTimeMs,
      summary: audit.summary,
      issuesJson: audit.issues as unknown as Prisma.InputJsonValue,
    },
  });

  const actorId = await currentActorFallback(businessId);
  if (actorId) {
    await db.activity.create({
      data: {
        userId: actorId,
        businessId,
        type: "AUDIT_COMPLETED",
        message: `Website audit completed — overall score ${overall}/100 (${audit.source === "pagespeed" ? "Google PageSpeed" : "heuristic scan"}).`,
      },
    });
  }

  const scoreResult = await recomputeLeadScore(businessId);

  return { audit: savedAudit, overall, status, scoreResult };
}

// Activities require a userId (they're per-user timeline entries). When an
// audit is triggered from a context without a session (e.g. background
// refresh), fall back to the business's most recent lead owner if any.
async function currentActorFallback(businessId: string): Promise<string | null> {
  const lead = await db.lead.findFirst({ where: { businessId }, orderBy: { createdAt: "desc" } });
  return lead?.userId ?? null;
}
