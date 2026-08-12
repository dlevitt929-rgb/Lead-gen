import { PageHeader } from "@/components/shared/page-header";
import { LeadMapClient } from "@/components/map/lead-map-client";

export default function LeadMapPage() {
  return (
    <div className="flex h-full flex-col">
      <PageHeader title="Lead Map" description="Explore businesses geographically and search any area directly." />
      <div className="min-h-0 flex-1">
        <LeadMapClient />
      </div>
    </div>
  );
}
