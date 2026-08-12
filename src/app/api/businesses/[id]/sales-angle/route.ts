import { NextResponse } from "next/server";
import { requireUserId, isResponse } from "@/lib/api-helpers";
import { db } from "@/lib/db";
import { generateSalesAngle } from "@/lib/services/ai-sales-assistant";
import type { AuditIssue } from "@/lib/services/website-auditor";

export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const userId = await requireUserId();
  if (isResponse(userId)) return userId;

  const { id } = await params;
  const business = await db.business.findUnique({
    where: { id },
    include: {
      locations: { where: { isPrimary: true }, take: 1 },
      website: { include: { audits: { orderBy: { performedAt: "desc" }, take: 1 } } },
      leadScores: { orderBy: { computedAt: "desc" }, take: 1 },
    },
  });
  if (!business) return NextResponse.json({ error: "Business not found." }, { status: 404 });

  const session = await db.user.findUnique({ where: { id: userId } });
  const latestAudit = business.website?.audits[0];
  const issues = (latestAudit?.issuesJson as unknown as AuditIssue[]) ?? [];
  const score = business.leadScores[0];

  const result = await generateSalesAngle({
    businessName: business.name,
    categoryPrimary: business.categoryPrimary,
    city: business.locations[0]?.city,
    suburb: business.locations[0]?.suburb,
    rating: business.rating,
    reviewCount: business.reviewCount,
    hasWebsite: Boolean(business.website),
    websiteIssues: issues,
    opportunityScore: score?.score ?? 0,
    opportunityReasons: (score?.reasonsJson as unknown as string[]) ?? [],
    repName: session?.name,
  });

  return NextResponse.json(result);
}
