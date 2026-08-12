import type { LeadStatus, LeadQuality, WebsiteStatus, DataConfidence, ContactType } from "@prisma/client";

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
    locations: { city: string | null; suburb: string | null }[];
    contacts: { type: ContactType; value: string; confidence: DataConfidence }[];
    website: { url: string; status: WebsiteStatus | null } | null;
    leadScores: { score: number; quality: LeadQuality; reasonsJson: unknown }[];
  };
}

export interface OpportunitiesResponse {
  leads: OpportunityRow[];
  total: number;
  page: number;
  pageSize: number;
}
