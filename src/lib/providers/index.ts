import { osmProvider } from "./osm-provider";
import { googlePlacesProvider } from "./google-places-provider";
import type { BusinessSearchParams, DataSourceId, LeadProvider, RawBusinessResult } from "./types";

export const PROVIDERS: LeadProvider[] = [osmProvider, googlePlacesProvider];

export function getProvider(id: DataSourceId): LeadProvider | undefined {
  return PROVIDERS.find((p) => p.id === id);
}

export function getConfiguredProviders(): LeadProvider[] {
  return PROVIDERS.filter((p) => p.isConfigured());
}

export interface MultiProviderSearchResult {
  results: RawBusinessResult[];
  warnings: { provider: string; message: string }[];
  providersUsed: DataSourceId[];
}

/**
 * Searches every configured provider and merges results, de-duplicating
 * businesses that both providers happen to know about (matched on
 * normalized name + rounded coordinates).
 */
export async function searchProviders(
  params: BusinessSearchParams,
  providerIds?: DataSourceId[],
): Promise<MultiProviderSearchResult> {
  const providers = (providerIds ? PROVIDERS.filter((p) => providerIds.includes(p.id)) : getConfiguredProviders());

  if (providers.length === 0) {
    return {
      results: [],
      warnings: [
        {
          provider: "none",
          message:
            "No lead providers are available. OpenStreetMap works with no setup — check your network/firewall, or add GOOGLE_PLACES_API_KEY for richer data.",
        },
      ],
      providersUsed: [],
    };
  }

  const settled = await Promise.allSettled(providers.map((p) => p.search(params)));

  const results: RawBusinessResult[] = [];
  const warnings: { provider: string; message: string }[] = [];
  const providersUsed: DataSourceId[] = [];

  settled.forEach((outcome, i) => {
    const provider = providers[i];
    if (outcome.status === "fulfilled") {
      results.push(...outcome.value.results);
      if (outcome.value.warning) warnings.push({ provider: provider.displayName, message: outcome.value.warning });
      if (outcome.value.results.length > 0) providersUsed.push(provider.id);
    } else {
      warnings.push({ provider: provider.displayName, message: outcome.reason?.message ?? "Search failed." });
    }
  });

  const seen = new Set<string>();
  const deduped = results.filter((r) => {
    const key = `${r.name.trim().toLowerCase()}|${r.latitude?.toFixed(3)}|${r.longitude?.toFixed(3)}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  return { results: deduped, warnings, providersUsed };
}

export * from "./types";
export { CATEGORIES, findCategory } from "./categories";
