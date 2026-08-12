import type { LeadQuality, LeadConfidence, WebsiteAbsenceStatus, ContactType } from "@prisma/client";
import type { AuditResult } from "@/lib/services/website-auditor";

export interface ScoreBreakdownItem {
  label: string;
  points: number;
}

export interface ScoreCategory {
  label: string;
  max: number;
  score: number;
  items: ScoreBreakdownItem[];
}

export interface ScoreBreakdown {
  websiteNeed: ScoreCategory;
  businessStrength: ScoreCategory;
  conversionOpportunity: ScoreCategory;
  contactability: ScoreCategory;
  dataConfidence: ScoreCategory;
}

export interface ScoringInput {
  hasWebsite: boolean;
  websiteAbsenceStatus: WebsiteAbsenceStatus;
  rating?: number | null;
  reviewCount?: number | null;
  contacts: { type: ContactType }[];
  audit?: AuditResult | null;
  businessDataFresh: boolean; // lastCheckedAt within a reasonable window
}

export interface ScoringOutput {
  score: number;
  quality: LeadQuality;
  confidence: LeadConfidence;
  reasons: string[];
  breakdown: ScoreBreakdown;
}

function qualityFromScore(score: number): LeadQuality {
  if (score >= 80) return "HOT";
  if (score >= 60) return "STRONG";
  if (score >= 35) return "MEDIUM";
  return "LOW";
}

function cap(category: ScoreCategory): ScoreCategory {
  return { ...category, score: Math.max(0, Math.min(category.max, category.score)) };
}

/**
 * How attractive is this business as a *client for a new website* — not
 * simply "how bad is their current website." A strong, busy business with a
 * mediocre site can be a better lead than a quiet business with a terrible
 * one. Five independently-capped categories (Website Need / Business
 * Strength / Conversion Opportunity / Contactability / Data Confidence) sum
 * to a natural 0-100 spread. Missing data always contributes 0 to a
 * category — never a penalty — and instead lowers the separately-reported
 * confidence level, so an incomplete profile can't masquerade as either a
 * terrible or a perfect lead.
 */
