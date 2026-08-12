import type { Business, BusinessLocation, Contact, Website, LeadQuality } from "@prisma/client";

export interface SearchResultRow {
  business: Business;
  location: BusinessLocation | null;
  contacts: Contact[];
  website: Website | null;
  score: number;
  quality: LeadQuality;
  isSaved: boolean;
  isNew: boolean;
}

export interface SearchResponse {
  searchId: string;
  businesses: SearchResultRow[];
  warnings: { provider: string; message: string }[];
  providersUsed: string[];
}
