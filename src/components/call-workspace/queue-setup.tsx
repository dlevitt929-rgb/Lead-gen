"use client";

import * as React from "react";
import Link from "next/link";
import { Phone, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { EmptyState } from "@/components/shared/empty-state";
import { Skeleton } from "@/components/ui/skeleton";
import type { OpportunityRow } from "@/types/lead";

export type QueueStrategy = "score" | "reviews" | "no_website" | "poor_website" | "recent";

const STRATEGIES: { value: QueueStrategy; label: string; description: string }[] = [
  { value: "score", label: "Highest opportunity first", description: "Call your best-scoring leads first." },
  { value: "no_website", label: "No website first", description: "Prioritize businesses with no website at all." },
  { value: "poor_website", label: "Poor website first", description: "Prioritize the worst existing websites." },
  { value: "reviews", label: "Most reviews first", description: "Prioritize businesses with the strongest social proof." },
  { value: "recent", label: "Custom (recently saved first)", description: "Use the order leads were added to your pipeline." },
];

export function sortByStrategy(leads: OpportunityRow[], strategy: QueueStrategy): OpportunityRow[] {
  const sorted = [...leads];
  switch (strategy) {
    case "no_website":
      return sorted.sort((a, b) => {
        const aNone = a.business.website ? 0 : 1;
        const bNone = b.business.website ? 0 : 1;
        if (aNone !== bNone) return bNone - aNone;
        return (b.business.leadScores[0]?.score ?? 0) - (a.business.leadScores[0]?.score ?? 0);
      });
    case "poor_website":
      return sorted.sort((a, b) => {
        const rank = (w: OpportunityRow["business"]["website"]) => (w?.status === "POOR" ? 0 : w?.status === "AVERAGE" ? 1 : w ? 2 : 3);
        return rank(a.business.website) - rank(b.business.website);
      });
    case "reviews":
      return sorted.sort((a, b) => (b.business.reviewCount ?? 0) - (a.business.reviewCount ?? 0));
    case "recent":
      return sorted;
    case "score":
    default:
      return sorted.sort((a, b) => (b.business.leadScores[0]?.score ?? 0) - (a.business.leadScores[0]?.score ?? 0));
  }
}

export function QueueSetup({
  leads,
  loading,
  onStart,
}: {
  leads: OpportunityRow[] | null;
  loading: boolean;
  onStart: (queue: OpportunityRow[]) => void;
}) {
  const [strategy, setStrategy] = React.useState<QueueStrategy>("score");

  if (loading || leads === null) {
    return (
      <div className="space-y-3 p-6">
        <Skeleton className="h-40 w-full max-w-lg" />
      </div>
    );
  }

  const callable = leads.filter((l) => !["WON", "LOST", "DO_NOT_CONTACT"].includes(l.status));

  if (callable.length === 0) {
    return (
      <div className="p-6">
        <EmptyState
          icon={Phone}
          title="No leads ready to call"
          description="Save leads from Lead Finder, or check back once your current pipeline has active leads."
          action={
            <Button asChild>
              <Link href="/lead-finder">Find leads</Link>
            </Button>
          }
        />
      </div>
    );
  }

  return (
    <div className="p-6">
      <Card className="max-w-lg">
        <CardHeader>
          <CardTitle>Build your call queue</CardTitle>
          <CardDescription>{callable.length} leads ready to call, prioritized however you like.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4 pb-5">
          <div className="space-y-1.5">
            <Select value={strategy} onValueChange={(v) => setStrategy(v as QueueStrategy)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {STRATEGIES.map((s) => (
                  <SelectItem key={s.value} value={s.value}>
                    {s.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">{STRATEGIES.find((s) => s.value === strategy)?.description}</p>
          </div>
          <Button size="lg" className="w-full" onClick={() => onStart(sortByStrategy(callable, strategy))}>
            {loading && <Loader2 className="animate-spin" />}
            Start calling ({callable.length})
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
