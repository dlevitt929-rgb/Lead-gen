import { PageHeader } from "@/components/shared/page-header";
import { CallListClient } from "@/components/call-workspace/call-list-client";

export default function CallListPage() {
  return (
    <div className="flex h-full flex-col">
      <PageHeader title="Call List" description="Build a prioritized queue and work through it, one lead at a time." />
      <div className="min-h-0 flex-1">
        <CallListClient />
      </div>
    </div>
  );
}
