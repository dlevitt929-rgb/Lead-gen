import { z } from "zod";
import { generateJSON, isAIConfigured } from "@/lib/ai";
import { recommendFeatures } from "@/lib/services/website-recommendations";
import type { AuditIssue } from "@/lib/services/website-auditor";

const salesAngleSchema = z.object({
  whyTheyNeedAWebsite: z.string(),
  biggestProblems: z.array(z.string()).max(6),
  strengthsToCompliment: z.array(z.string()).max(4),
  coldCallOpener: z.string(),
  questionsToAsk: z.array(z.string()).max(6),
  featuresToPitch: z.array(z.string()).max(6),
  suggestedPackage: z.string(),
  objections: z.array(z.object({ objection: z.string(), response: z.string() })).max(5),
});

export type SalesAngle = z.infer<typeof salesAngleSchema>;

export interface SalesAngleInput {
  businessName: string;
  categoryPrimary: string;
  city?: string | null;
  suburb?: string | null;
  rating?: number | null;
  reviewCount?: number | null;
  hasWebsite: boolean;
  websiteIssues: AuditIssue[];
  opportunityScore: number;
  opportunityReasons: string[];
  repName?: string | null;
}

function fallbackSalesAngle(input: SalesAngleInput): SalesAngle {
  const features = recommendFeatures(input.categoryPrimary).map((f) => f.feature);
  const location = [input.suburb, input.city].filter(Boolean).join(", ");
  const reputationLine =
    input.rating && input.reviewCount
      ? `a ${input.rating.toFixed(1)}★ rating from ${input.reviewCount} reviews`
      : "a solid local reputation";

  return {
    whyTheyNeedAWebsite: input.hasWebsite
      ? `${input.businessName} already has real demand but its current website has gaps that are likely costing them bookings — ${input.opportunityReasons[0] ?? "particularly on mobile"}.`
      : `${input.businessName} has ${reputationLine} but no website at all, so anyone searching online before calling can't find them.`,
    biggestProblems: input.opportunityReasons.slice(0, 3),
    strengthsToCompliment: [reputationLine, `Based in ${location || "the area"}`].filter(Boolean),
    coldCallOpener: `Hi, is this the owner or manager? My name's ${input.repName || "[Your name]"}. I came across ${input.businessName} while looking at highly-rated ${input.categoryPrimary} businesses in ${location || "the area"}. You've got ${reputationLine}, but I noticed a few things about your online presence that could be costing you customers. I build websites for local businesses — would you be open to me showing you what I mean?`,
    questionsToAsk: [
      "How are most new customers finding you at the moment?",
      "Do you ever lose bookings to people who just can't reach you after hours?",
      "Has anyone mentioned trouble using your site on their phone?",
    ],
    featuresToPitch: features,
    suggestedPackage: input.opportunityScore >= 80 ? "Growth Website" : input.opportunityScore >= 50 ? "Starter Website" : "Starter Website",
    objections: [
      { objection: "We're too busy to deal with a new website right now.", response: "That's exactly why it's worth doing — a better site takes work off your plate by handling bookings and questions automatically." },
      { objection: "We already have a website.", response: "Totally fair — I'm not suggesting you need one from scratch, just showing you a couple of quick wins I noticed that could bring in more bookings." },
      { objection: "How much does it cost?", response: "It depends on what you need, but I can put together a free concept first so you can see exactly what you'd be getting before we talk numbers." },
    ],
  };
}

export async function generateSalesAngle(input: SalesAngleInput): Promise<{ data: SalesAngle; source: "ai" | "fallback" }> {
  if (!isAIConfigured()) {
    return { data: fallbackSalesAngle(input), source: "fallback" };
  }

  const location = [input.suburb, input.city].filter(Boolean).join(", ");
  const issuesText = input.websiteIssues.length
    ? input.websiteIssues.map((i) => `- [${i.severity}] ${i.message}`).join("\n")
    : "No website exists for this business.";

  const system = `You are a sales research assistant for a solo website-development salesperson. You only use the facts given to you — never invent statistics, testimonials, or details about the business. Keep language conversational, honest and non-spammy, suitable for a real human cold call. Output must match the requested JSON schema exactly.`;

  const prompt = `Business: ${input.businessName}
Category: ${input.categoryPrimary}
Location: ${location || "unknown"}
Google rating: ${input.rating ?? "unknown"} (${input.reviewCount ?? "unknown"} reviews)
Has website: ${input.hasWebsite ? "yes" : "no"}
Website opportunity score: ${input.opportunityScore}/100
Detected website issues:
${issuesText}

Produce a JSON object with exactly these keys:
whyTheyNeedAWebsite (string), biggestProblems (string[], max 5), strengthsToCompliment (string[], max 3),
coldCallOpener (string, 3-5 sentences, conversational, first person as a website developer named ${input.repName || "the rep"}),
questionsToAsk (string[], max 5), featuresToPitch (string[], max 5, specific to this business's category),
suggestedPackage (string, one short package name), objections (array of {objection, response}, max 4).`;

  try {
    const data = await generateJSON<SalesAngle>({ system, prompt, maxTokens: 1400 });
    const parsed = salesAngleSchema.safeParse(data);
    if (!parsed.success) return { data: fallbackSalesAngle(input), source: "fallback" };
    return { data: parsed.data, source: "ai" };
  } catch {
    return { data: fallbackSalesAngle(input), source: "fallback" };
  }
}
