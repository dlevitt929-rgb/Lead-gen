import { db } from "@/lib/db";
import { computeOpportunityScore } from "@/lib/services/lead-scoring";
import type { AuditResult } from "@/lib/services/website-auditor";
import type { Prisma } from "@prisma/client";

export async function recomputeLeadScore(businessId: string) {
  const business = await db.business.findUnique({
    where: { id: businessId },
    include: {
      contacts: { where: { type: "PHONE" } },
      website: { include: { audits: { orderBy: { performedAt: "desc" }, take: 1 } } },
    },
  });
  if (!business) throw new Error("Business not found.");

  const latestAudit = business.website?.audits[0];
  const audit: AuditResult | null = latestAudit
    ? {
        source: latestAudit.source as AuditResult["source"],
        hasSsl: business.website?.hasSsl ?? false,
        hasViewportMeta: business.website?.hasViewportMeta ?? false,
        performanceScore: latestAudit.performanceScore,
        mobileScore: latestAudit.mobileScore,
        seoScore: latestAudit.seoScore,
        accessibilityScore: latestAudit.accessibilityScore,
        designScore: latestAudit.designScore ?? 50,
        conversionScore: latestAudit.conversionScore ?? 50,
        loadTimeMs: latestAudit.loadTimeMs,
        issues: (latestAudit.issuesJson as unknown as AuditResult["issues"]) ?? [],
        summary: latestAudit.summary ?? "",
      }
    : null;

  const result = computeOpportunityScore({
    hasWebsite: Boolean(business.website),
    rating: business.rating,
    reviewCount: business.reviewCount,
    hasPhone: business.contacts.length > 0,
    audit,
  });

  const leadScore = await db.leadScore.create({
    data: {
      businessId,
      score: result.score,
      quality: result.quality,
      reasonsJson: result.reasons as unknown as Prisma.InputJsonValue,
    },
  });

  return { leadScore, ...result };
}
