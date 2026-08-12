import { describe, it, expect } from "vitest";
import { computeOpportunityScore, type ScoringInput } from "@/lib/services/lead-scoring";
import type { AuditResult } from "@/lib/services/website-auditor";

function baseInput(overrides: Partial<ScoringInput> = {}): ScoringInput {
  return {
    hasWebsite: false,
    websiteAbsenceStatus: "UNKNOWN",
    rating: null,
    reviewCount: null,
    contacts: [],
    audit: null,
    businessDataFresh: true,
    ...overrides,
  };
}

function poorAudit(overrides: Partial<AuditResult> = {}): AuditResult {
  return {
    source: "heuristic",
    hasSsl: true,
    hasViewportMeta: false,
    performanceScore: 25,
    mobileScore: 25,
    seoScore: 40,
    accessibilityScore: 50,
    designScore: 25,
    conversionScore: 20,
    loadTimeMs: 6000,
    issues: [
      { category: "mobile", severity: "high", message: "No responsive viewport meta tag found — the site likely does not adapt to mobile screens." },
      { category: "performance", severity: "high", message: "Page took roughly 6.0s to respond — visitors likely abandon before it loads." },
      { category: "conversion", severity: "medium", message: "No online booking or appointment-request functionality detected." },
      { category: "conversion", severity: "high", message: "No clear call-to-action button found on the page." },
      { category: "conversion", severity: "low", message: "No WhatsApp click-to-chat button — a high-converting channel for South African customers." },
    ],
    summary: "",
    ...overrides,
  };
}

function excellentAudit(overrides: Partial<AuditResult> = {}): AuditResult {
  return {
    source: "pagespeed",
    hasSsl: true,
    hasViewportMeta: true,
    performanceScore: 92,
    mobileScore: 92,
    seoScore: 88,
    accessibilityScore: 90,
    designScore: 85,
    conversionScore: 90,
    loadTimeMs: 900,
    issues: [],
    summary: "",
    ...overrides,
  };
}

