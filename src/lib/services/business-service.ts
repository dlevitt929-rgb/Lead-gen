import { db } from "@/lib/db";
import type { RawBusinessResult } from "@/lib/providers/types";
import type { Business, ContactType, DataConfidence } from "@prisma/client";

/**
 * Persists (or refreshes) a business discovered by a lead provider.
 * Businesses are a shared cache keyed by (dataSource, sourcePlaceId) — running
 * the same search twice reuses the same row instead of creating duplicates.
 */
export async function upsertBusinessFromRaw(raw: RawBusinessResult): Promise<Business> {
  const existing = await db.business.findUnique({
    where: { dataSource_sourcePlaceId: { dataSource: raw.dataSource, sourcePlaceId: raw.sourcePlaceId } },
  });

  const businessData = {
    name: raw.name,
    categoryPrimary: raw.categoryPrimary,
    categoriesJson: raw.categories,
    dataSource: raw.dataSource,
    sourcePlaceId: raw.sourcePlaceId,
    sourceUrl: raw.sourceUrl,
    rating: raw.rating,
    reviewCount: raw.reviewCount,
    googleMapsUrl: raw.googleMapsUrl,
    openingHoursJson: raw.openingHours ? raw.openingHours : undefined,
    lastCheckedAt: new Date(),
  };

  const business = existing
    ? await db.business.update({ where: { id: existing.id }, data: businessData })
    : await db.business.create({ data: businessData });

  if (raw.latitude !== undefined && raw.longitude !== undefined) {
    const location = await db.businessLocation.findFirst({ where: { businessId: business.id, isPrimary: true } });
    const locationData = {
      addressFormatted: raw.addressFormatted,
      country: raw.country,
      region: raw.region,
      city: raw.city,
      suburb: raw.suburb,
      postalCode: raw.postalCode,
      latitude: raw.latitude,
      longitude: raw.longitude,
    };
    if (location) {
      await db.businessLocation.update({ where: { id: location.id }, data: locationData });
    } else {
      await db.businessLocation.create({ data: { businessId: business.id, isPrimary: true, ...locationData } });
    }
  }

  const contacts: { type: ContactType; value: string; confidence: DataConfidence; source: string }[] = [];
  const sourceLabel = raw.dataSource === "GOOGLE_PLACES" ? "Google Places API" : "OpenStreetMap";

  if (raw.phone) contacts.push({ type: "PHONE", value: raw.phone, confidence: "VERIFIED", source: sourceLabel });
  if (raw.website) contacts.push({ type: "WEBSITE", value: raw.website, confidence: "VERIFIED", source: sourceLabel });
  if (raw.googleMapsUrl) contacts.push({ type: "OTHER", value: raw.googleMapsUrl, confidence: "VERIFIED", source: sourceLabel });
  for (const social of raw.socialLinks ?? []) {
    contacts.push({ type: social.type, value: social.url, confidence: "PUBLIC", source: sourceLabel });
  }

  for (const contact of contacts) {
    await db.contact.upsert({
      where: { businessId_type_value: { businessId: business.id, type: contact.type, value: contact.value } },
      update: { confidence: contact.confidence, source: contact.source, verifiedAt: new Date() },
      create: { businessId: business.id, ...contact, verifiedAt: new Date() },
    });
  }

  if (raw.website) {
    await db.website.upsert({
      where: { businessId: business.id },
      update: { url: raw.website },
      create: { businessId: business.id, url: raw.website },
    });
    await db.business.update({
      where: { id: business.id },
      data: { websiteCheckedAt: new Date(), websiteCheckSource: sourceLabel },
    });
  } else if (!existing?.websiteAbsenceStatus || existing.websiteAbsenceStatus !== "CONFIRMED_NONE") {
    // No website field from this provider does NOT mean "confirmed no
    // website" — it just means this particular source didn't have one.
    // Google Places actively solicits website URLs from owners, so an empty
    // field there is a reasonably confident negative signal. OpenStreetMap's
    // tagging is crowd-sourced and often incomplete, so its silence proves
    // nothing — leave those as UNKNOWN rather than a false negative.
    // Never downgrade an existing CONFIRMED_NONE back to UNKNOWN.
    const hasExistingWebsite = await db.website.findUnique({ where: { businessId: business.id } });
    if (!hasExistingWebsite) {
      await db.business.update({
        where: { id: business.id },
        data: {
          websiteAbsenceStatus: raw.dataSource === "GOOGLE_PLACES" ? "CONFIRMED_NONE" : "UNKNOWN",
          websiteCheckedAt: new Date(),
          websiteCheckSource: raw.dataSource === "GOOGLE_PLACES" ? sourceLabel : `${sourceLabel} (no website tag — inconclusive)`,
        },
      });
    }
  }

  return business;
}

export async function listDiscoveredBusinesses(userId: string, search?: string) {
  const businesses = await db.business.findMany({
    where: {
      searchResults: { some: { search: { userId } } },
      ...(search
        ? { OR: [{ name: { contains: search, mode: "insensitive" } }, { categoryPrimary: { contains: search, mode: "insensitive" } }] }
        : {}),
    },
    include: {
      locations: { where: { isPrimary: true }, take: 1 },
      contacts: true,
      website: true,
      leadScores: { orderBy: { computedAt: "desc" }, take: 1 },
      leads: { where: { userId }, take: 1 },
    },
    orderBy: { updatedAt: "desc" },
    take: 200,
  });

  return businesses;
}

export async function getBusinessDetail(businessId: string, userId?: string) {
  return db.business.findUnique({
    where: { id: businessId },
    include: {
      locations: true,
      contacts: true,
      website: { include: { audits: { orderBy: { performedAt: "desc" }, take: 5 } } },
      leadScores: { orderBy: { computedAt: "desc" }, take: 1 },
      leads: userId ? { where: { userId } } : false,
      activities: userId ? { where: { userId }, orderBy: { createdAt: "desc" }, take: 30 } : false,
      demos: userId ? { where: { userId }, orderBy: { createdAt: "desc" } } : false,
    },
  });
}
