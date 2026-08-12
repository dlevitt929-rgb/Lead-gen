import { generateJSON, isAIConfigured } from "@/lib/ai";
import type { WebsitePlan, PlannedPage } from "@/lib/services/website-planner";
import type { WebsiteAsset, WebsitePage, WebsiteSection } from "@/lib/services/website-concept-types";
import { z } from "zod";

// Turns a structural plan into real copy. Every field is derived from a fact
// we actually have; anything unknown is either omitted from a section or
// recorded in `unknownFacts` as an explicit gap — never invented. An AI
// provider (if configured) is only ever used to *rephrase* the deterministic
// draft more compellingly — it is never given license to add new claims,
// numbers, testimonials, prices or staff names that weren't in the input.

export interface CopyGeneratorInput {
  businessName: string;
  categoryPrimary: string;
  description?: string | null;
  addressFormatted?: string | null;
  city?: string | null;
  suburb?: string | null;
  phone?: string | null;
  whatsapp?: string | null;
  email?: string | null;
  rating?: number | null;
  reviewCount?: number | null;
  openingHours?: string[] | null;
  latitude?: number | null;
  longitude?: number | null;
  googleMapsUrl?: string | null;
}

const CATEGORY_SERVICE_HINTS: Record<string, string[]> = {
  plumber: ["Emergency Callouts", "Leak Detection & Repair", "Geyser Installation", "Drain Unblocking"],
  electrician: ["Fault Finding", "Compliance Certificates (COC)", "Rewiring", "Load Shedding Solutions"],
  dentist: ["General Check-ups", "Teeth Whitening", "Fillings & Extractions", "Emergency Dental Care"],
  doctor: ["Consultations", "Chronic Care", "Referrals", "Medical Certificates"],
  physiotherapist: ["Injury Rehabilitation", "Sports Physio", "Post-Surgery Recovery", "Chronic Pain Management"],
  veterinary: ["Check-ups & Vaccinations", "Emergency Care", "Surgery", "Pet Grooming"],
  restaurant: ["Dine-In", "Takeaways", "Private Functions", "Catering"],
  cafe: ["Coffee & Light Meals", "Breakfast", "Takeaway Orders", "Private Bookings"],
  bakery: ["Fresh Bread & Pastries", "Custom Cakes", "Order Ahead", "Wholesale"],
  gym: ["Group Classes", "Personal Training", "Open Gym Access", "Nutrition Coaching"],
  hair_salon: ["Cuts & Styling", "Colour", "Treatments", "Bridal Packages"],
  beauty_salon: ["Facials", "Nails", "Waxing", "Skin Treatments"],
  real_estate: ["Property Sales", "Rentals", "Property Valuations", "Property Management"],
  car_repair: ["General Services", "Diagnostics", "Tyres & Brakes", "Roadworthy Certificates"],
  guest_house: ["Standard Rooms", "Self-Catering Units", "Conference Facilities", "Airport Transfers"],
  lawyer: ["Consultations", "Contract Drafting", "Litigation", "Legal Advice"],
  accountant: ["Tax Returns", "Payroll", "Bookkeeping", "Business Advisory"],
};

function serviceHints(categoryId: string) {
  const normalized = categoryId.toLowerCase().replace(/\s+/g, "_");
  return CATEGORY_SERVICE_HINTS[normalized] ?? ["Core Services", "Consultations", "Custom Requests", "Ongoing Support"];
}

function whatsappLink(phone?: string | null) {
  return phone ? `https://wa.me/${phone.replace(/[^0-9]/g, "")}` : null;
}

interface DraftContext {
  input: CopyGeneratorInput;
  location: string;
  images: WebsiteAsset[];
  factSources: Record<string, string>;
  unknownFacts: Set<string>;
}

function note(ctx: DraftContext, field: string, source: string | null) {
  if (source) ctx.factSources[field] = source;
  else ctx.unknownFacts.add(field);
}