describe("computeOpportunityScore", () => {
  it("Lead A: exceptional business, confirmed no website -> very high score, high confidence", () => {
    const result = computeOpportunityScore(
      baseInput({
        hasWebsite: false,
        websiteAbsenceStatus: "CONFIRMED_NONE",
        rating: 4.9,
        reviewCount: 500,
        contacts: [{ type: "PHONE" }],
      }),
    );
    expect(result.score).toBeGreaterThanOrEqual(80);
    expect(result.quality).toBe("HOT");
    expect(result.confidence).toBe("HIGH");
  });

  it("Lead B: strong business, very poor existing website -> high score", () => {
    const result = computeOpportunityScore(
      baseInput({
        hasWebsite: true,
        rating: 4.8,
        reviewCount: 200,
        contacts: [{ type: "PHONE" }],
        audit: poorAudit(),
      }),
    );
    expect(result.score).toBeGreaterThanOrEqual(65);
    expect(["STRONG", "HOT"]).toContain(result.quality);
  });

  it("Lead C: strong business, excellent modern website -> low score despite the reputation", () => {
    const result = computeOpportunityScore(
      baseInput({
        hasWebsite: true,
        rating: 4.8,
        reviewCount: 300,
        contacts: [{ type: "PHONE" }, { type: "EMAIL" }],
        audit: excellentAudit(),
      }),
    );
    expect(result.score).toBeLessThan(35);
    expect(result.quality).toBe("LOW");
  });

  it("Lead D: weak business signals, confirmed no website -> moderate score, not automatically maxed", () => {
    const result = computeOpportunityScore(
      baseInput({
        hasWebsite: false,
        websiteAbsenceStatus: "CONFIRMED_NONE",
        rating: 3.2,
        reviewCount: 3,
        contacts: [],
      }),
    );
    expect(result.score).toBeLessThan(80); // must not behave like Lead A
    expect(result.score).toBeGreaterThan(0);
  });

  it("Lead E: strong business, audit unavailable -> reasonable provisional score, not near-zero, lower confidence than a fully-known lead", () => {
    const known = computeOpportunityScore(
      baseInput({ hasWebsite: false, websiteAbsenceStatus: "CONFIRMED_NONE", rating: 4.8, reviewCount: 300, contacts: [{ type: "PHONE" }] }),
    );
    const unaudited = computeOpportunityScore(
      baseInput({ hasWebsite: true, rating: 4.8, reviewCount: 300, contacts: [{ type: "PHONE" }], audit: null }),
    );
    expect(unaudited.score).toBeGreaterThan(15); // nowhere near the old "2/100" bug
    expect(unaudited.confidence).not.toBe("HIGH");
    expect(known.confidence).toBe("HIGH");
  });

  it("Lead F: missing most data -> low confidence rather than a fake confident low score", () => {
    const result = computeOpportunityScore(baseInput());
    expect(result.confidence).toBe("LOW");
  });

  it("Lead G: business record must never claim 'no website' once a website is known", () => {
    const result = computeOpportunityScore(
      baseInput({ hasWebsite: true, rating: 4.5, reviewCount: 80, contacts: [{ type: "PHONE" }], audit: poorAudit() }),
    );
    expect(result.reasons.some((r) => r.toLowerCase().includes("no website found"))).toBe(false);
  });

  it("never applies the confirmed-no-website bonus when status is merely UNKNOWN", () => {
    const result = computeOpportunityScore(baseInput({ hasWebsite: false, websiteAbsenceStatus: "UNKNOWN", rating: 4.8, reviewCount: 300 }));
    expect(result.breakdown.websiteNeed.score).toBe(0);
    expect(result.breakdown.conversionOpportunity.score).toBe(0);
  });

  it("regression: does not collapse to the old 2/22 clustering for sparse OpenStreetMap-style data", () => {
    // Old bug: rating/reviews absent (OSM never has them) + audit not yet
    // run at search time collapsed almost every score to exactly 2 or 22.
    const noPhoneNoWebsite = computeOpportunityScore(
      baseInput({ hasWebsite: false, websiteAbsenceStatus: "UNKNOWN", rating: null, reviewCount: null, contacts: [] }),
    );
    const phoneWithWebsite = computeOpportunityScore(
      baseInput({ hasWebsite: true, rating: null, reviewCount: null, contacts: [{ type: "PHONE" }], audit: null }),
    );
    expect([2, 22]).not.toContain(noPhoneNoWebsite.score);
    expect([2, 22]).not.toContain(phoneWithWebsite.score);
  });

  it("produces a genuinely varied spread of scores across many realistic scenarios", () => {
    const scores = new Set<number>();
    const scenarios: ScoringInput[] = [
      baseInput({ hasWebsite: false, websiteAbsenceStatus: "CONFIRMED_NONE", rating: 4.9, reviewCount: 500, contacts: [{ type: "PHONE" }] }),
      baseInput({ hasWebsite: true, rating: 4.8, reviewCount: 200, contacts: [{ type: "PHONE" }], audit: poorAudit() }),
      baseInput({ hasWebsite: true, rating: 4.8, reviewCount: 300, contacts: [{ type: "PHONE" }, { type: "EMAIL" }], audit: excellentAudit() }),
      baseInput({ hasWebsite: false, websiteAbsenceStatus: "CONFIRMED_NONE", rating: 3.2, reviewCount: 3 }),
      baseInput({ hasWebsite: true, rating: 4.8, reviewCount: 300, contacts: [{ type: "PHONE" }], audit: null }),
      baseInput(),
      baseInput({ hasWebsite: true, rating: 4.2, reviewCount: 40, contacts: [{ type: "PHONE" }, { type: "INSTAGRAM" }], audit: poorAudit({ designScore: 60 }) }),
    ];
    for (const scenario of scenarios) scores.add(computeOpportunityScore(scenario).score);
    expect(scores.size).toBeGreaterThanOrEqual(6);
  });

  it("score is always within 0-100", () => {
    const scenarios: ScoringInput[] = [
      baseInput({ hasWebsite: false, websiteAbsenceStatus: "CONFIRMED_NONE", rating: 5, reviewCount: 10000, contacts: [{ type: "PHONE" }, { type: "EMAIL" }, { type: "WHATSAPP" }, { type: "INSTAGRAM" }] }),
      baseInput(),
    ];
    for (const scenario of scenarios) {
      const result = computeOpportunityScore(scenario);
      expect(result.score).toBeGreaterThanOrEqual(0);
      expect(result.score).toBeLessThanOrEqual(100);
    }
  });
});
