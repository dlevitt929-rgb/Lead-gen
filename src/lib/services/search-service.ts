import { db } from "@/lib/db";
import { searchProviders } from "@/lib/providers";
import type { BusinessSearchParams, DataSourceId, RawBusinessResult } from "@/lib/providers/types";
import { upsertBusinessFromRaw } from "@/lib/services/business-service";
import { recomputeLeadScore } from "@/lib/services/scoring-service";
import { mapWithConcurrency } from "@/lib/concurrency";
import type { Prisma } from "@prisma/client";

export interface RunSearchOptions extends BusinessSearchParams {
  providerIds?: DataSourceId[];
  saveSearch?: boolean;
  searchName?: string;
}

export type SearchProgressEvent =
  | { type: "status"; message: string }
  | { type: "progress"; done: number; total: number };

const PROCESS_CONCURRENCY = 6;

async function processOneResult(userId: string, searchId: string, raw: RawBusinessResult) {
  const business = await upsertBusinessFromRaw(raw);

  const existingResult = await db.searchResult.findFirst({
    where: { businessId: business.id, search: { userId, isSaved: false } },
  });

  const [, existingScore, location, contacts, website, existingLead] = await Promise.all([
    db.searchResult.upsert({
      where: { searchId_businessId: { searchId, businessId: business.id } },
      update: {},
      create: { searchId, businessId: business.id, isNew: !existingResult },
    }),
    db.leadScore.findFirst({ where: { businessId: business.id }, orderBy: { computedAt: "desc" } }),
    db.businessLocation.findFirst({ where: { businessId: business.id, isPrimary: true } }),
    db.contact.findMany({ where: { businessId: business.id } }),
    db.website.findUnique({ where: { businessId: business.id } }),
    db.lead.findUnique({ where: { userId_businessId: { userId, businessId: business.id } } }),
  ]);

  const scoreResult = existingScore ? { score: existingScore.score, quality: existingScore.quality } : await recomputeLeadScore(business.id);

  return {
    business,
    location,
    contacts,
    website,
    score: scoreResult.score,
    quality: scoreResult.quality,
    isSaved: Boolean(existingLead),
    isNew: !existingResult,
  };
}

export async function runSearch(
  userId: string,
  params: RunSearchOptions,
  onProgress?: (event: SearchProgressEvent) => void,
) {
  const { providerIds, saveSearch, searchName, ...searchParams } = params;

  onProgress?.({ type: "status", message: "Connecting to business provider…" });
  const { results, warnings, providersUsed } = await searchProviders(searchParams, providerIds);

  const locationLabel = [searchParams.suburb, searchParams.city, searchParams.region].filter(Boolean).join(", ") || "the requested area";
  onProgress?.({ type: "status", message: `Searching ${locationLabel}` });
  onProgress?.({ type: "status", message: `${results.length} business${results.length === 1 ? "" : "es"} found` });

  const search = await db.search.create({
    data: {
      userId,
      name: searchName,
      isSaved: Boolean(saveSearch),
      paramsJson: searchParams as unknown as Prisma.InputJsonValue,
    },
  });

  if (results.length === 0) {
    return { searchId: search.id, businesses: [], warnings, providersUsed };
  }

  onProgress?.({ type: "status", message: "Verifying business websites and scoring opportunities" });

  let done = 0;
  const processed = await mapWithConcurrency(results, PROCESS_CONCURRENCY, async (raw) => {
    const row = await processOneResult(userId, search.id, raw);
    done += 1;
    onProgress?.({ type: "progress", done, total: results.length });
    return row;
  });

  const businesses = [];
  const processingWarnings: { provider: string; message: string }[] = [];
  for (const outcome of processed) {
    if (outcome.error) {
      // One bad record must not fail the whole search — report it and move on.
      console.error(`[search] failed to process business "${outcome.item.name}":`, outcome.error);
      processingWarnings.push({
        provider: outcome.item.dataSource === "GOOGLE_PLACES" ? "Google Places" : "OpenStreetMap",
        message: `Could not save "${outcome.item.name}" — skipped.`,
      });
      continue;
    }
    if (outcome.result) businesses.push(outcome.result);
  }

  businesses.sort((a, b) => b.score - a.score);

  return { searchId: search.id, businesses, warnings: [...warnings, ...processingWarnings], providersUsed };
}