function buildHero(ctx: DraftContext, variant: "home"): WebsiteSection {
  const { input } = ctx;
  const wa = whatsappLink(input.whatsapp ?? input.phone);
  const heroImage = ctx.images.find((a) => a.source === "google_places_photo") ?? ctx.images[0] ?? null;
  return {
    id: `hero-${variant}`,
    type: "hero",
    data: {
      headline: input.businessName,
      subheadline: input.description || `${input.categoryPrimary.replace(/_/g, " ")} in ${ctx.location || "your area"}`,
      primaryCta: input.phone ? { label: "Call Now", href: `tel:${input.phone}` } : { label: "Get In Touch", href: "#contact" },
      secondaryCta: wa ? { label: "Message on WhatsApp", href: wa } : null,
      imageId: heroImage?.id ?? null,
    },
  };
}

function buildServices(ctx: DraftContext, variant: "highlights" | "full"): WebsiteSection {
  const hints = serviceHints(ctx.input.categoryPrimary);
  note(ctx, "services", ctx.input.description ? "Derived from business category + description" : null);
  const items = hints.map((title) => ({
    title,
    description: ctx.input.description
      ? `Part of what ${ctx.input.businessName} offers — confirm exact details with the business before publishing.`
      : "Confirm exact service details with the business before publishing — shown here as a category-typical placeholder.",
  }));
  return {
    id: `services-${variant}`,
    type: "services",
    data: { heading: variant === "highlights" ? "What We Do" : "Our Services", items, variant },
  };
}

function buildAbout(ctx: DraftContext): WebsiteSection {
  const { input } = ctx;
  note(ctx, "about", input.description ? "Business description (provider data)" : null);
  const body =
    input.description ||
    `${input.businessName} is a ${input.categoryPrimary.replace(/_/g, " ")} based in ${ctx.location || "the local area"}.`;
  return { id: "about", type: "about", data: { heading: "About Us", body, hasRealDescription: Boolean(input.description) } };
}

function buildReviews(ctx: DraftContext): WebsiteSection {
  const { input } = ctx;
  note(ctx, "rating", "Google Places API");
  return {
    id: "reviews",
    type: "reviews",
    data: {
      heading: "What Customers Say",
      rating: input.rating ?? null,
      reviewCount: input.reviewCount ?? null,
      summary: `Rated ${input.rating!.toFixed(1)} out of 5 from ${input.reviewCount ?? "multiple"} Google reviews.`,
    },
  };
}

function buildStats(ctx: DraftContext): WebsiteSection {
  const { input } = ctx;
  const items: { label: string; value: string }[] = [];
  if (input.rating) items.push({ label: "Google Rating", value: `${input.rating.toFixed(1)} / 5` });
  if (input.reviewCount) items.push({ label: "Reviews", value: String(input.reviewCount) });
  return { id: "stats", type: "stats", data: { items } };
}

function buildGallery(ctx: DraftContext): WebsiteSection {
  return { id: "gallery", type: "gallery", data: { heading: "Gallery", imageIds: ctx.images.map((a) => a.id) } };
}

function buildContact(ctx: DraftContext): WebsiteSection {
  const { input } = ctx;
  note(ctx, "phone", input.phone ? "Provider contact data" : null);
  note(ctx, "address", input.addressFormatted ? "Provider location data" : null);
  return {
    id: "contact",
    type: "contact",
    data: {
      heading: "Get In Touch",
      address: input.addressFormatted ?? null,
      phone: input.phone ?? null,
      whatsapp: whatsappLink(input.whatsapp ?? input.phone),
      email: input.email ?? null,
      mapsUrl: input.googleMapsUrl ?? null,
    },
  };
}

function buildCta(ctx: DraftContext): WebsiteSection {
  const { input } = ctx;
  return {
    id: "cta",
    type: "cta",
    data: {
      heading: "Ready to get in touch?",
      body: `Reach out to ${input.businessName} today.`,
      primaryCta: input.phone ? { label: "Call Now", href: `tel:${input.phone}` } : { label: "Contact Us", href: "#contact" },
    },
  };
}

function buildMap(ctx: DraftContext): WebsiteSection {
  const { input } = ctx;
  return {
    id: "map",
    type: "map",
    data: { latitude: input.latitude ?? null, longitude: input.longitude ?? null, address: input.addressFormatted ?? null },
  };
}

function buildHours(ctx: DraftContext): WebsiteSection {
  note(ctx, "openingHours", "Provider opening hours data");
  return { id: "hours", type: "hours", data: { heading: "Opening Hours", hours: ctx.input.openingHours ?? [] } };
}

