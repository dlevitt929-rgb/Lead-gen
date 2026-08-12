import * as cheerio from "cheerio";
import type { WebsiteStatus } from "@prisma/client";

export interface AuditIssue {
  category: string;
  severity: "high" | "medium" | "low";
  message: string;
}

export interface AuditResult {
  source: "pagespeed" | "heuristic";
  finalUrl?: string;
  hasSsl: boolean;
  httpStatus?: number;
  title?: string;
  metaDescription?: string;
  hasViewportMeta: boolean;
  technologyGuess?: string;
  performanceScore: number | null;
  mobileScore: number | null;
  seoScore: number | null;
  accessibilityScore: number | null;
  designScore: number; // always heuristic/estimated
  conversionScore: number; // always heuristic/estimated
  loadTimeMs: number | null;
  issues: AuditIssue[];
  summary: string;
  raw?: unknown;
}

const FETCH_TIMEOUT_MS = 12000;

async function timedFetch(url: string, init?: RequestInit): Promise<{ res: Response | null; ms: number; error?: string }> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  const start = Date.now();
  try {
    const res = await fetch(url, { ...init, signal: controller.signal, redirect: "follow" });
    return { res, ms: Date.now() - start };
  } catch (err) {
    return { res: null, ms: Date.now() - start, error: err instanceof Error ? err.message : "Request failed" };
  } finally {
    clearTimeout(timeout);
  }
}

