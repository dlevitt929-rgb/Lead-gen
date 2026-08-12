import { db } from "@/lib/db";
import { getProvider } from "@/lib/providers";
import type { RawBusinessResult } from "@/lib/providers/types";
import type { ContactType, DataConfidence } from "@prisma/client";

export interface RefreshResult {
  refreshed: boolean;
  changedFields: string[];
  message: string;
}

/**
 * Re-fetches a business from the same provider/place ID it was originally
 * discovered from, and merges the response in — never destructively. A
 * provider returning a missing/null field this time around is treated as
 * "this field wasn't part of the response," not "this field is now empty" —
 * previously known good data (a verified website, a phone number, etc.) is
 * only ever replaced by a new non-empty value, never erased by a blank one.
 */
export async function refreshBusinessData(businessId: string): Promise<RefreshResult> {
  const business = await db.business.findUnique({
    where: { id: businessId },
    include: { website: true, contacts: true, locations: { where: { isPrimary: true }, take: 1 } },
  });
  if (!business) throw new Error("Business not found.");
  if (!business.sourcePlaceId) {
    return { refreshed: false, changedFields: [], message: "This business has no source ID to refresh from." };
  }
  if (business.dataSource !== "GOOGLE_PLACES" && business.dataSource !== "OPENSTREETMAP") {
    return { refreshed: false, changedFields: [], message: `${business.dataSource} does not support refreshing individual businesses.` };
  }

  const provider = getProvider(business.dataSource);
  if (!provider?.refreshOne) {
    return { refreshed: false, changedFields: [], message: `${provider?.displayName ?? business.dataSource} does not support refreshing individual businesses.` };
  }
  if (!provider.isConfigured()) {
    return { refreshed: false, changedFields: [], message: `${provider.displayName} is not configured — add its API key to refresh from it.` };
  }

  let fresh: RawBusinessResult | null;
  try {
    fresh = await provider.refreshOne(business.sourcePlaceId);
  } catch (err) {
    return { refreshed: false, changedFields: [], message: err instanceof Error ? err.message : "Refresh request failed." };
  }

  if (!fresh) {
    return { refreshed: false, changedFields: [], message: "This business could no longer be found by the provider — its existing data was left untouched." };
  }

  const changedFields: string[] = [];
  const businessUpdate: Record<string, unknown> = { lastCheckedAt: new Date() };

  function mergeScalar(field: string, current: unknown, next: unknown) {
    if (next === undefined || next === null || next === "") return;
    if (next !== current) {
      businessUpdate[field] = next;
      changedFields.push(field);
    }
  }

  mergeScalar("name", business.name, fresh.name);
  mergeScalar("categoryPrimary", business.categoryPrimary, fresh.categoryPrimary);
  mergeScalar("rating", business.rating, fresh.rating);
  mergeScalar("reviewCount", business.reviewCount, fresh.reviewCount);
  mergeScalar("googleMapsUrl", business.googleMapsUrl, fresh.googleMapsUrl);
  if (fresh.categories?.length) businessUpdate.categoriesJson = fresh.categories;
  if (fresh.openingHours?.length) businessUpdate.openingHoursJson = fresh.openingHours;

  await db.business.update({ where: { id: businessId }, data: businessUpdate });

  const location = business.locations[0];
  if (location) {
    const locationUpdate: Record<string, unknown> = {};
    const mergeLoc = (field: string, current: unknown, next: unknown) => {
      if (next === undefined || next === null || next === "") return;
      if (next !== current) {
        locationUpdate[field] = next;
        changedFields.push(`location.${field}`);
      }
    };
    mergeLoc("addressFormatted", location.addressFormatted, fresh.addressFormatted);
    mergeLoc("city", location.city, fresh.city);
    mergeLoc("suburb", location.suburb, fresh.suburb);
    mergeLoc("postalCode", location.postalCode, fresh.postalCode);
    mergeLoc("latitude", location.latitude, fresh.latitude);
    mergeLoc("longitude", location.longitude, fresh.longitude);
    if (Object.keys(locationUpdate).length > 0) {
      await db.businessLocation.update({ where: { id: location.id }, data: locationUpdate });
    }
  }

  // Contacts: add/update anything the fresh response has. Never delete an
  // existing contact just because this response didn't repeat it.
  const sourceLabel = business.dataSource === "GOOGLE_PLACES" ? "Google Places API" : "OpenStreetMap";
  const freshContacts: { type: ContactType; value: string; confidence: DataConfidence }[] = [];
  if (fresh.phone) freshContacts.push({ type: "PHONE", value: fresh.phone, confidence: "VERIFIED" });
  if (fresh.googleMapsUrl) freshContacts.push({ type: "OTHER", value: fresh.googleMapsUrl, confidence: "VERIFIED" });
  for (const social of fresh.socialLinks ?? []) {
    freshContacts.push({ type: social.type, value: social.url, confidence: "PUBLIC" });
  }
  for (const c of freshContacts) {
    const existing = business.contacts.find((existing) => existing.type === c.type && existing.value === c.value);
    if (!existing) changedFields.push(`contact.${c.type.toLowerCase()}`);
    await db.contact.upsert({
      where: { businessId_type_value: { businessId, type: c.type, value: c.value } },
      update: { confidence: c.confidence, source: sourceLabel, verifiedAt: new Date() },
      create: { businessId, type: c.type, value: c.value, confidence: c.confidence, source: sourceLabel, verifiedAt: new Date() },
    });
  }

  // Website: only ever an upgrade. A fresh response with no website field
  // does NOT touch an existing verified one.
  if (fresh.website && fresh.website !== business.website?.url) {
    await db.website.upsert({
      where: { businessId },
      update: { url: fresh.website },
      create: { businessId, url: fresh.website },
    });
    await db.contact.upsert({
      where: { businessId_type_value: { businessId, type: "WEBSITE", value: fresh.website } },
      update: { confidence: "VERIFIED", source: sourceLabel, verifiedAt: new Date() },
      create: { businessId, type: "WEBSITE", value: fresh.website, confidence: "VERIFIED", source: sourceLabel, verifiedAt: new Date() },
    });
    await db.business.update({ where: { id: businessId }, data: { websiteCheckedAt: new Date(), websiteCheckSource: sourceLabel } });
    changedFields.push("website");
  }

  return {
    refreshed: true,
    changedFields,
    message:
      changedFields.length > 0
        ? `Updated: ${changedFields.join(", ")}.`
        : "Refreshed — no changes found, existing data was already current.",
  };
}
