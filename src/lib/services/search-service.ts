import { db } from "@/lib/db";
import { searchProviders } from "@/lib/providers";
import type { BusinessSearchParams, DataSourceId } from "@/lib/providers/types";
import { upsertBusinessFromRaw } from "@/lib/services/business-service";
import { recomputeLeadScore } from "@/lib/services/scoring-service";
import type { Prisma } from "@prisma/client";

export interface RunSearchOptions extends BusinessSearchParams {
  providerIds?: DataSourceId[];
  saveSearch?: boolean;
  searchName?: string;
}

export async function runSearch(userId: string, params: RunSearchOptions) {
  const { providerIds, saveSearch, searchName, ...searchParams } = params;

  const { results, warnings, providersUsed } = await searchProviders(searchParams, providerIds);

  const search = await db.search.create({
    data: {
      userId,
      name: searchName,
      isSaved: Boolean(saveSearch),
      paramsJson: searchParams as unknown as Prisma.InputJsonValue,
    },
  });

  const businesses = [];
  for (const raw of results) {
    const business = await upsertBusinessFromRaw(raw);

    const existingResult = await db.searchResult.findFirst({
      where: { businessId: business.id, search: { userId, isSaved: false } },
    });

    await db.searchResult.upsert({
      where: { searchId_businessId: { searchId: search.id, businessId: business.id } },
      update: {},
      create: { searchId: search.id, businessId: business.id, isNew: !existingResult },
    });

    const existingScore = await db.leadScore.findFirst({ where: { businessId: business.id } });
    const scoreResult = existingScore ? { score: existingScore.score, quality: existingScore.quality } : await recomputeLeadScore(business.id);

    const [location, contacts, website, existingLead] = await Promise.all([
      db.businessLocation.findFirst({ where: { businessId: business.id, isPrimary: true } }),
      db.contact.findMany({ where: { businessId: business.id } }),
      db.website.findUnique({ where: { businessId: business.id } }),
      db.lead.findUnique({ where: { userId_businessId: { userId, businessId: business.id } } }),
    ]);

    businesses.push({
      business,
      location,
      contacts,
      website,
      score: scoreResult.score,
      quality: scoreResult.quality,
      isSaved: Boolean(existingLead),
      isNew: !existingResult,
    });
  }

  businesses.sort((a, b) => b.score - a.score);

  return { searchId: search.id, businesses, warnings, providersUsed };
}
