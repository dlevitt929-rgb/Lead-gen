import type { BusinessSearchParams, LeadProvider, LeadProviderSearchResult, RawBusinessResult } from "./types";
import { findCategory } from "./categories";

// OpenStreetMap-backed provider. No API key required — this is what makes
// LeadForge usable out of the box. Overpass serves the raw business data,
// Nominatim (also OSM) resolves place names typed into the search form into
// coordinates. Both are free public services with fair-use rate limits, so
// requests are kept minimal and always send a descriptive User-Agent as their
// usage policies require.

const OVERPASS_ENDPOINT = "https://overpass-api.de/api/interpreter";
const NOMINATIM_ENDPOINT = "https://nominatim.openstreetmap.org/search";
const USER_AGENT = "LeadForge/1.0 (local business lead research tool)";

interface OverpassElement {
  type: "node" | "way" | "relation";
  id: number;
  lat?: number;
  lon?: number;
  center?: { lat: number; lon: number };
  tags?: Record<string, string>;
}

interface OverpassResponse {
  elements: OverpassElement[];
}

class GeocodeUnavailableError extends Error {}

async function geocode(query: string): Promise<{ lat: number; lng: number } | null> {
  const url = `${NOMINATIM_ENDPOINT}?q=${encodeURIComponent(query)}&format=json&limit=1`;
  let res: Response;
  try {
    res = await fetch(url, { headers: { "User-Agent": USER_AGENT } });
  } catch {
    throw new GeocodeUnavailableError("Could not reach OpenStreetMap's geocoder (Nominatim).");
  }
  if (!res.ok) {
    throw new GeocodeUnavailableError(`OpenStreetMap's geocoder returned HTTP ${res.status}.`);
  }
  let data: { lat: string; lon: string }[];
  try {
    data = await res.json();
  } catch {
    throw new GeocodeUnavailableError("OpenStreetMap's geocoder returned an unexpected response.");
  }
  const first = data[0];
  return first ? { lat: parseFloat(first.lat), lng: parseFloat(first.lon) } : null;
}

function buildOverpassQuery(params: BusinessSearchParams, lat: number, lng: number): string {
  const radius = Math.min(params.radiusMeters ?? 5000, 50000);
  const category = params.category ? findCategory(params.category) : undefined;

  const clauses: string[] = [];
  if (category) {
    for (const tag of category.osmTags) {
      clauses.push(`node["${tag.key}"="${tag.value}"](around:${radius},${lat},${lng});`);
      clauses.push(`way["${tag.key}"="${tag.value}"](around:${radius},${lat},${lng});`);
    }
  } else {
    const term = (params.keywords ?? params.category ?? "").trim();
    const businessKeyRegex = "^(shop|amenity|office|craft|leisure|healthcare|tourism)$";
    if (term) {
      clauses.push(`node["name"~"${escapeRegex(term)}",i][~"${businessKeyRegex}"~"."](around:${radius},${lat},${lng});`);
      clauses.push(`way["name"~"${escapeRegex(term)}",i][~"${businessKeyRegex}"~"."](around:${radius},${lat},${lng});`);
    } else {
      clauses.push(`node[~"${businessKeyRegex}"~"."]["name"](around:${radius},${lat},${lng});`);
      clauses.push(`way[~"${businessKeyRegex}"~"."]["name"](around:${radius},${lat},${lng});`);
    }
  }

  return `[out:json][timeout:25];(${clauses.join("")});out center tags ${Math.min(params.limit ?? 30, 60)};`;
}

