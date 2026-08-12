"use client";

import * as React from "react";
import { QueueSetup } from "@/components/call-workspace/queue-setup";
import { CallWorkspace } from "@/components/call-workspace/call-workspace";
import type { OpportunitiesResponse, OpportunityRow } from "@/types/lead";

export function CallListClient() {
  const [leads, setLeads] = React.useState<OpportunityRow[] | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [queue, setQueue] = React.useState<OpportunityRow[] | null>(null);

  React.useEffect(() => {
    fetch("/api/leads?pageSize=500&sortBy=score&sortDir=desc")
      .then((r) => r.json())
      .then((data: OpportunitiesResponse) => setLeads(data.leads))
      .finally(() => setLoading(false));
  }, []);

  if (queue) {
    return <CallWorkspace queue={queue} onExit={() => setQueue(null)} onQueueChange={setQueue} />;
  }

  return <QueueSetup leads={leads} loading={loading} onStart={setQueue} />;
}
