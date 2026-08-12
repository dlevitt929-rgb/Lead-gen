import { WEBSITE_STYLES, type WebsiteStyle, type WebsiteTheme } from "@/lib/services/website-concept-types";

// Deterministic design-system generator. Every style is a complete, coherent
// theme (colors + fonts + radius) — no AI call needed, so regenerating with a
// different style is instant and always available even with no AI provider
// configured.

const THEMES: Record<WebsiteStyle, Omit<WebsiteTheme, "style">> = {
  "modern-minimal": {
    primaryColor: "#111827",
    secondaryColor: "#6366f1",
    accentColor: "#22d3ee",
    backgroundColor: "#ffffff",
    textColor: "#111827",
    fontHeading: "Inter, sans-serif",
    fontBody: "Inter, sans-serif",
    radius: "md",
  },
  "bold-vibrant": {
    primaryColor: "#dc2626",
    secondaryColor: "#f59e0b",
    accentColor: "#facc15",
    backgroundColor: "#fffbeb",
    textColor: "#1c1917",
    fontHeading: "Poppins, sans-serif",
    fontBody: "Inter, sans-serif",
    radius: "lg",
  },
  "classic-professional": {
    primaryColor: "#1e3a5f",
    secondaryColor: "#334155",
    accentColor: "#b08d57",
    backgroundColor: "#f8fafc",
    textColor: "#0f172a",
    fontHeading: "Georgia, serif",
    fontBody: "Georgia, serif",
    radius: "none",
  },
  "warm-friendly": {
    primaryColor: "#c2410c",
    secondaryColor: "#65a30d",
    accentColor: "#fb923c",
    backgroundColor: "#fffaf0",
    textColor: "#292524",
    fontHeading: "Poppins, sans-serif",
    fontBody: "Inter, sans-serif",
    radius: "full",
  },
};

const CATEGORY_DEFAULT_STYLE: Record<string, WebsiteStyle> = {
  dentist: "modern-minimal",
  doctor: "modern-minimal",
  physiotherapist: "modern-minimal",
  lawyer: "classic-professional",
  accountant: "classic-professional",
  real_estate: "classic-professional",
  restaurant: "bold-vibrant",
  cafe: "warm-friendly",
  bakery: "warm-friendly",
  gym: "bold-vibrant",
  hair_salon: "bold-vibrant",
  beauty_salon: "warm-friendly",
  guest_house: "warm-friendly",
  plumber: "modern-minimal",
  electrician: "modern-minimal",
  car_repair: "modern-minimal",
  veterinary: "warm-friendly",
};

export function defaultStyleForCategory(categoryId: string): WebsiteStyle {
  const normalized = categoryId.toLowerCase().replace(/\s+/g, "_");
  return CATEGORY_DEFAULT_STYLE[normalized] ?? "modern-minimal";
}

export function isWebsiteStyle(value: string): value is WebsiteStyle {
  return (WEBSITE_STYLES as readonly string[]).includes(value);
}

export function generateTheme(style: WebsiteStyle): WebsiteTheme {
  return { style, ...THEMES[style] };
}
