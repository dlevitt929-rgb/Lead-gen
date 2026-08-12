import { describe, it, expect } from "vitest";
import { planWebsite } from "@/lib/services/website-planner";
import { generateCopy, type CopyGeneratorInput } from "@/lib/services/website-copy-generator";
import type { WebsiteAsset } from "@/lib/services/website-concept-types";

// No ANTHROPIC_API_KEY / OPENAI_API_KEY is set in the test environment, so
// these exercise the deterministic, fact-grounded fallback path exclusively
// — the same path real users hit until they configure an AI provider.

function input(overrides: Partial<CopyGeneratorInput> = {}): CopyGeneratorInput {
  return {
    businessName: "Cape Town Plumbing Co",
    categoryPrimary: "plumber",
    description: null,
    addressFormatted: null,
    city: "Cape Town",
    suburb: "Green Point",
    phone: null,
    whatsapp: null,
    email: null,
    rating: null,
    reviewCount: null,
    openingHours: null,
    latitude: null,
    longitude: null,
    googleMapsUrl: null,
    ...overrides,
  };
}

const images: WebsiteAsset[] = [];

describe("generateCopy", () => {
  it("never invents a phone number, rating or address that wasn't provided", async () => {
    const plan = planWebsite({
      categoryPrimary: "plumber",
      hasRating: false,
      hasImages: false,
      hasLocation: false,
      hasOpeningHours: false,
      hasContactChannel: false,
    });
    const { pages } = await generateCopy(plan, input(), images);

    const contact = pages.flatMap((p) => p.sections).find((s) => s.type === "contact")!;
    expect((contact.data as { phone: unknown }).phone).toBeNull();
    expect((contact.data as { address: unknown }).address).toBeNull();

    const serialized = JSON.stringify(pages);
    expect(serialized).not.toMatch(/\+27|R\d/); // no fabricated SA phone number or Rand price
  });

  it("records provenance for every fact it does use", async () => {
    const plan = planWebsite({
      categoryPrimary: "dentist",
      hasRating: true,
      hasImages: false,
      hasLocation: false,
      hasOpeningHours: false,
      hasContactChannel: true,
    });
    const { factSources } = await generateCopy(plan, input({ categoryPrimary: "dentist", rating: 4.8, reviewCount: 120, phone: "0211234567" }), images);

    expect(factSources.rating).toBeTruthy();
    expect(factSources.phone).toBeTruthy();
  });

  it("lists unconfirmed facts explicitly instead of silently omitting them", async () => {
    const plan = planWebsite({
      categoryPrimary: "plumber",
      hasRating: false,
      hasImages: false,
      hasLocation: false,
      hasOpeningHours: false,
      hasContactChannel: false,
    });
    const { unknownFacts } = await generateCopy(plan, input(), images);
    expect(unknownFacts.length).toBeGreaterThan(0);
  });

  it("uses the real business description verbatim when one exists, rather than a generic placeholder", async () => {
    const plan = planWebsite({
      categoryPrimary: "cafe",
      hasRating: false,
      hasImages: false,
      hasLocation: false,
      hasOpeningHours: false,
      hasContactChannel: false,
    });
    const description = "A family-run coffee shop serving locally roasted beans since 2015.";
    const { pages } = await generateCopy(plan, input({ categoryPrimary: "cafe", description }), images);
    const about = pages.flatMap((p) => p.sections).find((s) => s.type === "about")!;
    expect((about.data as { body: string }).body).toBe(description);
    expect((about.data as { hasRealDescription: boolean }).hasRealDescription).toBe(true);
  });

  it("only produces FAQ items grounded in confirmed data", async () => {
    const plan = planWebsite({
      categoryPrimary: "plumber",
      hasRating: false,
      hasImages: false,
      hasLocation: false,
      hasOpeningHours: false,
      hasContactChannel: false,
    });
    const { pages } = await generateCopy(plan, input({ city: null, suburb: null }), images);
    const faq = pages.flatMap((p) => p.sections).find((s) => s.type === "faq")!;
    // No hours, no contact channel, no location known — nothing to ground an FAQ answer in.
    expect((faq.data as { items: unknown[] }).items).toEqual([]);
  });
});
