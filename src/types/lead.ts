import type { LeadStatus, LeadQuality, WebsiteStatus, WebsiteAbsenceStatus, DataConfidence, ContactType } from "@prisma/client";

// Shape of a lead row as it comes back from GET /api/leads (JSON — Date
// fields arrive as ISO strings, unlike the Prisma-native service return type).
export interface OpportunityRow {
  id: string;
  businessId: string;
  status: LeadStatus;
  estimatedValueMin: number | null;
  estimatedValueMax: number | null;
  estimatedRecurringMin: number | null;
  estimatedRecurringMax: number | null;
  nextActionAt: string | null;
  nextActionNote: string | null;
  lastContactedAt: string | null;
  updatedAt: string;
  tags: { tag: { id: string; name: string; color: string } }[];
  calls: { calledAt: string; outcome: string }[];
  business: {
    id: string;
    name: string;
    categoryPrimary: string;
    rating: number | null;
    reviewCount: number | null;
    lastCheckedAt: string | null;
    websiteCheckedAt: string | null;
    websiteCheckSource: string | null;
    locations: { city: string | null; suburb: string | null }[];
    contacts: { type: ContactType; value: string; confidence: DataConfidence }[];
    website: {
      url: string;
      status: WebsiteStatus | null;
      audits: { issuesJson: unknown; performedAt: string }[];
    } | null;
    websiteAbsenceStatus: WebsiteAbsenceStatus;
    leadScores: { score: number; quality: LeadQuality; confidence: string; reasonsJson: unknown; breakdownJson: unknown }[];
    demos: { id: string; title: string }[];
  };
}

export interface OpportunitiesResponse {
  leads: OpportunityRow[];
  total: number;
  page: number;
  pageSize: number;
}