export function computeOpportunityScore(input: ScoringInput): ScoringOutput {
  // ---- 1. Website Need (0-40) ----
  const websiteNeed: ScoreCategory = { label: "Website Need", max: 40, score: 0, items: [] };
  const a = input.audit;

  if (!input.hasWebsite) {
    if (input.websiteAbsenceStatus === "CONFIRMED_NONE") {
      websiteNeed.score += 36;
      websiteNeed.items.push({ label: "No website found — losing every customer who searches online before calling", points: 36 });
    }
    // websiteAbsenceStatus === UNKNOWN contributes nothing here — we don't
    // know enough to claim a website-related need. Confidence reflects that instead.
  } else if (a) {
    if (a.hasSsl === false) {
      websiteNeed.score += 4;
      websiteNeed.items.push({ label: "Website runs on HTTP, not HTTPS", points: 4 });
    }
    if (a.hasViewportMeta === false) {
      websiteNeed.score += 6;
      websiteNeed.items.push({ label: "Not mobile-responsive — most local searches happen on a phone", points: 6 });
    }
    if (a.performanceScore !== null && a.performanceScore < 50) {
      websiteNeed.score += 6;
      websiteNeed.items.push({ label: `Poor page performance (${a.performanceScore}/100)`, points: 6 });
    } else if (a.performanceScore !== null && a.performanceScore < 75) {
      websiteNeed.score += 3;
      websiteNeed.items.push({ label: `Middling page performance (${a.performanceScore}/100)`, points: 3 });
    }
    const issueText = a.issues.map((i) => i.message.toLowerCase());
    const hasIssue = (needle: string) => issueText.some((m) => m.includes(needle));

    if (hasIssue("seo") || (a.seoScore !== null && a.seoScore < 50)) {
      websiteNeed.score += 4;
      websiteNeed.items.push({ label: "Weak SEO metadata", points: 4 });
    }
    if (hasIssue("call-to-action")) {
      websiteNeed.score += 5;
      websiteNeed.items.push({ label: "No clear call-to-action for visitors", points: 5 });
    }
    if (hasIssue("booking")) {
      websiteNeed.score += 4;
      websiteNeed.items.push({ label: "No online booking or appointment-request option", points: 4 });
    }
    if (hasIssue("whatsapp")) {
      websiteNeed.score += 3;
      websiteNeed.items.push({ label: "No WhatsApp contact button", points: 3 });
    }
    if (a.designScore < 50) {
      websiteNeed.score += 4;
      websiteNeed.items.push({ label: "Design reads as dated compared to modern competitors", points: 4 });
    }
    if (a.issues.some((i) => i.category === "availability" && i.severity === "high")) {
      websiteNeed.score += 6;
      websiteNeed.items.push({ label: "Website is currently unreachable or broken", points: 6 });
    }
  } else if (input.hasWebsite && !a) {
    // A website exists but hasn't been audited yet — genuinely unknown, not
    // "confirmed excellent." A small neutral placeholder (never a full
    // penalty) keeps the score from reading as a false 100% clean bill of
    // health; confidence is what actually flags the missing data.
    websiteNeed.score += 5;
    websiteNeed.items.push({ label: "Website not yet audited — provisional estimate until checked", points: 5 });
  }

  // ---- 2. Business Strength (0-25) ----
  const businessStrength: ScoreCategory = { label: "Business Strength", max: 25, score: 0, items: [] };
  const { rating, reviewCount } = input;
  if (rating != null && reviewCount != null) {
    if (rating >= 4.5 && reviewCount >= 100) {
      businessStrength.score += 25;
      businessStrength.items.push({ label: `${rating.toFixed(1)}★ across ${reviewCount} reviews — exceptional, established reputation`, points: 25 });
    } else if (rating >= 4.5 && reviewCount >= 50) {
      businessStrength.score += 20;
      businessStrength.items.push({ label: `${rating.toFixed(1)}★ across ${reviewCount} reviews — strong offline reputation`, points: 20 });
    } else if (rating >= 4.0 && reviewCount >= 20) {
      businessStrength.score += 15;
      businessStrength.items.push({ label: `${rating.toFixed(1)}★ across ${reviewCount} reviews — solid local reputation`, points: 15 });
    } else if (rating >= 4.0) {
      businessStrength.score += 10;
      businessStrength.items.push({ label: `${rating.toFixed(1)}★ rating, review count still building (${reviewCount})`, points: 10 });
    } else if (rating >= 3.5) {
      businessStrength.score += 6;
      businessStrength.items.push({ label: `${rating.toFixed(1)}★ rating across ${reviewCount} reviews`, points: 6 });
    } else {
      businessStrength.score += 3;
      businessStrength.items.push({ label: `${rating.toFixed(1)}★ rating — some evidence of an active, operating business`, points: 3 });
    }
  }
  // rating/reviewCount unknown: 0 here, not a penalty.

  // ---- 3. Conversion Opportunity (0-20) ----
  const conversionOpportunity: ScoreCategory = { label: "Conversion Opportunity", max: 20, score: 0, items: [] };
  if (a) {
    const issueText = a.issues.map((i) => i.message.toLowerCase());
    const hasIssue = (needle: string) => issueText.some((m) => m.includes(needle));

    if (hasIssue("booking")) {
      conversionOpportunity.score += 5;
      conversionOpportunity.items.push({ label: "No booking or quote-request flow", points: 5 });
    }
    if (hasIssue("call-to-action")) {
      conversionOpportunity.score += 5;
      conversionOpportunity.items.push({ label: "Weak or missing primary call-to-action", points: 5 });
    }
    if (hasIssue("whatsapp")) {
      conversionOpportunity.score += 4;
      conversionOpportunity.items.push({ label: "No WhatsApp conversion channel", points: 4 });
    }
    if (hasIssue("google maps")) {
      conversionOpportunity.score += 3;
      conversionOpportunity.items.push({ label: "No embedded map/location integration", points: 3 });
    }
    if (hasIssue("contact form") || hasIssue("phone link")) {
      conversionOpportunity.score += 3;
      conversionOpportunity.items.push({ label: "No contact form, phone link, or email link on the site", points: 3 });
    }
  } else if (!input.hasWebsite && input.websiteAbsenceStatus === "CONFIRMED_NONE") {
    // No website at all means zero conversion path exists yet.
    conversionOpportunity.score += 16;
    conversionOpportunity.items.push({ label: "No website means no online conversion path at all", points: 16 });
  }

  // ---- 4. Contactability (0-10) ----
  const contactability: ScoreCategory = { label: "Contactability", max: 10, score: 0, items: [] };
  const types = new Set(input.contacts.map((c) => c.type));
  if (types.has("PHONE")) {
    contactability.score += 5;
    contactability.items.push({ label: "Public phone number available", points: 5 });
  }
  if (types.has("EMAIL")) {
    contactability.score += 2;
    contactability.items.push({ label: "Public email available", points: 2 });
  }
  if (types.has("WHATSAPP")) {
    contactability.score += 1;
    contactability.items.push({ label: "WhatsApp contact available", points: 1 });
  }
  if (types.has("INSTAGRAM") || types.has("FACEBOOK") || types.has("LINKEDIN") || types.has("TWITTER")) {
    contactability.score += 2;
    contactability.items.push({ label: "Social profile available", points: 2 });
  }

  // ---- 5. Data Confidence (0-5) ----
  const dataConfidence: ScoreCategory = { label: "Data Confidence", max: 5, score: 0, items: [] };
  let knownSignals = 0;
  if (input.businessDataFresh) {
    dataConfidence.score += 1;
    knownSignals += 1;
  }
  const websiteResolved = input.hasWebsite || input.websiteAbsenceStatus === "CONFIRMED_NONE";
  if (websiteResolved) {
    dataConfidence.score += 1;
    knownSignals += 1;
  }
  if (input.hasWebsite && a) {
    dataConfidence.score += 1;
    knownSignals += 1;
  } else if (!input.hasWebsite && input.websiteAbsenceStatus === "CONFIRMED_NONE") {
    // Confirmed no website means there's genuinely nothing to audit — not a data gap.
    knownSignals += 1;
  }
  // hasWebsite && !audit, or !hasWebsite && UNKNOWN: a real, uncounted gap.
  if (rating != null && reviewCount != null) {
    dataConfidence.score += 1;
    knownSignals += 1;
  }
  if (types.has("PHONE") || types.has("EMAIL")) {
    dataConfidence.score += 1;
    knownSignals += 1;
  }
  if (dataConfidence.score > 0) {
    dataConfidence.items.push({ label: `${dataConfidence.score} of ${dataConfidence.max} data signals verified and current`, points: dataConfidence.score });
  }

  // Business Strength is meant to amplify a *real* opportunity ("strong
  // business + weak site = great lead"), not stand alone as a flat bonus for
  // being well-reviewed. A business whose site is confirmed to already be in
  // good shape (real detected need is ~0) isn't a good website-dev lead no
  // matter how many reviews it has — so strength only counts in full once
  // some genuine need has actually been demonstrated. When need is simply
  // *unknown* (unaudited site, unresolved website presence) this scaling is
  // skipped entirely — see item 14: unknown must never be read as "good."
  const needIsKnown = (input.hasWebsite && Boolean(a)) || (!input.hasWebsite && input.websiteAbsenceStatus === "CONFIRMED_NONE");
  const demonstratedNeed = websiteNeed.score + conversionOpportunity.score;
  if (needIsKnown) {
    if (demonstratedNeed === 0) {
      businessStrength.score = Math.round(businessStrength.score * 0.2);
    } else if (demonstratedNeed < 10) {
      businessStrength.score = Math.round(businessStrength.score * 0.6);
    }
  }

  const categories = {
    websiteNeed: cap(websiteNeed),
    businessStrength: cap(businessStrength),
    conversionOpportunity: cap(conversionOpportunity),
    contactability: cap(contactability),
    dataConfidence: cap(dataConfidence),
  };

  const score = Math.max(
    0,
    Math.min(
      100,
      Math.round(
        categories.websiteNeed.score +
          categories.businessStrength.score +
          categories.conversionOpportunity.score +
          categories.contactability.score +
          categories.dataConfidence.score,
      ),
    ),
  );

  const confidence: LeadConfidence = knownSignals >= 5 ? "HIGH" : knownSignals >= 3 ? "MEDIUM" : "LOW";

  const reasons = [
    ...categories.businessStrength.items,
    ...categories.websiteNeed.items,
    ...categories.conversionOpportunity.items,
    ...categories.contactability.items,
  ]
    .sort((x, y) => y.points - x.points)
    .slice(0, 8)
    .map((i) => i.label);

  if (!input.hasWebsite && input.websiteAbsenceStatus === "UNKNOWN") {
    reasons.unshift("Website status hasn't been verified yet — check before assuming there isn't one");
  }

  return { score, quality: qualityFromScore(score), confidence, reasons, breakdown: categories };
}