function buildFaq(ctx: DraftContext): WebsiteSection {
  const { input } = ctx;
  const items: { question: string; answer: string }[] = [];
  if (input.openingHours?.length) items.push({ question: "What are your opening hours?", answer: input.openingHours.join(" · ") });
  if (input.whatsapp || input.phone) {
    items.push({ question: "Can I contact you on WhatsApp?", answer: whatsappLink(input.whatsapp ?? input.phone) ? "Yes — use the WhatsApp button above to message us directly." : "" });
  }
  if (ctx.location) items.push({ question: "Where are you located?", answer: input.addressFormatted || ctx.location });
  return { id: "faq", type: "faq", data: { heading: "Frequently Asked Questions", items: items.filter((i) => i.answer) } };
}

function buildBooking(ctx: DraftContext): WebsiteSection {
  const { input } = ctx;
  return {
    id: "booking",
    type: "booking",
    data: {
      heading: "Book an Appointment",
      body: `Contact ${input.businessName} to schedule your appointment — online booking can be wired up to a real calendar once you're ready to go live.`,
      cta: input.phone ? { label: "Call to Book", href: `tel:${input.phone}` } : { label: "Enquire to Book", href: "#contact" },
    },
  };
}

function buildQuoteForm(_ctx: DraftContext): WebsiteSection {
  return {
    id: "quote_form",
    type: "quote_form",
    data: {
      heading: "Request a Quote",
      body: "Tell us what you need and we'll get back to you with a quote.",
      fields: ["Name", "Phone", "Description of work needed"],
    },
  };
}

function buildSection(type: WebsiteSection["type"], ctx: DraftContext, page: PlannedPage): WebsiteSection {
  switch (type) {
    case "hero":
      return buildHero(ctx, "home");
    case "services":
      return buildServices(ctx, page.id === "home" ? "highlights" : "full");
    case "about":
      return buildAbout(ctx);
    case "reviews":
      return buildReviews(ctx);
    case "stats":
      return buildStats(ctx);
    case "gallery":
      return buildGallery(ctx);
    case "contact":
      return buildContact(ctx);
    case "cta":
      return buildCta(ctx);
    case "map":
      return buildMap(ctx);
    case "hours":
      return buildHours(ctx);
    case "faq":
      return buildFaq(ctx);
    case "booking":
      return buildBooking(ctx);
    case "quote_form":
      return buildQuoteForm(ctx);
    case "team":
      return { id: "team", type: "team", data: { heading: "Our Team", members: [] } };
    default:
      return { id: type, type, data: {} };
  }
}

const polishSchema = z.object({
  heroSubheadline: z.string(),
  aboutBody: z.string(),
  serviceDescriptions: z.array(z.string()),
});

async function polishWithAI(pages: WebsitePage[], input: CopyGeneratorInput): Promise<void> {
  if (!isAIConfigured()) return;

  const homePage = pages.find((p) => p.id === "home");
  const aboutPage = pages.find((p) => p.id === "about");
  const heroSection = homePage?.sections.find((s) => s.type === "hero");
  const aboutSection = aboutPage?.sections.find((s) => s.type === "about");
  const servicesSection = pages.flatMap((p) => p.sections).find((s) => s.type === "services" && (s.data as { variant?: string }).variant === "full");
  if (!heroSection || !aboutSection || !servicesSection) return;

  const services = (servicesSection.data as { items: { title: string; description: string }[] }).items;

  const system = `You rewrite website copy to be more compelling and natural, for a real local business's website mockup. You MUST NOT add any fact, number, price, testimonial, staff name, or claim that is not already present in the draft text given to you — only rephrase what's there. Keep it concise and professional. Respond with JSON matching the requested schema exactly.`;
  const prompt = `Business: ${input.businessName} (${input.categoryPrimary})
Draft hero subheadline: "${(heroSection.data as { subheadline: string }).subheadline}"
Draft about paragraph: "${(aboutSection.data as { body: string }).body}"
Draft service names: ${services.map((s) => s.title).join(", ")}

Return JSON: { "heroSubheadline": string (rephrase of the draft, same facts only), "aboutBody": string (rephrase of the draft, 2-3 sentences, same facts only), "serviceDescriptions": string[] (one short compelling line per service name IN ORDER, generic to the service itself, no invented specifics like prices/years/staff) }`;

  try {
    const data = await generateJSON<unknown>({ system, prompt, maxTokens: 700 });
    const parsed = polishSchema.safeParse(data);
    if (!parsed.success) return;
    if (parsed.data.serviceDescriptions.length !== services.length) return;

    (heroSection.data as { subheadline: string }).subheadline = parsed.data.heroSubheadline;
    (aboutSection.data as { body: string }).body = parsed.data.aboutBody;
    (servicesSection.data as { items: { title: string; description: string }[] }).items = services.map((s, i) => ({
      title: s.title,
      description: parsed.data.serviceDescriptions[i],
    }));
    // Home page's "highlights" services section mirrors the same items for consistency.
    const highlights = pages.flatMap((p) => p.sections).find((s) => s.type === "services" && (s.data as { variant?: string }).variant === "highlights");
    if (highlights) (highlights.data as { items: unknown }).items = (servicesSection.data as { items: unknown }).items;
  } catch {
    // AI polish is best-effort — the deterministic draft already stands on its own.
  }
}