function escapeRegex(term: string) {
  return term.replace(/["\\]/g, "");
}

function guessCategory(tags: Record<string, string>): { primary: string; all: string[] } {
  const keys = ["shop", "amenity", "office", "craft", "leisure", "healthcare", "tourism"];
  const all: string[] = [];
  for (const key of keys) {
    const value = tags[key];
    if (value) all.push(value.replace(/_/g, " "));
  }
  return { primary: all[0] ?? "business", all };
}

function toRawResult(el: OverpassElement): RawBusinessResult | null {
  const tags = el.tags ?? {};
  const name = tags.name;
  if (!name) return null;

  const lat = el.lat ?? el.center?.lat;
  const lon = el.lon ?? el.center?.lon;
  const { primary, all } = guessCategory(tags);

  const social: RawBusinessResult["socialLinks"] = [];
  if (tags["contact:facebook"]) social.push({ type: "FACEBOOK", url: tags["contact:facebook"] });
  if (tags["contact:instagram"]) social.push({ type: "INSTAGRAM", url: tags["contact:instagram"] });
  if (tags["contact:linkedin"]) social.push({ type: "LINKEDIN", url: tags["contact:linkedin"] });
  if (tags["contact:twitter"]) social.push({ type: "TWITTER", url: tags["contact:twitter"] });

  const addressParts = [tags["addr:housenumber"], tags["addr:street"]].filter(Boolean).join(" ");

  return {
    dataSource: "OPENSTREETMAP",
    sourcePlaceId: `${el.type}/${el.id}`,
    sourceUrl: `https://www.openstreetmap.org/${el.type}/${el.id}`,
    name,
    categoryPrimary: primary,
    categories: all,
    phone: tags.phone ?? tags["contact:phone"],
    website: tags.website ?? tags["contact:website"],
    addressFormatted: addressParts || undefined,
    country: tags["addr:country"],
    region: tags["addr:state"] || tags["addr:province"],
    city: tags["addr:city"],
    suburb: tags["addr:suburb"],
    postalCode: tags["addr:postcode"],
    latitude: lat,
    longitude: lon,
    openingHours: tags.opening_hours ? [tags.opening_hours] : undefined,
    socialLinks: social.length ? social : undefined,
  };
}

async function resolveOrigin(params: BusinessSearchParams): Promise<{ lat: number; lng: number } | null> {
  if (params.latitude !== undefined && params.longitude !== undefined) {
    return { lat: params.latitude, lng: params.longitude };
  }
  const parts = [params.suburb, params.city, params.region, params.country].filter(Boolean);
  const query = params.locationText || parts.join(", ");
  if (!query) return null;
  return geocode(query);
}

export const osmProvider: LeadProvider = {
  id: "OPENSTREETMAP",
  displayName: "OpenStreetMap",
  requiresApiKey: false,

  isConfigured() {
    return true;
  },

  async search(params: BusinessSearchParams): Promise<LeadProviderSearchResult> {
    const parts = [params.suburb, params.city, params.region, params.country].filter(Boolean);
    const hasLocationInput = (params.latitude !== undefined && params.longitude !== undefined) || Boolean(params.locationText) || parts.length > 0;

    if (!hasLocationInput) {
      return {
        results: [],
        warning: "Enter a city, suburb or region so LeadForge can locate the search area on the map.",
      };
    }

    let origin: { lat: number; lng: number } | null;
    try {
      origin = await resolveOrigin(params);
    } catch (err) {
      return {
        results: [],
        warning: err instanceof GeocodeUnavailableError ? err.message : "OpenStreetMap's geocoder is temporarily unavailable.",
      };
    }
    if (!origin) {
      return { results: [], warning: `Could not find a location matching "${params.locationText || parts.join(", ")}".` };
    }

    const query = buildOverpassQuery(params, origin.lat, origin.lng);

    let res: Response;
    try {
      res = await fetch(OVERPASS_ENDPOINT, {
        method: "POST",
        headers: { "Content-Type": "text/plain", "User-Agent": USER_AGENT },
        body: query,
      });
    } catch {
      return { results: [], warning: "Could not reach OpenStreetMap's Overpass API. Try again shortly." };
    }

    if (!res.ok) {
      return { results: [], warning: `OpenStreetMap search failed (HTTP ${res.status}). It may be rate-limited — try again in a minute.` };
    }

    const data = (await res.json()) as OverpassResponse;
    const results = data.elements.map(toRawResult).filter((r): r is RawBusinessResult => Boolean(r));

    // De-duplicate by name+location (OSM sometimes has both a node and way for the same POI).
    const seen = new Set<string>();
    const deduped = results.filter((r) => {
      const key = `${r.name.toLowerCase()}|${r.latitude?.toFixed(4)}|${r.longitude?.toFixed(4)}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });

    return { results: deduped };
  },
};
