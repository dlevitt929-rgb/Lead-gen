import { recommendFeatures } from "@/lib/services/website-recommendations";

export interface DemoConceptInput {
  businessName: string;
  categoryPrimary: string;
  description?: string | null;
  addressFormatted?: string | null;
  city?: string | null;
  suburb?: string | null;
  phone?: string | null;
  website?: string | null;
  rating?: number | null;
  reviewCount?: number | null;
  openingHours?: string[] | null;
}

export interface DemoConcept {
  isDemoConcept: true;
  hero: { headline: string; subheadline: string; primaryCta: string; secondaryCta: string };
  services: { title: string; description: string }[];
  about: string;
  reviews: { summary: string; rating: number | null; reviewCount: number | null };
  contact: { address: string | null; phone: string | null; hours: string[] | null; whatsapp: string | null };
  recommendedFeatures: string[];
  generatedAt: string;
}

const CATEGORY_SERVICE_HINTS: Record<string, string[]> = {
  plumber: ["Emergency Callouts", "Leak Detection & Repair", "Geyser Installation", "Drain Unblocking"],
  electrician: ["Fault Finding", "Compliance Certificates (COC)", "Rewiring", "Load Shedding Solutions"],
  dentist: ["General Check-ups", "Teeth Whitening", "Fillings & Extractions", "Emergency Dental Care"],
  restaurant: ["Dine-In", "Takeaways", "Private Functions", "Catering"],
  cafe: ["Coffee & Light Meals", "Breakfast", "Takeaway Orders", "Private Bookings"],
  gym: ["Group Classes", "Personal Training", "Open Gym Access", "Nutrition Coaching"],
  hair_salon: ["Cuts & Styling", "Colour", "Treatments", "Bridal Packages"],
  real_estate: ["Property Sales", "Rentals", "Property Valuations", "Property Management"],
  car_repair: ["General Services", "Diagnostics", "Tyres & Brakes", "Roadworthy Certificates"],
  guest_house: ["Standard Rooms", "Self-Catering Units", "Conference Facilities", "Airport Transfers"],
};

function buildServices(categoryId: string, description?: string | null) {
  const normalized = categoryId.toLowerCase().replace(/\s+/g, "_");
  const hints = CATEGORY_SERVICE_HINTS[normalized] ?? [
    "Core Services",
    "Consultations",
    "Custom Requests",
    "Ongoing Support",
  ];
  return hints.map((title) => ({
    title,
    description: description
      ? `Part of what ${title.toLowerCase()} customers can expect — details to confirm with the business.`
      : "Details to be confirmed with the business — this is a placeholder for the concept.",
  }));
}

/**
 * Builds a website *concept* from data we actually have. This never invents
 * facts (testimonials, prices, staff names) — anything not known is left as
 * an explicit placeholder for the sales rep to fill in once the business
 * shares more detail.
 */
export function generateDemoConcept(input: DemoConceptInput): DemoConcept {
  const location = [input.suburb, input.city].filter(Boolean).join(", ");

  const reviewSummary =
    input.rating && input.reviewCount
      ? `Rated ${input.rating.toFixed(1)} out of 5 from ${input.reviewCount} Google reviews.`
      : "No public review data available yet.";

  const whatsappLink = input.phone ? `https://wa.me/${input.phone.replace(/[^0-9]/g, "")}` : null;

  return {
    isDemoConcept: true,
    hero: {
      headline: input.businessName,
      subheadline: input.description || `${input.categoryPrimary} in ${location || "your area"}`,
      primaryCta: input.phone ? "Call Now" : "Get In Touch",
      secondaryCta: whatsappLink ? "Message on WhatsApp" : "Contact Us",
    },
    services: buildServices(input.categoryPrimary, input.description),
    about: input.description
      ? input.description
      : `${input.businessName} is a ${input.categoryPrimary} based in ${location || "the local area"}. [Add a short paragraph about your story, experience and what makes you different.]`,
    reviews: { summary: reviewSummary, rating: input.rating ?? null, reviewCount: input.reviewCount ?? null },
    contact: {
      address: input.addressFormatted ?? null,
      phone: input.phone ?? null,
      hours: input.openingHours ?? null,
      whatsapp: whatsappLink,
    },
    recommendedFeatures: recommendFeatures(input.categoryPrimary).map((f) => f.feature),
    generatedAt: new Date().toISOString(),
  };
}
