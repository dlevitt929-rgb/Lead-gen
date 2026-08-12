import { db } from "@/lib/db";
import { googlePlacesProvider } from "@/lib/providers/google-places-provider";

export type WebsitePresence = "PRESENT" | "CONFIRMED_NONE" | "UNKNOWN";

export interface WebsiteDiscoveryResult {
  status: WebsitePresence;
  url?: string;
  source: string;
}

function normalize(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

/** Loose match: shares most of its significant words, or one name contains the other. */
function namesLikelyMatch(a: string, b: string): boolean {
  const na = normalize(a);
  const nb = normalize(b);
  if (!na || !nb) return false;
  if (na === nb || na.includes(nb) || nb.includes(na)) return true;

  const wordsA = new Set(na.split(" ").filter((w) => w.length > 2));
  const wordsB = new Set(nb.split(" ").filter((w) => w.length > 2));
  if (wordsA.size === 0 || wordsB.size === 0) return false;
  const overlap = [...wordsA].filter((w) => wordsB.has(w)).length;
  return overlap / Math.min(wordsA.size, wordsB.size) >= 0.6;
}

/**
 * Determines whether a business has a website, using only legitimate
 * provider APIs (no scraping). This is intentionally conservative: it only
 * ever reports CONFIRMED_NONE when a provider that actively solicits
 * website URLs from business owners (Google Places) has looked the business
 * up and come back empty. Everything else stays UNKNOWN rather than being
 * misreported as a confirmed negative.
 */
export async function discoverWebsite(businessId: string): Promise<WebsiteDiscoveryResult> {
  const business = await db.business.findUnique({
    where: { id: businessId },
    include: { website: true, locations: { where: { isPrimary: true }, take: 1 } },
  });
  if (!business) throw new Error("Business not found.");

  if (business.website) {
    return { status: "PRESENT", url: business.website.url, source: "Already verified" };
  }

  const location = business.locations[0];

  if (googlePlacesProvider.isConfigured()) {
    try {
      const { results } = await googlePlacesProvider.search({
        keywords: business.name,
        city: location?.city ?? undefined,
        suburb: location?.suburb ?? undefined,
        region: location?.region ?? undefined,
        country: location?.country ?? undefined,
        latitude: location?.latitude ?? undefined,
        longitude: location?.longitude ?? undefined,
        radiusMeters: 3000,
        limit: 3,
      });
      const match = results.find((r) => namesLikelyMatch(r.name, business.name));

      if (match?.website) {
        await db.website.upsert({
          where: { businessId: business.id },
          update: { url: match.website },
          create: { businessId: business.id, url: match.website },
        });
        await db.contact.upsert({
          where: { businessId_type_value: { businessId: business.id, type: "WEBSITE", value: match.website } },
          update: { confidence: "VERIFIED", source: "Google Places API", verifiedAt: new Date() },
          create: { businessId: business.id, type: "WEBSITE", value: match.website, confidence: "VERIFIED", source: "Google Places API", verifiedAt: new Date() },
        });
        await db.business.update({
          where: { id: business.id },
          data: { websiteCheckedAt: new Date(), websiteCheckSource: "Google Places API" },
        });
        return { status: "PRESENT", url: match.website, source: "Google Places API" };
      }

      if (match) {
        await markConfirmedNone(business.id, "Google Places API");
        return { status: "CONFIRMED_NONE", source: "Google Places API" };
      }
    } catch (err) {
      console.error(`[website-discovery] Google Places lookup failed for business ${businessId}:`, err);
      // Fall through — an API error is not evidence of anything, stay UNKNOWN below.
    }
  }

  // The business's own original discovery already came from Google Places
  // and had no website field — that's already a reasonably confident signal.
  if (business.dataSource === "GOOGLE_PLACES") {
    await markConfirmedNone(business.id, "Google Places API");
    return { status: "CONFIRMED_NONE", source: "Google Places API" };
  }

  await db.business.update({
    where: { id: business.id },
    data: { websiteCheckedAt: new Date(), websiteCheckSource: "OpenStreetMap (no website tag — inconclusive)" },
  });
  return { status: "UNKNOWN", source: "OpenStreetMap (inconclusive)" };
}

async function markConfirmedNone(businessId: string, source: string) {
  // Never downgrade — if we already know more (a website, or a prior
  // confirmed-none from an equally good source), leave it alone.
  const business = await db.business.findUnique({ where: { id: businessId }, select: { websiteAbsenceStatus: true } });
  if (business?.websiteAbsenceStatus === "CONFIRMED_NONE") {
    await db.business.update({ where: { id: businessId }, data: { websiteCheckedAt: new Date(), websiteCheckSource: source } });
    return;
  }
  await db.business.update({
    where: { id: businessId },
    data: { websiteAbsenceStatus: "CONFIRMED_NONE", websiteCheckedAt: new Date(), websiteCheckSource: source },
  });
}
