import { PageHeader } from "@/components/shared/page-header";
import { OpportunitiesClient } from "@/components/opportunities/opportunities-client";

export default function OpportunitiesPage() {
  return (
    <div className="flex h-full flex-col">
      <PageHeader title="Opportunities" description="Every saved lead, scored and ready to prioritize." />
      <OpportunitiesClient />
    </div>
  );
}
