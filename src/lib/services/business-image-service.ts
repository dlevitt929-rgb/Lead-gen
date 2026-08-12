import type { BusinessPhotoRef } from "@/lib/providers/types";
import type { WebsiteAsset } from "@/lib/services/website-concept-types";

// Real image sourcing with mandatory provenance. Google Places photo refs
// (captured by google-places-provider) are proxied through our own
// /api/images/places-photo route so the API key never reaches client HTML —
// see that route for why. When no real photos exist for a business, we
// generate clearly-labeled placeholder graphics; a placeholder is NEVER
// presented as if it were a real photo of the business.

function placeholderAsset(id: string, categoryPrimary: string, seed: number): WebsiteAsset {
  const hue = (seed * 47) % 360;
  const label = categoryPrimary.replace(/_/g, " ");
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="800" height="600" viewBox="0 0 800 600">
    <rect width="800" height="600" fill="hsl(${hue}, 35%, 88%)"/>
    <rect width="800" height="600" fill="none" stroke="hsl(${hue}, 35%, 70%)" stroke-width="4"/>
    <text x="400" y="290" font-family="sans-serif" font-size="28" fill="hsl(${hue}, 25%, 40%)" text-anchor="middle">Image placeholder</text>
    <text x="400" y="330" font-family="sans-serif" font-size="18" fill="hsl(${hue}, 20%, 45%)" text-anchor="middle" text-transform="capitalize">${label}</text>
  </svg>`;
  const url = `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
  return {
    id,
    type: "image",
    url,
    altText: `Placeholder image — no real photo available for this ${label} business`,
    source: "placeholder",
    provenanceLabel: "Placeholder — replace with a real photo of the business before sending to a client.",
    attribution: null,
  };
}

export function buildBusinessImages(params: {
  businessId: string;
  businessName: string;
  categoryPrimary: string;
  photos: BusinessPhotoRef[] | null | undefined;
  count?: number;
}): WebsiteAsset[] {
  const count = params.count ?? 4;

  if (params.photos && params.photos.length > 0) {
    return params.photos.slice(0, count).map((photo, i) => ({
      id: `photo-${i}`,
      type: "image" as const,
      url: `/api/images/places-photo?ref=${encodeURIComponent(photo.photoReference)}&w=1200`,
      altText: `Real photo of ${params.businessName}`,
      source: "google_places_photo" as const,
      provenanceLabel: "Real photo from Google Business Profile.",
      attribution: photo.attributions[0] ?? null,
    }));
  }

  return Array.from({ length: Math.min(count, 3) }, (_, i) => placeholderAsset(`placeholder-${i}`, params.categoryPrimary, i + 1));
}
