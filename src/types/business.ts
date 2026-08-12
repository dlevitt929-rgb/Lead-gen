import type { getBusinessDetail } from "@/lib/services/business-service";

export type BusinessDetail = NonNullable<Awaited<ReturnType<typeof getBusinessDetail>>>;
export type BusinessLead = BusinessDetail["leads"][number];
export type BusinessWebsite = NonNullable<BusinessDetail["website"]>;
export type BusinessAudit = BusinessWebsite["audits"][number];
