import type { DataSource, LeadQuality, WebsiteStatus, WebsiteAbsenceStatus, ContactType, DataConfidence } from "@prisma/client";

export interface MapBusiness {
  id: string;
  name: string;
  categoryPrimary: string;
  rating: number | null;
  reviewCount: number | null;
  googleMapsUrl: string | null;
  dataSource: DataSource;
  locations: { latitude: number | null; longitude: number | null; suburb: string | null; city: string | null; addressFormatted: string | null }[];
  website: { url: string; status: WebsiteStatus | null } | null;
  websiteAbsenceStatus: WebsiteAbsenceStatus;
  leadScores: { score: number; quality: LeadQuality; reasonsJson: unknown }[];
  leads: { id: string }[];
  contacts?: { type: ContactType; value: string; confidence: DataConfidence }[];
}
