import { PageHeader } from "@/components/shared/page-header";
import { LeadFinderClient } from "@/components/lead-finder/lead-finder-client";
import { getConfiguredProviders } from "@/lib/providers";

export default function LeadFinderPage() {
  const configuredProviders = getConfiguredProviders().map((p) => p.id);

  return (
    <div className="flex h-full flex-col">
      <PageHeader
        title="Lead Finder"
        description="Search real local businesses and score them as website-development opportunities."
      />
      <LeadFinderClient configuredProviders={configuredProviders} />
    </div>
  );
}
