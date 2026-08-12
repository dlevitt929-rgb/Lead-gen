import type { BusinessSearchParams, LeadProvider, LeadProviderSearchResult, RawBusinessResult } from "./types";
import { findCategory } from "./categories";

const BASE = "https://maps.googleapis.com/maps/api/place";
const GEOCODE_BASE = "https://maps.googleapis.com/maps/api/geocode/json";

interface GoogleGeocodeResult {
  results: { geometry: { location: { lat: number; lng: number } }; formatted_address: string }[];
  status: string;
}

interface GooglePlaceSummary {
  place_id: string;
  name: string;
  rating?: number;
  user_ratings_total?: number;
  types?: string[];
  geometry?: { location: { lat: number; lng: number } };
  formatted_address?: string;
  vicinity?: string;
  business_status?: string;
}

interface GooglePlaceDetails {
  place_id: string;
  name: string;
  formatted_address?: string;
  formatted_phone_number?: string;
  international_phone_number?: string;
  website?: string;
  rating?: number;
  user_ratings_total?: number;
  url?: string;
  types?: string[];
  opening_hours?: { weekday_text?: string[] };
  address_components?: { long_name: string; short_name: string; types: string[] }[];
  geometry?: { location: { lat: number; lng: number } };
}

function apiKey() {
  return process.env.GOOGLE_PLACES_API_KEY?.trim();
}

async function geocode(query: string): Promise<{ lat: number; lng: number } | null> {
  const key = apiKey();
  if (!key) return null;
  const url = `${GEOCODE_BASE}?address=${encodeURIComponent(query)}&key=${key}`;
  const res = await fetch(url);
  if (!res.ok) return null;
  const data = (await res.json()) as GoogleGeocodeResult;
  const loc = data.results?.[0]?.geometry?.location;
  return loc ? { lat: loc.lat, lng: loc.lng } : null;
}

function addressComponent(components: GooglePlaceDetails["address_components"], type: string) {
  return components?.find((c) => c.types.includes(type))?.long_name;
}

async function fetchDetails(placeId: string): Promise<GooglePlaceDetails | null> {
  const key = apiKey();
  if (!key) return null;
  const fields = [
    "place_id",
    "name",
    "formatted_address",
    "formatted_phone_number",
    "international_phone_number",
    "website",
    "rating",
    "user_ratings_total",
    "url",
    "types",
    "opening_hours",
    "address_components",
    "geometry",
  ].join(",");
  const url = `${BASE}/details/json?place_id=${placeId}&fields=${fields}&key=${key}`;
  const res = await fetch(url);
  if (!res.ok) return null;
  const data = (await res.json()) as { result?: GooglePlaceDetails; status: string };
  return data.result ?? null;
}

function toRawResult(details: GooglePlaceDetails): RawBusinessResult {
  const categories = (details.types ?? []).filter((t) => !["point_of_interest", "establishment"].includes(t));
  return {
    dataSource: "GOOGLE_PLACES",
    sourcePlaceId: details.place_id,
    sourceUrl: details.url,
    name: details.name,
    categoryPrimary: categories[0]?.replace(/_/g, " ") ?? "business",
    categories: categories.map((c) => c.replace(/_/g, " ")),
    rating: details.rating,
    reviewCount: details.user_ratings_total,
    phone: details.formatted_phone_number ?? details.international_phone_number,
    website: details.website,
    googleMapsUrl: details.url,
    addressFormatted: details.formatted_address,
    country: addressComponent(details.address_components, "country"),
    region: addressComponent(details.address_components, "administrative_area_level_1"),
    city:
      addressComponent(details.address_components, "locality") ??
      addressComponent(details.address_components, "administrative_area_level_2"),
    suburb: addressComponent(details.address_components, "sublocality") ?? addressComponent(details.address_components, "neighborhood"),
    postalCode: addressComponent(details.address_components, "postal_code"),
    latitude: details.geometry?.location.lat,
    longitude: details.geometry?.location.lng,
    openingHours: details.opening_hours?.weekday_text,
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

export const googlePlacesProvider: LeadProvider = {
  id: "GOOGLE_PLACES",
  displayName: "Google Places",
  requiresApiKey: true,

  isConfigured() {
    return Boolean(apiKey());
  },

  async search(params: BusinessSearchParams): Promise<LeadProviderSearchResult> {
    const key = apiKey();
    if (!key) {
      return { results: [], warning: "Google Places is not configured. Add GOOGLE_PLACES_API_KEY to enable it." };
    }

    const limit = Math.min(params.limit ?? 20, 40);
    const category = params.category ? findCategory(params.category) : undefined;
    const origin = await resolveOrigin(params);

    let summaries: GooglePlaceSummary[] = [];

    if (origin) {
      const radius = params.radiusMeters ?? 5000;
      const url = new URL(`${BASE}/nearbysearch/json`);
      url.searchParams.set("location", `${origin.lat},${origin.lng}`);
      url.searchParams.set("radius", String(radius));
      if (category?.googleType) url.searchParams.set("type", category.googleType);
      const keyword = category?.googleKeyword ?? params.keywords ?? params.category;
      if (keyword) url.searchParams.set("keyword", keyword);
      url.searchParams.set("key", key);

      const res = await fetch(url.toString());
      if (!res.ok) return { results: [], warning: `Google Places request failed (HTTP ${res.status}).` };
      const data = (await res.json()) as { results: GooglePlaceSummary[]; status: string; error_message?: string };
      if (data.status !== "OK" && data.status !== "ZERO_RESULTS") {
        return { results: [], warning: data.error_message ?? `Google Places returned status ${data.status}.` };
      }
      summaries = data.results ?? [];
    } else {
      const queryParts = [params.category ?? params.keywords ?? "business", params.suburb, params.city, params.region, params.country].filter(
        Boolean,
      );
      const url = new URL(`${BASE}/textsearch/json`);
      url.searchParams.set("query", queryParts.join(" in "));
      url.searchParams.set("key", key);

      const res = await fetch(url.toString());
      if (!res.ok) return { results: [], warning: `Google Places request failed (HTTP ${res.status}).` };
      const data = (await res.json()) as { results: GooglePlaceSummary[]; status: string; error_message?: string };
      if (data.status !== "OK" && data.status !== "ZERO_RESULTS") {
        return { results: [], warning: data.error_message ?? `Google Places returned status ${data.status}.` };
      }
      summaries = data.results ?? [];
    }

    const trimmed = summaries.slice(0, limit);
    const detailResults = await Promise.all(trimmed.map((s) => fetchDetails(s.place_id)));
    const results = detailResults.filter((d): d is GooglePlaceDetails => Boolean(d)).map(toRawResult);

    return { results };
  },
};
