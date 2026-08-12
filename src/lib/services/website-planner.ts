import type { NavigationItem, WebsiteSectionType } from "@/lib/services/website-concept-types";

// Business-type-aware page/section planning. This decides STRUCTURE only
// (which pages exist, which section types they contain, in what order) —
// no copy or facts are produced here (see website-copy-generator). Extends
// the same category recognition used by website-recommendations.ts so a
// "plumber" gets a quote-request flow while a "dentist" gets booking, etc.

export interface WebsitePlanInput {
  categoryPrimary: string;
  hasRating: boolean;
  hasImages: boolean;
  hasLocation: boolean;
  hasOpeningHours: boolean;
  hasContactChannel: boolean; // phone, whatsapp or email
}

export interface PlannedSection {
  id: string;
  type: WebsiteSectionType;
}

export interface PlannedPage {
  id: string;
  slug: string;
  title: string;
  sections: PlannedSection[];
}

export interface WebsitePlan {
  pages: PlannedPage[];
  navigation: NavigationItem[];
}

const BOOKING_CATEGORIES = new Set([
  "dentist",
  "doctor",
  "physiotherapist",
  "veterinary",
  "hair_salon",
  "beauty_salon",
  "gym",
]);

const QUOTE_CATEGORIES = new Set(["plumber", "electrician", "car_repair", "lawyer", "accountant", "real_estate"]);

const GALLERY_CATEGORIES = new Set([
  "restaurant",
  "cafe",
  "bakery",
  "hair_salon",
  "beauty_salon",
  "guest_house",
  "real_estate",
  "gym",
]);

function normalize(categoryId: string) {
  return categoryId.toLowerCase().replace(/\s+/g, "_");
}

export function planWebsite(input: WebsitePlanInput): WebsitePlan {
  let idCounter = 0;
  function sectionId(type: string) {
    idCounter += 1;
    return `${type}-${idCounter}`;
  }

  const category = normalize(input.categoryPrimary);
  const isBooking = BOOKING_CATEGORIES.has(category);
  const isQuote = QUOTE_CATEGORIES.has(category);
  const showGallery = input.hasImages && GALLERY_CATEGORIES.has(category);

  const homeSections: PlannedSection[] = [{ id: sectionId("hero"), type: "hero" }, { id: sectionId("services"), type: "services" }];
  if (input.hasRating) homeSections.push({ id: sectionId("reviews"), type: "reviews" });
  if (showGallery) homeSections.push({ id: sectionId("gallery"), type: "gallery" });
  homeSections.push({ id: sectionId("cta"), type: "cta" });

  const aboutSections: PlannedSection[] = [{ id: sectionId("about"), type: "about" }];
  if (input.hasRating) aboutSections.push({ id: sectionId("stats"), type: "stats" });

  const servicesSections: PlannedSection[] = [{ id: sectionId("services"), type: "services" }];
  if (isBooking) servicesSections.push({ id: sectionId("booking"), type: "booking" });
  else if (isQuote) servicesSections.push({ id: sectionId("quote_form"), type: "quote_form" });
  servicesSections.push({ id: sectionId("faq"), type: "faq" });

  const contactSections: PlannedSection[] = [{ id: sectionId("contact"), type: "contact" }];
  if (input.hasLocation) contactSections.push({ id: sectionId("map"), type: "map" });
  if (input.hasOpeningHours) contactSections.push({ id: sectionId("hours"), type: "hours" });

  const pages: PlannedPage[] = [
    { id: "home", slug: "/", title: "Home", sections: homeSections },
    { id: "about", slug: "/about", title: "About", sections: aboutSections },
    { id: "services", slug: "/services", title: isBooking ? "Services & Booking" : "Services", sections: servicesSections },
  ];

  if (showGallery) {
    pages.push({ id: "gallery", slug: "/gallery", title: "Gallery", sections: [{ id: sectionId("gallery"), type: "gallery" }] });
  }

  pages.push({ id: "contact", slug: "/contact", title: "Contact", sections: contactSections });

  const navigation: NavigationItem[] = pages.map((p) => ({ label: p.title.split(" & ")[0], pageId: p.id }));

  return { pages, navigation };
}
