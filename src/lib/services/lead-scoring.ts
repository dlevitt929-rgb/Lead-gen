import type { LeadQuality } from "@prisma/client";
import type { AuditResult } from "@/lib/services/website-auditor";
import { overallScoreFromAudit } from "@/lib/services/website-auditor";

export interface ScoringInput {
  hasWebsite: boolean;
  rating?: number | null;
  reviewCount?: number | null;
  hasPhone: boolean;
  audit?: AuditResult | null;
}

export interface ScoringOutput {
  score: number;
  quality: LeadQuality;
  reasons: string[];
}

function qualityFromScore(score: number): LeadQuality {
  if (score >= 80) return "HOT";
  if (score >= 60) return "STRONG";
  if (score >= 35) return "MEDIUM";
  return "LOW";
}

/**
 * Deterministic 0-100 "Website Opportunity Score": how attractive this
 * business is as a website-development prospect. Every point added is tied
 * to a human-readable reason so the score doubles as call talking points.
 */
export function computeOpportunityScore(input: ScoringInput): ScoringOutput {
  let score = 0;
  const reasons: string[] = [];
  const demandReasons: string[] = [];
  const websiteReasons: string[] = [];

  // --- Demand signals: strong offline reputation is what makes a weak
  // website expensive for the business (and a strong pitch for us). ---
  const { rating, reviewCount } = input;
  if (rating && reviewCount) {
    if (rating >= 4.5 && reviewCount >= 50) {
      score += 20;
      demandReasons.push(`${rating.toFixed(1)}★ rating across ${reviewCount} reviews — strong offline reputation`);
    } else if (rating >= 4.0 && reviewCount >= 20) {
      score += 12;
      demandReasons.push(`${rating.toFixed(1)}★ rating across ${reviewCount} reviews — solid local reputation`);
    } else if (rating >= 4.5) {
      score += 8;
      demandReasons.push(`${rating.toFixed(1)}★ rating, though review count (${reviewCount}) is still building`);
    } else {
      demandReasons.push(`${rating.toFixed(1)}★ rating across ${reviewCount} reviews`);
    }
    if (reviewCount >= 100) {
      score += 5;
      demandReasons.push(`${reviewCount} Google reviews shows consistent, ongoing customer volume`);
    }
    if (rating < 3.5) {
      score -= 5;
    }
  } else {
    score -= 3;
  }

  // --- Website signals ---
  if (!input.hasWebsite) {
    score += 35;
    websiteReasons.push("No website found — losing every customer who searches online before calling");
  } else if (input.audit) {
    const a = input.audit;
    if (a.hasSsl === false) {
      score += 10;
      websiteReasons.push("Website runs on HTTP, not HTTPS — browsers actively warn visitors it's \"Not Secure\"");
    }
    if (a.hasViewportMeta === false) {
      score += 12;
      websiteReasons.push("Site is not mobile-responsive — most local searches happen on a phone");
    }
    if (a.performanceScore !== null) {
      if (a.performanceScore < 50) {
        score += 10;
        websiteReasons.push(`Poor page performance (${a.performanceScore}/100) likely drives visitors away before it loads`);
      } else if (a.performanceScore < 75) {
        score += 5;
      }
    }
    if (a.loadTimeMs && a.loadTimeMs > 4000) {
      websiteReasons.push(`Estimated ${(a.loadTimeMs / 1000).toFixed(1)}s load time`);
    }
    if (a.accessibilityScore !== null && a.accessibilityScore < 60) {
      score += 5;
      websiteReasons.push(`Accessibility score of ${a.accessibilityScore}/100 may exclude visitors with disabilities`);
    }
    const issueCategories = new Set(a.issues.map((i) => i.category));
    const findIssue = (cat: string) => a.issues.find((i) => i.category === cat);

    if (a.issues.some((i) => i.message.toLowerCase().includes("booking"))) {
      score += 6;
      websiteReasons.push("No online booking or appointment-request option");
    }
    if (a.issues.some((i) => i.message.toLowerCase().includes("call-to-action"))) {
      score += 8;
      websiteReasons.push("No clear call-to-action for visitors to take the next step");
    }
    if (a.issues.some((i) => i.message.toLowerCase().includes("whatsapp"))) {
      score += 4;
      websiteReasons.push("No WhatsApp contact button — the channel most SA customers actually use");
    }
    if (a.issues.some((i) => i.message.toLowerCase().includes("google maps"))) {
      score += 3;
    }
    if (a.issues.some((i) => i.message.toLowerCase().includes("social media"))) {
      score += 3;
    }
    if (a.issues.some((i) => i.message.toLowerCase().includes("contact form") || i.message.toLowerCase().includes("phone link"))) {
      score += 8;
      websiteReasons.push("No contact form, phone link, or email link anywhere on the site");
    }
    if (issueCategories.has("seo")) {
      const seoIssue = findIssue("seo");
      score += 3;
      if (seoIssue && !websiteReasons.some((r) => r.toLowerCase().includes("seo"))) {
        websiteReasons.push(seoIssue.message.replace(/\.$/, ""));
      }
    }
    if (a.designScore < 50) {
      score += 8;
      websiteReasons.push("Overall design reads as dated compared to modern competitors");
    }

    const overall = overallScoreFromAudit(a);
    if (overall < 40) {
      score += 10;
    }
  }

  if (input.hasPhone) {
    score += 5;
  } else {
    score -= 10;
    reasons.push("No public phone number found yet — verify a contact method before calling");
  }

  score = Math.max(0, Math.min(100, Math.round(score)));

  const orderedReasons = [...demandReasons, ...websiteReasons, ...reasons].slice(0, 8);

  return { score, quality: qualityFromScore(score), reasons: orderedReasons };
}
