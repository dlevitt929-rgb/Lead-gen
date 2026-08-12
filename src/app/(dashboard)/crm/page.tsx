import { PageHeader } from "@/components/shared/page-header";
import { CrmClient } from "@/components/crm/crm-client";

export default function CrmPage() {
  return (
    <div className="flex h-full flex-col">
      <PageHeader title="CRM / Pipeline" description="Track every lead through your sales process." />
      <CrmClient />
    </div>
  );
}
