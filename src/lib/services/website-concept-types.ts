// Structured data model for the Automatic Website Generator.
//
// A WebsiteConcept is a multi-page, multi-section mockup built entirely from
// real business data (Google Places / OpenStreetMap facts, verified contacts,
// audit findings). It never invents facts: anything unknown is either omitted
// or rendered as an explicit, visibly-labeled placeholder — see `factSources`,
// which records provenance for every fact-bearing field so the UI (and the
// sales rep) can always tell what's real vs. a placeholder.

export const WEBSITE_STYLES = ["modern-minimal", "bold-vibrant", "classic-professional", "warm-friendly"] as const;
export type WebsiteStyle = (typeof WEBSITE_STYLES)[number];

export const WEBSITE_STYLE_LABEL: Record<WebsiteStyle, string> = {
  "modern-minimal": "Modern Minimal",
  "bold-vibrant": "Bold & Vibrant",
  "classic-professional": "Classic Professional",
  "warm-friendly": "Warm & Friendly",
};

export interface WebsiteTheme {
  style: WebsiteStyle;
  primaryColor: string;
  secondaryColor: string;
  accentColor: string;
  backgroundColor: string;
  textColor: string;
  fontHeading: string;
  fontBody: string;
  radius: "none" | "sm" | "md" | "lg" | "full";
}

export type WebsiteAssetSource = "google_places_photo" | "placeholder";

export interface WebsiteAsset {
  id: string;
  type: "image";
  url: string;
  altText: string;
  source: WebsiteAssetSource;
  /** Always shown in the UI next to the image — never allowed to imply the image is something it isn't. */
  provenanceLabel: string;
  attribution?: string | null;
}

export type WebsiteSectionType =
  | "hero"
  | "services"
  | "about"
  | "reviews"
  | "gallery"
  | "contact"
  | "cta"
  | "map"
  | "faq"
  | "team"
  | "stats"
  | "booking"
  | "quote_form"
  | "hours";

export interface WebsiteSection {
  id: string;
  type: WebsiteSectionType;
  // Section-specific fields — kept loose (not a discriminated union) so
  // editing/regenerating a section can patch individual keys generically
  // from both the UI and the AI-edit endpoint.
  data: Record<string, unknown>;
}

export interface NavigationItem {
  label: string;
  pageId: string;
}

export interface WebsitePage {
  id: string;
  slug: string;
  title: string;
  sections: WebsiteSection[];
}

export interface WebsiteConcept {
  isWebsiteConcept: true;
  generatorVersion: 3;
  businessName: string;
  categoryPrimary: string;
  theme: WebsiteTheme;
  navigation: NavigationItem[];
  pages: WebsitePage[];
  assets: WebsiteAsset[];
  /** field name -> human-readable provenance, e.g. "rating" -> "Google Places API (checked 12 Aug 2026)" */
  factSources: Record<string, string>;
  /** Facts the generator did not have and therefore left as an explicit placeholder — never fabricated. */
  unknownFacts: string[];
  generatedAt: string;
}
