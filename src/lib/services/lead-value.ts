import type { LeadQuality } from "@prisma/client";
import type { PackageConfig } from "@/lib/services/settings-service";

export interface ValueEstimate {
  min: number;
  max: number;
  recurringMin: number | null;
  recurringMax: number | null;
  packageName: string;
}

/**
 * Estimates a commercial value range for a lead from the user's own
 * configured packages — never a fabricated number. Hotter leads (bigger
 * mismatch between demand and website quality) are pointed at higher tiers
 * since they can typically justify a bigger project.
 */
export function estimateLeadValue(quality: LeadQuality, packages: PackageConfig[]): ValueEstimate {
  const sorted = [...packages].sort((a, b) => a.priceOnce - b.priceOnce);
  if (sorted.length === 0) {
    return { min: 0, max: 0, recurringMin: null, recurringMax: null, packageName: "No packages configured" };
  }

  const index =
    quality === "HOT"
      ? sorted.length - 1
      : quality === "STRONG"
        ? Math.min(sorted.length - 1, Math.ceil(sorted.length / 2))
        : quality === "MEDIUM"
          ? Math.floor((sorted.length - 1) / 2)
          : 0;

  const pkg = sorted[index];
  const spread = Math.round(pkg.priceOnce * 0.35);

  return {
    min: Math.max(0, pkg.priceOnce - spread),
    max: pkg.priceOnce + spread,
    recurringMin: pkg.priceRecurring ? Math.round(pkg.priceRecurring * 0.7) : null,
    recurringMax: pkg.priceRecurring ? Math.round(pkg.priceRecurring * 1.3) : null,
    packageName: pkg.name,
  };
}