function normalizeUrl(url: string): string {
  if (!/^https?:\/\//i.test(url)) return `https://${url}`;
  return url;
}

const TECH_SIGNATURES: { pattern: RegExp; label: string }[] = [
  { pattern: /wp-content|wordpress/i, label: "WordPress" },
  { pattern: /cdn\.shopify\.com|shopify/i, label: "Shopify" },
  { pattern: /static\.wixstatic\.com|wix\.com/i, label: "Wix" },
  { pattern: /squarespace/i, label: "Squarespace" },
  { pattern: /godaddy/i, label: "GoDaddy Website Builder" },
  { pattern: /webflow/i, label: "Webflow" },
  { pattern: /_next\/static/i, label: "Next.js" },
  { pattern: /react/i, label: "React" },
];

const BOOKING_SIGNATURES = /calendly|simplybook|book(ing)?[-_ ]?(now|appointment|online)|fresha|bookly|schedule[-_ ]?(a|an|your)?[-_ ]?(call|appointment|visit)/i;
const CTA_SIGNATURES = /get a quote|contact us|call now|book now|order now|buy now|get started|request a quote|make a booking|enquire now|whatsapp us/i;
const WHATSAPP_SIGNATURES = /wa\.me\/|api\.whatsapp\.com/i;
const GOOGLE_MAPS_SIGNATURES = /google\.com\/maps|maps\.google|goo\.gl\/maps/i;

function pushIssue(issues: AuditIssue[], category: string, severity: AuditIssue["severity"], message: string) {
  issues.push({ category, severity, message });
}

async function runHeuristicAudit(inputUrl: string): Promise<AuditResult> {
  const url = normalizeUrl(inputUrl);
  const issues: AuditIssue[] = [];

  const { res, ms, error } = await timedFetch(url, {
    headers: { "User-Agent": "Mozilla/5.0 (compatible; LeadForgeAuditBot/1.0; +https://leadforge.app)" },
  });

  if (!res) {
    pushIssue(issues, "availability", "high", `Website did not respond (${error ?? "connection failed"}). It may be down or blocking automated checks.`);
    return {
      source: "heuristic",
      hasSsl: url.startsWith("https://"),
      hasViewportMeta: false,
      performanceScore: null,
      mobileScore: null,
      seoScore: null,
      accessibilityScore: null,
      designScore: 20,
      conversionScore: 20,
      loadTimeMs: null,
      issues,
      summary: "The website could not be reached during the audit. Treat this as a strong opportunity signal, but verify manually before the call.",
    };
  }

  const finalUrl = res.url || url;
  const hasSsl = finalUrl.startsWith("https://");
  if (!hasSsl) {
    pushIssue(issues, "security", "high", "Website is served over HTTP, not HTTPS — browsers flag this as \"Not Secure\".");
  }

  if (!res.ok) {
    pushIssue(issues, "availability", "high", `Website returned an HTTP ${res.status} error.`);
  }

  const html = await res.text().catch(() => "");
  const $ = cheerio.load(html);

  const title = $("title").first().text().trim() || undefined;
  const metaDescription = $('meta[name="description"]').attr("content")?.trim() || undefined;
  const viewport = $('meta[name="viewport"]').attr("content");
  const hasViewportMeta = Boolean(viewport);

  if (!title) {
    pushIssue(issues, "seo", "high", "Page is missing a <title> tag entirely.");
  } else if (title.length < 10 || title.length > 65) {
    pushIssue(issues, "seo", "medium", `Page title is ${title.length < 10 ? "too short" : "too long"} for good SEO ("${title}").`);
  }

  if (!metaDescription) {
    pushIssue(issues, "seo", "medium", "Missing meta description — this is what shows up under the link in Google search results.");
  }

  if (!hasViewportMeta) {
    pushIssue(issues, "mobile", "high", "No responsive viewport meta tag found — the site likely does not adapt to mobile screens.");
  }

  const h1Count = $("h1").length;
  if (h1Count === 0) {
    pushIssue(issues, "structure", "medium", "Page has no <h1> heading, which hurts both SEO and page structure.");
  } else if (h1Count > 1) {
    pushIssue(issues, "structure", "low", `Page has ${h1Count} <h1> tags — should generally have exactly one.`);
  }

  const imgCount = $("img").length;
  const imgMissingAlt = $("img:not([alt]), img[alt='']").length;
  if (imgCount > 0 && imgMissingAlt / imgCount > 0.3) {
    pushIssue(issues, "accessibility", "medium", `${imgMissingAlt} of ${imgCount} images are missing descriptive alt text.`);
  }

  const bodyText = $("body").text();
  const hasBooking = BOOKING_SIGNATURES.test(html);
  const hasCta = CTA_SIGNATURES.test(bodyText) || $("a[class*='btn'], button, a[class*='button']").length > 0;
  const hasWhatsapp = WHATSAPP_SIGNATURES.test(html);
  const hasGoogleMaps = GOOGLE_MAPS_SIGNATURES.test(html);
  const hasForm = $("form").length > 0;
  const hasTel = /tel:/i.test(html);
  const hasMailto = /mailto:/i.test(html);
  const socialLinkCount = $('a[href*="facebook.com"], a[href*="instagram.com"], a[href*="linkedin.com"]').length;

  if (!hasBooking) pushIssue(issues, "conversion", "medium", "No online booking or appointment-request functionality detected.");
  if (!hasCta) pushIssue(issues, "conversion", "high", "No clear call-to-action button found on the page.");
  if (!hasWhatsapp) pushIssue(issues, "conversion", "low", "No WhatsApp click-to-chat button — a high-converting channel for South African customers.");
  if (!hasGoogleMaps) pushIssue(issues, "trust", "low", "No embedded Google Maps location on the site.");
  if (!hasForm && !hasTel && !hasMailto) pushIssue(issues, "conversion", "high", "No contact form, phone link, or email link found anywhere on the page.");
  if (socialLinkCount === 0) pushIssue(issues, "trust", "low", "No links to social media profiles.");

  const tech = TECH_SIGNATURES.find((t) => t.pattern.test(html));

  if (ms > 4000) {
    pushIssue(issues, "performance", "high", `Page took roughly ${(ms / 1000).toFixed(1)}s to respond — visitors likely abandon before it loads.`);
  } else if (ms > 2000) {
    pushIssue(issues, "performance", "medium", `Page took roughly ${(ms / 1000).toFixed(1)}s to respond, slower than the ~1-2s users expect.`);
  }

  // Heuristic sub-scores (0-100), since no Lighthouse data is available here.
  const performanceScore = clampScore(100 - Math.min(80, Math.round(ms / 60)));
  const mobileScore = clampScore(hasViewportMeta ? 78 : 25);
  const seoScore = clampScore(70 - (title ? 0 : 30) - (metaDescription ? 0 : 20) - (h1Count === 0 ? 15 : 0));
  const accessibilityScore = clampScore(85 - (imgCount > 0 ? Math.round((imgMissingAlt / imgCount) * 40) : 0));

  const conversionSignals = [hasBooking, hasCta, hasWhatsapp, hasForm || hasTel || hasMailto, hasGoogleMaps].filter(Boolean).length;
  const conversionScore = clampScore(20 + conversionSignals * 16);
  const designSignals = [hasViewportMeta, Boolean(tech), h1Count === 1, socialLinkCount > 0].filter(Boolean).length;
  const designScore = clampScore(30 + designSignals * 16);

  return {
    source: "heuristic",
    finalUrl,
    hasSsl,
    httpStatus: res.status,
    title,
    metaDescription,
    hasViewportMeta,
    technologyGuess: tech?.label,
    performanceScore,
    mobileScore,
    seoScore,
    accessibilityScore,
    designScore,
    conversionScore,
    loadTimeMs: ms,
    issues,
    summary: buildSummary({ hasSsl, hasViewportMeta, ms, hasCta, hasBooking, hasWhatsapp, issues }),
  };
}

function clampScore(n: number) {
  return Math.max(0, Math.min(100, Math.round(n)));
}

function buildSummary(signals: {
  hasSsl: boolean;
  hasViewportMeta: boolean;
  ms: number;
  hasCta: boolean;
  hasBooking: boolean;
  hasWhatsapp: boolean;
  issues: AuditIssue[];
}) {
  const highIssues = signals.issues.filter((i) => i.severity === "high");
  if (highIssues.length === 0) {
    return "This website covers the fundamentals reasonably well — any pitch here should focus on specific upgrades rather than a full rebuild.";
  }
  const topProblems = highIssues.slice(0, 3).map((i) => i.message.replace(/\.$/, "").toLowerCase());
  return `This business likely has real demand but its website is probably costing it customers. The biggest issues are ${topProblems.join("; ")}.`;
}

interface PageSpeedResponse {
  lighthouseResult?: {
    categories?: {
      performance?: { score: number };
      accessibility?: { score: number };
      seo?: { score: number };
      "best-practices"?: { score: number };
    };
    audits?: Record<string, { numericValue?: number; displayValue?: string }>;
  };
}

async function runPageSpeed(url: string): Promise<Partial<AuditResult> | null> {
  const key = process.env.GOOGLE_PAGESPEED_API_KEY?.trim();
  if (!key) return null;

  const endpoint = new URL("https://www.googleapis.com/pagespeedonline/v5/runPagespeed");
  endpoint.searchParams.set("url", url);
  endpoint.searchParams.set("key", key);
  endpoint.searchParams.set("strategy", "MOBILE");
  for (const cat of ["PERFORMANCE", "ACCESSIBILITY", "SEO", "BEST_PRACTICES"]) {
    endpoint.searchParams.append("category", cat);
  }

  const { res } = await timedFetch(endpoint.toString());
  if (!res || !res.ok) return null;

  const data = (await res.json()) as PageSpeedResponse;
  const categories = data.lighthouseResult?.categories;
  if (!categories) return null;

  const lcp = data.lighthouseResult?.audits?.["largest-contentful-paint"]?.numericValue;

  return {
    source: "pagespeed",
    performanceScore: categories.performance ? Math.round(categories.performance.score * 100) : null,
    mobileScore: categories.performance ? Math.round(categories.performance.score * 100) : null,
    seoScore: categories.seo ? Math.round(categories.seo.score * 100) : null,
    accessibilityScore: categories.accessibility ? Math.round(categories.accessibility.score * 100) : null,
    loadTimeMs: lcp ? Math.round(lcp) : undefined,
    raw: data,
  };
}

export async function auditWebsite(url: string): Promise<AuditResult> {
  const heuristic = await runHeuristicAudit(url);
  const pagespeed = await runPageSpeed(heuristic.finalUrl ?? url).catch(() => null);

  if (!pagespeed) return heuristic;

  const merged: AuditResult = {
    ...heuristic,
    source: "pagespeed",
    performanceScore: pagespeed.performanceScore ?? heuristic.performanceScore,
    mobileScore: pagespeed.mobileScore ?? heuristic.mobileScore,
    seoScore: pagespeed.seoScore ?? heuristic.seoScore,
    accessibilityScore: pagespeed.accessibilityScore ?? heuristic.accessibilityScore,
    loadTimeMs: pagespeed.loadTimeMs ?? heuristic.loadTimeMs,
    raw: pagespeed.raw,
  };

  if (merged.performanceScore !== null && merged.performanceScore < 50) {
    pushIssue(merged.issues, "performance", "high", `Google PageSpeed Insights scores this site's mobile performance at ${merged.performanceScore}/100.`);
  }
  if (merged.accessibilityScore !== null && merged.accessibilityScore < 70) {
    pushIssue(merged.issues, "accessibility", "medium", `Accessibility score of ${merged.accessibilityScore}/100 from Google Lighthouse — may exclude some visitors.`);
  }

  return merged;
}

export function overallScoreFromAudit(audit: AuditResult): number {
  const parts = [audit.performanceScore, audit.mobileScore, audit.seoScore, audit.accessibilityScore, audit.designScore, audit.conversionScore].filter(
    (n): n is number => n !== null && n !== undefined,
  );
  if (parts.length === 0) return 0;
  return Math.round(parts.reduce((a, b) => a + b, 0) / parts.length);
}

export function websiteStatusFromScore(overall: number): WebsiteStatus {
  if (overall >= 75) return "GOOD";
  if (overall >= 50) return "AVERAGE";
  return "POOR";
}

export const AUDIT_STALE_AFTER_DAYS = 30;

export function isAuditStale(performedAt: Date | string, maxAgeDays = AUDIT_STALE_AFTER_DAYS): boolean {
  const date = typeof performedAt === "string" ? new Date(performedAt) : performedAt;
  const ageDays = (Date.now() - date.getTime()) / (1000 * 60 * 60 * 24);
  return ageDays > maxAgeDays;
}
