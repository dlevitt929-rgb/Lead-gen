// Lead provider abstraction — every real-business data source (Google Places,
// OpenStreetMap, and any future provider) implements this same interface so
// the rest of the app never depends on a specific vendor.

export interface BusinessSearchParams {
  country?: string;
  region?: string; // province / state
  city?: string;
  suburb?: string;
  /** Free-text location fallback when structured fields aren't available (e.g. "Green Point, Cape Town"). */
  locationText?: string;
  latitude?: number;
  longitude?: number;
  radiusMeters?: number;
  category?: string;
  keywords?: string;
  limit?: number;
}

export type DataSourceId = "GOOGLE_PLACES" | "OPENSTREETMAP";

export interface RawBusinessResult {
  dataSource: DataSourceId;
  sourcePlaceId: string;
  sourceUrl?: string;
  name: string;
  categoryPrimary: string;
  categories: string[];
  description?: string;
  rating?: number;
  reviewCount?: number;
  phone?: string;
  website?: string;
  googleMapsUrl?: string;
  addressFormatted?: string;
  country?: string;
  region?: string;
  city?: string;
  suburb?: string;
  postalCode?: string;
  latitude?: number;
  longitude?: number;
  openingHours?: string[];
  socialLinks?: { type: "INSTAGRAM" | "FACEBOOK" | "LINKEDIN" | "TWITTER"; url: string }[];
}

export interface LeadProviderSearchResult {
  results: RawBusinessResult[];
  warning?: string;
}

export interface LeadProvider {
  id: DataSourceId;
  displayName: string;
  requiresApiKey: boolean;
  isConfigured(): boolean;
  search(params: BusinessSearchParams): Promise<LeadProviderSearchResult>;
  /** Re-fetches a single business by the ID this provider originally gave it, for freshness refresh. Returns null if it can no longer be found. */
  refreshOne?(sourcePlaceId: string): Promise<RawBusinessResult | null>;
}

export class ProviderNotConfiguredError extends Error {
  constructor(providerName: string, envVar: string) {
    super(`${providerName} is not configured. Set ${envVar} in your environment to enable it.`);
    this.name = "ProviderNotConfiguredError";
  }
}
