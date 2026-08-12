import { db } from "@/lib/db";
import { computeOpportunityScore } from "@/lib/services/lead-scoring";
import type { AuditResult } from "@/lib/services/website-auditor";
import type { Prisma } from "@prisma/client";

const BUSINESS_DATA_FRESH_WITHIN_DAYS = 14;

export async function recomputeLeadScore(businessId: string) {
  const business = await db.business.findUnique({
    where: { id: businessId },
    include: {
      contacts: true,
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

  const businessDataFresh = business.lastCheckedAt
    ? (Date.now() - business.lastCheckedAt.getTime()) / (1000 * 60 * 60 * 24) <= BUSINESS_DATA_FRESH_WITHIN_DAYS
    : false;

  const result = computeOpportunityScore({
    hasWebsite: Boolean(business.website),
    websiteAbsenceStatus: business.websiteAbsenceStatus,
    rating: business.rating,
    reviewCount: business.reviewCount,
    contacts: business.contacts,
    audit,
    businessDataFresh,
  });

  const leadScore = await db.leadScore.create({
    data: {
      businessId,
      score: result.score,
      quality: result.quality,
      confidence: result.confidence,
      reasonsJson: result.reasons as unknown as Prisma.InputJsonValue,
      breakdownJson: result.breakdown as unknown as Prisma.InputJsonValue,
    },
  });

  return { leadScore, ...result };
}
