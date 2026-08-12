import { describe, it, expect } from "vitest";
import { planWebsite } from "@/lib/services/website-planner";

function basePlanInput(overrides: Partial<Parameters<typeof planWebsite>[0]> = {}) {
  return {
    categoryPrimary: "plumber",
    hasRating: true,
    hasImages: false,
    hasLocation: true,
    hasOpeningHours: true,
    hasContactChannel: true,
    ...overrides,
  };
}

describe("planWebsite", () => {
  it("always includes Home, About, Services and Contact pages", () => {
    const plan = planWebsite(basePlanInput());
    const ids = plan.pages.map((p) => p.id);
    expect(ids).toEqual(expect.arrayContaining(["home", "about", "services", "contact"]));
  });

  it("gives a booking category (dentist) a booking section, not a quote form", () => {
    const plan = planWebsite(basePlanInput({ categoryPrimary: "dentist" }));
    const servicesPage = plan.pages.find((p) => p.id === "services")!;
    const types = servicesPage.sections.map((s) => s.type);
    expect(types).toContain("booking");
    expect(types).not.toContain("quote_form");
  });

  it("gives a quote category (plumber) a quote form, not booking", () => {
    const plan = planWebsite(basePlanInput({ categoryPrimary: "plumber" }));
    const servicesPage = plan.pages.find((p) => p.id === "services")!;
    const types = servicesPage.sections.map((s) => s.type);
    expect(types).toContain("quote_form");
    expect(types).not.toContain("booking");
  });

  it("only adds a gallery page for visual categories that also have real images", () => {
    const withImages = planWebsite(basePlanInput({ categoryPrimary: "restaurant", hasImages: true }));
    expect(withImages.pages.some((p) => p.id === "gallery")).toBe(true);

    const withoutImages = planWebsite(basePlanInput({ categoryPrimary: "restaurant", hasImages: false }));
    expect(withoutImages.pages.some((p) => p.id === "gallery")).toBe(false);

    const nonVisualCategory = planWebsite(basePlanInput({ categoryPrimary: "plumber", hasImages: true }));
    expect(nonVisualCategory.pages.some((p) => p.id === "gallery")).toBe(false);
  });

  it("only adds a reviews section when a rating is known", () => {
    const withRating = planWebsite(basePlanInput({ hasRating: true }));
    const homeWithRating = withRating.pages.find((p) => p.id === "home")!;
    expect(homeWithRating.sections.some((s) => s.type === "reviews")).toBe(true);

    const withoutRating = planWebsite(basePlanInput({ hasRating: false }));
    const homeWithoutRating = withoutRating.pages.find((p) => p.id === "home")!;
    expect(homeWithoutRating.sections.some((s) => s.type === "reviews")).toBe(false);
  });

  it("only adds a map/hours section on the contact page when that data is known", () => {
    const known = planWebsite(basePlanInput({ hasLocation: true, hasOpeningHours: true }));
    const contactKnown = known.pages.find((p) => p.id === "contact")!;
    expect(contactKnown.sections.map((s) => s.type)).toEqual(expect.arrayContaining(["map", "hours"]));

    const unknown = planWebsite(basePlanInput({ hasLocation: false, hasOpeningHours: false }));
    const contactUnknown = unknown.pages.find((p) => p.id === "contact")!;
    expect(contactUnknown.sections.map((s) => s.type)).not.toEqual(expect.arrayContaining(["map", "hours"]));
  });

  it("produces unique section ids across the whole plan", () => {
    const plan = planWebsite(basePlanInput({ categoryPrimary: "restaurant", hasImages: true }));
    const ids = plan.pages.flatMap((p) => p.sections.map((s) => s.id));
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("builds navigation entries for every page", () => {
    const plan = planWebsite(basePlanInput());
    expect(plan.navigation.length).toBe(plan.pages.length);
    expect(plan.navigation.map((n) => n.pageId)).toEqual(plan.pages.map((p) => p.id));
  });
});