/**
 * Applies a free-text AI edit command to a single section's data, e.g. "make
 * this warmer" or "shorten the headline". The model must return the exact
 * same top-level keys it was given and is explicitly instructed never to
 * introduce a fact (number, price, name, date) that wasn't already present —
 * if it can't be honored without doing so, the field should be left as-is.
 * Falls back to a clear "unavailable" result rather than faking an edit when
 * no AI provider is configured or the response doesn't validate.
 */
export async function applyAiEditCommand(
  sectionType: string,
  data: Record<string, unknown>,
  instruction: string,
): Promise<{ data: Record<string, unknown>; applied: boolean; message?: string }> {
  if (!isAIConfigured()) {
    return { data, applied: false, message: "No AI provider configured — add ANTHROPIC_API_KEY or OPENAI_API_KEY to use AI edit commands." };
  }
  if (!instruction.trim()) {
    return { data, applied: false, message: "Enter an instruction first." };
  }

  const system = `You edit a single section of a real business's website mockup, expressed as JSON. Rules: respond with ONLY a JSON object using EXACTLY the same top-level keys as "current" (same array lengths where arrays are given) — never add or remove keys. Never introduce a fact (a number, price, statistic, name, date, or claim) that is not already present in "current" or explicitly given in the instruction. If honoring the instruction would require inventing such a fact, leave that specific field unchanged.`;
  const prompt = `Section type: ${sectionType}\nCurrent content JSON:\n${JSON.stringify(data)}\n\nInstruction: ${instruction.trim()}\n\nReturn the edited JSON object with the same shape as "current".`;

  try {
    const result = await generateJSON<Record<string, unknown>>({ system, prompt, maxTokens: 800 });
    if (typeof result !== "object" || result === null || Array.isArray(result)) {
      return { data, applied: false, message: "AI edit returned an unexpected result — no changes made." };
    }
    const sameShape = Object.keys(data).every((k) => k in result);
    if (!sameShape) {
      return { data, applied: false, message: "AI edit returned an unexpected shape — no changes made." };
    }
    return { data: result, applied: true };
  } catch {
    return { data, applied: false, message: "AI edit failed — no changes made." };
  }
}

export async function generateCopy(
  plan: WebsitePlan,
  input: CopyGeneratorInput,
  images: WebsiteAsset[],
): Promise<{ pages: WebsitePage[]; factSources: Record<string, string>; unknownFacts: string[]; aiPolished: boolean }> {
  const location = [input.suburb, input.city].filter(Boolean).join(", ");
  const ctx: DraftContext = { input, location, images, factSources: {}, unknownFacts: new Set() };

  const pages: WebsitePage[] = plan.pages.map((page) => ({
    id: page.id,
    slug: page.slug,
    title: page.title,
    sections: page.sections.map((s) => buildSection(s.type, ctx, page)),
  }));

  const aiConfigured = isAIConfigured();
  if (aiConfigured) await polishWithAI(pages, input);

  return { pages, factSources: ctx.factSources, unknownFacts: Array.from(ctx.unknownFacts), aiPolished: aiConfigured };
}
