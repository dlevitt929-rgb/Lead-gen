import { db } from "@/lib/db";
import { estimateLeadValue } from "@/lib/services/lead-value";
import { getOrCreateUserSettings, getPackages } from "@/lib/services/settings-service";
import type { LeadQuality, LeadStatus, Prisma, WebsiteStatus } from "@prisma/client";

export async function saveLead(userId: string, businessId: string) {
  const existing = await db.lead.findUnique({ where: { userId_businessId: { userId, businessId } } });
  if (existing) return existing;

  const [settings, latestScore] = await Promise.all([
    getOrCreateUserSettings(userId),
    db.leadScore.findFirst({ where: { businessId }, orderBy: { computedAt: "desc" } }),
  ]);

  const quality: LeadQuality = latestScore?.quality ?? "MEDIUM";
  const value = estimateLeadValue(quality, getPackages(settings));

  const lead = await db.lead.create({
    data: {
      userId,
      businessId,
      estimatedValueMin: value.min,
      estimatedValueMax: value.max,
      estimatedRecurringMin: value.recurringMin,
      estimatedRecurringMax: value.recurringMax,
    },
  });

  const business = await db.business.findUnique({ where: { id: businessId } });
  await db.activity.create({
    data: {
      userId,
      businessId,
      leadId: lead.id,
      type: "LEAD_SAVED",
      message: `${business?.name ?? "Business"} saved as a lead.`,
    },
  });

  return lead;
}

export interface LeadFilters {
  status?: LeadStatus[];
  quality?: LeadQuality[];
  websiteStatus?: WebsiteStatus[];
  search?: string;
  tagIds?: string[];
  sortBy?: "score" | "recent" | "value" | "nextAction";
  sortDir?: "asc" | "desc";
  page?: number;
  pageSize?: number;
}

export async function listLeads(userId: string, filters: LeadFilters = {}) {
  const page = filters.page ?? 1;
  const pageSize = filters.pageSize ?? 50;

  const businessConditions: Prisma.BusinessWhereInput[] = [];
  if (filters.search) {
    businessConditions.push({
      OR: [
        { name: { contains: filters.search, mode: "insensitive" } },
        { categoryPrimary: { contains: filters.search, mode: "insensitive" } },
      ],
    });
  }
  if (filters.websiteStatus?.length) {
    const wantsNone = filters.websiteStatus.includes("NONE");
    const otherStatuses = filters.websiteStatus.filter((s) => s !== "NONE");
    const websiteOr: Prisma.BusinessWhereInput[] = [];
    if (wantsNone) websiteOr.push({ website: null });
    if (otherStatuses.length) websiteOr.push({ website: { status: { in: otherStatuses } } });
    if (websiteOr.length) businessConditions.push({ OR: websiteOr });
  }

  const where: Prisma.LeadWhereInput = {
    userId,
    ...(filters.status?.length ? { status: { in: filters.status } } : {}),
    ...(filters.tagIds?.length ? { tags: { some: { tagId: { in: filters.tagIds } } } } : {}),
    ...(businessConditions.length ? { business: { AND: businessConditions } } : {}),
  };

  // Quality lives on the latest LeadScore row (one-to-many), and sorting mixes
  // DB and derived fields, so filtering/sorting/pagination all happen in JS
  // over a capped result set rather than at the SQL level.
  const allMatching = await db.lead.findMany({
    where,
    include: {
      business: {
        include: {
          locations: { where: { isPrimary: true }, take: 1 },
          contacts: true,
          website: true,
          leadScores: { orderBy: { computedAt: "desc" }, take: 1 },
        },
      },
      tags: { include: { tag: true } },
      calls: { orderBy: { calledAt: "desc" }, take: 1 },
    },
    orderBy: { updatedAt: "desc" },
    take: 1000,
  });

  const filtered = filters.quality?.length
    ? allMatching.filter((l) => filters.quality!.includes(l.business.leadScores[0]?.quality ?? "LOW"))
    : allMatching;

  const sorted = [...filtered].sort((a, b) => {
    const dir = filters.sortDir === "asc" ? 1 : -1;
    switch (filters.sortBy) {
      case "value":
        return dir * ((a.estimatedValueMax ?? 0) - (b.estimatedValueMax ?? 0));
      case "nextAction":
        return dir * ((a.nextActionAt?.getTime() ?? 0) - (b.nextActionAt?.getTime() ?? 0));
      case "recent":
        return dir * (a.updatedAt.getTime() - b.updatedAt.getTime());
      case "score":
      default:
        return dir * ((a.business.leadScores[0]?.score ?? 0) - (b.business.leadScores[0]?.score ?? 0));
    }
  });

  const total = sorted.length;
  const paged = sorted.slice((page - 1) * pageSize, (page - 1) * pageSize + pageSize);

  return { leads: paged, total, page, pageSize };
}

export async function updateLeadStatus(userId: string, leadId: string, status: LeadStatus) {
  const lead = await db.lead.findFirst({ where: { id: leadId, userId }, include: { business: true } });
  if (!lead) throw new Error("Lead not found.");

  const updated = await db.lead.update({
    where: { id: leadId },
    data: {
      status,
      doNotContact: status === "DO_NOT_CONTACT",
    },
  });

  await db.activity.create({
    data: {
      userId,
      businessId: lead.businessId,
      leadId,
      type: status === "DO_NOT_CONTACT" ? "DO_NOT_CONTACT_MARKED" : "STATUS_CHANGED",
      message: `Status changed to ${status.replace(/_/g, " ").toLowerCase()}.`,
    },
  });

  return updated;
}

export async function setNextAction(userId: string, leadId: string, nextActionAt: Date | null, note?: string) {
  const lead = await db.lead.findFirst({ where: { id: leadId, userId } });
  if (!lead) throw new Error("Lead not found.");

  return db.lead.update({
    where: { id: leadId },
    data: { nextActionAt, nextActionNote: note ?? null },
  });
}

export async function getLeadDetail(userId: string, leadId: string) {
  return db.lead.findFirst({
    where: { id: leadId, userId },
    include: {
      business: {
        include: {
          locations: true,
          contacts: true,
          website: { include: { audits: { orderBy: { performedAt: "desc" }, take: 3 } } },
          leadScores: { orderBy: { computedAt: "desc" }, take: 1 },
        },
      },
      calls: { orderBy: { calledAt: "desc" } },
      notes: { orderBy: { createdAt: "desc" } },
      followUps: { orderBy: { dueAt: "asc" } },
      proposals: { orderBy: { createdAt: "desc" } },
      demos: { orderBy: { createdAt: "desc" } },
      activities: { orderBy: { createdAt: "desc" } },
      tags: { include: { tag: true } },
    },
  });
}
