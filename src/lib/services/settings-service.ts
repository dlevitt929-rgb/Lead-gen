import { db } from "@/lib/db";
import type { UserSettings } from "@prisma/client";

export interface PackageConfig {
  id: string;
  name: string;
  priceOnce: number;
  priceRecurring: number | null;
  description: string;
}

export const DEFAULT_PACKAGES: PackageConfig[] = [
  {
    id: "starter",
    name: "Starter Website",
    priceOnce: 8000,
    priceRecurring: 500,
    description: "5-page responsive site, contact form, Google Maps + WhatsApp integration.",
  },
  {
    id: "growth",
    name: "Growth Website",
    priceOnce: 15000,
    priceRecurring: 900,
    description: "Everything in Starter plus booking/quote requests, SEO setup, reviews section.",
  },
  {
    id: "premium",
    name: "Premium Website",
    priceOnce: 25000,
    priceRecurring: 1500,
    description: "Custom design, booking system, multi-location support, ongoing content updates.",
  },
];

export async function getOrCreateUserSettings(userId: string): Promise<UserSettings> {
  const existing = await db.userSettings.findUnique({ where: { userId } });
  if (existing) return existing;

  return db.userSettings.create({
    data: {
      userId,
      productName: "LeadForge",
      currency: "ZAR",
      defaultCountry: "South Africa",
      packagesJson: JSON.stringify(DEFAULT_PACKAGES),
    },
  });
}

export function getPackages(settings: UserSettings): PackageConfig[] {
  try {
    const parsed = JSON.parse(
      typeof settings.packagesJson === "string" ? settings.packagesJson : JSON.stringify(settings.packagesJson),
    );
    if (Array.isArray(parsed) && parsed.length > 0) return parsed;
  } catch {
    // fall through to defaults
  }
  return DEFAULT_PACKAGES;
}
